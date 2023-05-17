import { NodeFileSystem } from "langium/node";
import { PetriNet, Place, Transition } from "../generated/ast";
import { extractAstNode } from "../parse-util";
import { createPetriNetServices } from "../petri-net-module";
import { PetriNetState, PlaceState, TokenState, TransitionState } from "../runtimeState";
import { BreakpointType, CheckBreakpointArguments, CheckBreakpointResponse, GetBreakpointTypesResponse, GetRuntimeStateArguments, GetRuntimeStateResponse, InitArguments, InitResponse, LRPServices, Location, ModelElement, ParseArguments, ParseResponse, StepArguments, StepResponse } from "./lrp";


class PetriNetModelElement implements ModelElement {
    id: string;
    type: string;
    children: { [key: string]: ModelElement | ModelElement[]; };
    refs: { [key: string]: string | string[]; };
    attributes: { [key: string]: any; };
    location?: Location | undefined;

    constructor(petrinet: PetriNet) {
        this.id = petrinet.name;
        this.type = petrinet.$type;
        let modelPlaces: ModelElement[] = [];
        let modelTransitions: ModelElement[] = [];
        for (let place of petrinet.places) {
            modelPlaces.push(new PlaceModelElement(place));
        }
        for (let transition of petrinet.transitions) {
            modelTransitions.push(new TransitionModelElement(transition));
        }
        this.children = { "places": modelPlaces, "transitions": modelTransitions };
        this.refs = {};
        this.attributes = { name: petrinet.name };
    }
}

class PlaceModelElement implements ModelElement {
    id: string;
    type: string;
    children: { [key: string]: ModelElement | ModelElement[]; };
    refs: { [key: string]: string | string[]; };
    attributes: { [key: string]: any; };
    location?: Location | undefined;

    constructor(place: Place) {
        this.id = place.name;
        this.type = place.$type;
        this.children = {};
        this.refs = {};
        this.attributes = { placeCapacity: place.maxCapacity, placeInitTokenNumber: place.initialTokenNumber };
    }
}

class TransitionModelElement implements ModelElement {
    id: string;
    type: string;
    children: { [key: string]: ModelElement | ModelElement[]; };
    refs: { [key: string]: string | string[]; };
    attributes: { [key: string]: any; };
    location?: Location | undefined;

    constructor(transition: Transition) {
        this.id = transition.name;
        this.type = transition.$type;
        this.children = {};
        this.attributes = {};
        this.refs = { sources: transition.sources.toString(), destinations: transition.destinations.toString() };
    }
}

class PetriNetStateModelElement implements ModelElement {
    id: string;
    type: string;
    children: { [key: string]: ModelElement | ModelElement[]; };
    refs: { [key: string]: string | string[]; };
    attributes: { [key: string]: any; };
    location?: Location | undefined;

    constructor(petrinetState: PetriNetState) {
        this.id = "PetriNetStateOf" + petrinetState.getPetriNet().name;
        this.type = "PetriNetState";
        let everyPlaces: Array<PlaceStateModelElement> = [];
        let everyTransitions: Array<TransitionStateModelElement> = [];
        for (let placeState of petrinetState.getPlaces()) {
            everyPlaces.push(new PlaceStateModelElement(placeState));
        }
        for (let transitionState of petrinetState.getTransitions()) {
            everyTransitions.push(new TransitionStateModelElement(transitionState));
        }
        this.children = { placesState: everyPlaces, transitionsState: everyTransitions };
        this.attributes = {};
        this.refs = { petrinet: petrinetState.getPetriNet().name };
    }
}

class PlaceStateModelElement implements ModelElement {
    id: string;
    type: string;
    children: { [key: string]: ModelElement | ModelElement[]; };
    refs: { [key: string]: string | string[]; };
    attributes: { [key: string]: any; };
    location?: Location | undefined;

    constructor(placeState: PlaceState) {
        this.id = placeState.getPlace().name;
        this.type = "PlaceState";
        let tokens: Array<TokenStateModelElement> = [];
        for (let token of placeState.getEveryTokens()) {
            tokens.push(new TokenStateModelElement(token));
        }
        this.children = { everyTokens: tokens };
        this.refs = { place: placeState.getPlace().name };
        this.attributes = {};
    }
}

let iToken = 1;
class TokenStateModelElement implements ModelElement {
    id: string;
    type: string;
    children: { [key: string]: ModelElement | ModelElement[]; };
    refs: { [key: string]: string | string[]; };
    attributes: { [key: string]: any; };
    location?: Location | undefined;

    constructor(token: TokenState) {
        this.id = "Token" + iToken.toString();
        this.type = "TokenState";
        this.children = {};
        this.refs = {};
        this.attributes = { source: token.getSource() };
        iToken = iToken + 1;
    }
}

let iTransition = 1;
class TransitionStateModelElement implements ModelElement {
    id: string;
    type: string;
    children: { [key: string]: ModelElement | ModelElement[]; };
    refs: { [key: string]: string | string[]; };
    attributes: { [key: string]: any; };
    location?: Location | undefined;

    constructor(transitionState: TransitionState) {
        this.id = "Transition" + iTransition.toString();
        this.type = "TransitionState";
        this.children = {};
        this.attributes = { doable: transitionState.isDoable() };
        this.refs = { transition: transitionState.getTransition().name };
        iTransition = iTransition + 1;
    }
}

export class PetriNetsLRPServices implements LRPServices {
    petrinets = new Map<string, PetriNet>();
    petrinetsState = new Map<string, PetriNetState>();
    breakpoints: Array<BreakpointType> = [
        { id: "Place.empty", name: "NumberOfTokenEqualTo0", description: "Breaks when the number of tokens in a place is 0", parameters: [{ name: "Place", isMultivalued: false, objectType: "Place" }] },
        { id: "Place.full", name: "NumberOfTokenEqualToMaxCapacity", description: "Breaks when the number of tokens in a place is equal to its max capacity", parameters: [{ name: "Place", isMultivalued: false, objectType: "Place" }] },
        { id: "Place.notEnough", name: "NumberOfTokenInfToTransitionWeight", description: "Breaks when the number of tokens in a place is inferior to the transition's weight", parameters: [{ name: "Place", isMultivalued: false, objectType: "Place" }] },
        { id: "Place.tooMany", name: "NumberOfTokenSupToMaxCapacity", description: "Breaks when the number of tokens in a place is superior to its max capacity", parameters: [{ name: "Place", isMultivalued: false, objectType: "Place" }] },
        { id: "Transition.trigger", name: "TransitionTrigger", description: "Breaks when a transition is about to be triggered", parameters: [{ name: "Transition", isMultivalued: false, objectType: "Transition" }] }
    ];


    async parse(args: ParseArguments): Promise<ParseResponse> {
        this.petrinets.delete(args.sourceFile);
        this.petrinetsState.delete(args.sourceFile);

        const services = createPetriNetServices(NodeFileSystem).PetriNet;
        let petrinet = await extractAstNode<PetriNet>(args.sourceFile, services);

        this.petrinets.set(args.sourceFile, petrinet);

        return { astRoot: new PetriNetModelElement(petrinet) };
    }

    initExecution(args: InitArguments): InitResponse {
        this.petrinetsState.delete(args.sourceFile);

        if (!this.petrinets.has(args.sourceFile))
            throw new Error("The petri net of this file has not been parsed yet.");

        let petrinet = this.petrinets.get(args.sourceFile);

        if (!petrinet)
            throw new Error("The petri net of this file is undefined.");

        this.petrinetsState.set(args.sourceFile, new PetriNetState(petrinet));
        return { isExecutionDone: true };
    }

    getRuntimeState(args: GetRuntimeStateArguments): GetRuntimeStateResponse {
        if (!this.petrinetsState.has(args.sourceFile))
            throw new Error("The runtime state of this file has not been initialized yet.");

        let petrinetState = this.petrinetsState.get(args.sourceFile)
        if (!petrinetState)
            throw new Error("The runtime state of this file is undefined.");

        console.log("Current State : ");
        for (let place of petrinetState.getPlaces()) {
            console.log();
            console.log("    Tokens in place " + place.getPlace().name + " : " + place.getCurrentTokenNumber());
            console.log();
        }
        return { runtimeStateRoot: new PetriNetStateModelElement(petrinetState) };
    }

    nextStep(args: StepArguments): StepResponse {
        if (!this.petrinetsState.has(args.sourceFile))
            throw new Error("The runtime state of this file has not been initialized yet.");

        let petrinetState = this.petrinetsState.get(args.sourceFile);
        if (!petrinetState)
            throw new Error("The runtime state of this file is undefined.");

        petrinetState.trigger();
        return { isExecutionDone: petrinetState.canEvolve() };
    }

    getBreakpointTypes(): GetBreakpointTypesResponse {
        return { breakpointTypes: this.breakpoints };
    }


    checkBreakpoint(args: CheckBreakpointArguments): CheckBreakpointResponse {
        if (!this.petrinetsState.has(args.sourceFile))
            throw new Error("The runtime state of this file has not been initialized yet.");
        if (!this.petrinetsState.get(args.sourceFile))
            throw new Error("The runtime state of this file is undefined.");

        switch (args.typeId) {
            case "Place.empty": {
                return { isActivated: true, message: "The place will be empty." };
            }
            case "Place.full": {
                return { isActivated: true, message: "The place will be full." };
            }
            case "Place.notEnough": {
                return { isActivated: true, message: "The place will not contain enough tokens for the next transition's trigger." };
            }
            case "Place.tooMany": {
                return { isActivated: true, message: "The place will contain too many tokens for the next transition's trigger." };
            }
            case "Transition.trigger": {
                return { isActivated: true, message: "The transition is about to be triggered." };
            }
            default: {
                throw new Error("This breakpoint id does not exist : " + args.typeId);
            }
        }
    }
}