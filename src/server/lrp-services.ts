import { NodeFileSystem } from "langium/node";
import { PetriNet, Place, Transition } from "../generated/ast";
import { extractAstNode } from "../parse-util";
import { createPetriNetServices } from "../petri-net-module";
import { PetriNetState } from "../runtimeState";
import { BreakpointType, CheckBreakpointArguments, CheckBreakpointResponse, GetBreakpointTypesResponse, GetRuntimeStateArguments, InitArguments, InitResponse, LRPServices, Location, ModelElement, ParseArguments, ParseResponse, StepArguments, StepResponse } from "./lrp";


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

    getRuntimeState(args: GetRuntimeStateArguments): GetRuntimeStateArguments {
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
        return { sourceFile: args.sourceFile };
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