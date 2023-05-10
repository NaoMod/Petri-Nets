import { NodeFileSystem } from "langium/node";
import { PetriNet, Place, Transition } from "src/generated/ast";
import { extractAstNode } from "src/parse-util";
import { createPetriNetServices } from "src/petri-net-module";
import { CheckBreakpointArguments, CheckBreakpointResponse, GetBreakpointTypesResponse, GetRuntimeStateArguments, InitArguments, InitResponse, ParseArguments, ParseResponse, LRPServices, StepArguments, StepResponse, ModelElement, Location } from "./lrp";
import { PetriNetState } from "src/runtimeState";


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

//TODO: Implement LRP services, except for getBreakpointTypes and checkBreakpoint
export class PetriNetsLRPServices implements LRPServices {
    petrinets = new Map<string, PetriNet>();
    petrinetsState = new Map<string, PetriNetState>();

    async parse(args: ParseArguments): Promise<ParseResponse> {
        this.petrinetsState.delete(args.sourceFile);

        const services = createPetriNetServices(NodeFileSystem).PetriNet;
        let petrinet = await extractAstNode<PetriNet>(args.sourceFile, services);
        this.petrinets.set(args.sourceFile, petrinet);

        return { astRoot: new PetriNetModelElement(petrinet) };
    }

    initExecution(args: InitArguments): InitResponse {
        if (!this.petrinets.has(args.sourceFile))
            throw new Error("The petri net of this file has not been parsed yet.");

        let petrinet = this.petrinets.get(args.sourceFile);
        if (petrinet == undefined)
            throw new Error("The petri net of this file is undefined.");

        this.petrinetsState.set(args.sourceFile, new PetriNetState(petrinet, 50));
        return { isExecutionDone: true };
    }

    getRuntimeState(args: GetRuntimeStateArguments): GetRuntimeStateArguments {
        if (!this.petrinetsState.has(args.sourceFile))
            throw new Error("The runtime state of this file has not been initialized yet.");

        let petrinetState = this.petrinetsState.get(args.sourceFile)
        if (petrinetState == undefined)
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
        if (petrinetState == undefined)
            throw new Error("The runtime state of this file is undefined.");

        petrinetState.trigger();
        return { isExecutionDone: petrinetState.canEvolve() };
    }

    getBreakpointTypes(): GetBreakpointTypesResponse {
        throw new Error("Method not implemented.");
    }
    checkBreakpoint(args: CheckBreakpointArguments): CheckBreakpointResponse {
        throw new Error("Method not implemented.");
    }
}