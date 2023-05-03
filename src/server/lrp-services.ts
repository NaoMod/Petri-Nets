import { NodeFileSystem } from "langium/node";
import { PetriNet, Edge } from "src/generated/ast";
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
        this.children = { "places": new PlaceModelElement(petrinet), "transitions": new TransitionModelElement(petrinet) };
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

    constructor(petrinet: PetriNet) {
        this.id = petrinet.name;
        this.type = "Place[]";
        this.children = {};
        this.refs = {};
        let placesNames: string[] = [];
        let placesCapacities: number[] = [];
        let placesInitialTokenNumber: number[] = [];
        for (let place of petrinet.places) {
            placesNames.push(place.name);
            placesCapacities.push(place.maxCapacity);
            placesInitialTokenNumber.push(place.initialTokenNumber);
        }
        this.attributes = { placesNames: [placesCapacities, placesInitialTokenNumber] };
    }
}


class TransitionModelElement implements ModelElement {
    id: string;
    type: string;
    children: { [key: string]: ModelElement | ModelElement[]; };
    refs: { [key: string]: string | string[]; };
    attributes: { [key: string]: any; };
    location?: Location | undefined;

    constructor(petrinet: PetriNet) {
        this.id = petrinet.name;
        this.type = "Transition[]";
        this.children = {};
        let transitionNames: string[] = [];
        let transitionSources: (Edge[])[] = [];
        let transitionDestinations: (Edge[])[] = [];
        for (let transition of petrinet.transitions) {
            transitionNames.push(transition.name);
            transitionSources.push(transition.sources)
            transitionDestinations.push(transition.destinations)
        }
        this.attributes = { names: transitionNames };
        this.refs = { transitionNames: [transitionSources.toString(), transitionDestinations.toString()] };
    }
}

//TODO: Implement LRP services, except for getBreakpointTypes and checkBreakpoint
export class PetriNetsLRPServices implements LRPServices {
    petrinets = new Map<string, PetriNet>();
    petrinetsState = new Map<string, PetriNetState>();

    async parse(args: ParseArguments): Promise<ParseResponse> {
        const services = createPetriNetServices(NodeFileSystem).PetriNet;
        let petrinet = await extractAstNode<PetriNet>(args.sourceFile, services);
        this.petrinets.set(args.sourceFile, petrinet);

        return { astRoot: new PetriNetModelElement(petrinet) };
    }
    initExecution(args: InitArguments): InitResponse {
        if (this.petrinets.has(args.sourceFile)) {
            let petrinet = this.petrinets.get(args.sourceFile);
            if (petrinet != undefined) {
                this.petrinetsState.set(args.sourceFile, new PetriNetState(petrinet, 50));
                return { isExecutionDone: true };
            } else {
                throw new Error("The petri net of this file is undefined.");
            }
        } else {
            throw new Error("The petri net of this file has not been parsed yet.");
        }
    }
    getRuntimeState(args: GetRuntimeStateArguments): GetRuntimeStateArguments {
        if (this.petrinetsState.has(args.sourceFile)) {
            let petrinetState = this.petrinetsState.get(args.sourceFile)
            if (petrinetState != undefined) {
                console.log("Current State : ");
                for (let place of petrinetState.getPlaces()) {
                    console.log();
                    console.log("    Tokens in place " + place.getPlace().name + " : " + place.getCurrentTokenNumber());
                    console.log();
                }
            } else {
                throw new Error("The runtime state of this file is undefined.")
            }
        } else {
            throw new Error("The runtime state of this file has not been initialized yet.")
        }
        return { sourceFile: args.sourceFile };
    }

    nextStep(args: StepArguments): StepResponse {
        if (this.petrinetsState.has(args.sourceFile)) {
            let petrinetState = this.petrinetsState.get(args.sourceFile);
            if (petrinetState != undefined) {
                petrinetState.trigger();
                return { isExecutionDone: petrinetState.canEvolve() };
            } else {
                throw new Error("The runtime state of this file is undefined.")
            }
        } else {
            throw new Error("The runtime state of this file has not been initialized yet.")
        }
    }

    getBreakpointTypes(): GetBreakpointTypesResponse {
        throw new Error("Method not implemented.");
    }
    checkBreakpoint(args: CheckBreakpointArguments): CheckBreakpointResponse {
        throw new Error("Method not implemented.");
    }
}