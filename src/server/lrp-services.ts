import { NodeFileSystem } from 'langium/node';
import { PetriNet, Place, Transition } from '../generated/ast';
import { extractAstNode } from '../parse-util';
import { createPetriNetServices } from '../petri-net-module';
import { findPlaceStateFromPlace, PetriNetState, PlaceState, TransitionState } from '../runtimeState';
import { IDRegistry } from './idRegistry';
import { BreakpointType, CheckBreakpointArguments, CheckBreakpointResponse, GetAvailableStepsArguments, GetAvailableStepsResponse, GetBreakpointTypesResponse, GetRuntimeStateArguments, GetRuntimeStateResponse, GetSteppingModesResponse, InitArguments, InitializeResponse, InitResponse, ParseArguments, ParseResponse, StepArguments, SteppingMode, StepResponse } from './lrp';
import { ModelElementBuilder } from './modelElementBuilder';

// Breakpoint types exposed by the language runtime
const breakpointTypes: Array<BreakpointType> = [
    {
        id: 'Place.empty',
        name: 'PlaceEmpty',
        description: 'Breaks when a place is about to become empty.',
        parameters: [
            {
                name: 'Place',
                isMultivalued: false,
                objectType: 'Place'
            }
        ]
    },
    {
        id: 'Place.full',
        name: 'PlaceFull',
        description: 'Breaks when a place is about to reach maximum capacity.',
        parameters: [
            {
                name: 'Place',
                isMultivalued: false,
                objectType: 'Place'
            }
        ]
    },
    {
        id: 'Transition.trigger',
        name: 'TransitionTrigger',
        description: 'Breaks when a transition is about to be triggered',
        parameters: [
            {
                name: 'Transition',
                isMultivalued: false,
                objectType: 'Transition'
            }
        ]
    }
];

// Stepping modes exposed by the language runtime
const steppingModes: Array<SteppingMode> = [
    {
        id: "atomic",
        name: "Atomic",
        description: "Only performs atomic steps."
    }
];

/**
 * Implements LRP services.
 */
export class PetriNetsLRPServices {
    static petrinets: Map<string, PetriNet> = new Map();
    static petrinetStates: Map<string, PetriNetState> = new Map();
    static registries: Map<string, IDRegistry> = new Map();

    static availableSteps: Map<string, TransitionState[]> = new Map();

    static initialize(): InitializeResponse {
        return {
            capabilities: {
                supportsThreads: false,
                supportsStackTrace: false,
                supportsScopes: false
            }
        };
    }

    /**
     * Parses a file and stores the generated Petri Net.
     * 
     * @param args
     * @returns
     */
    static async parse(args: ParseArguments): Promise<ParseResponse> {
        this.petrinetStates.delete(args.sourceFile);

        const newRegistry: IDRegistry = new IDRegistry();
        this.registries.set(args.sourceFile, newRegistry);

        const services = createPetriNetServices(NodeFileSystem).PetriNet;
        const petrinet = await extractAstNode<PetriNet>(args.sourceFile, services);

        this.petrinets.set(args.sourceFile, petrinet);

        const builder: ModelElementBuilder = new ModelElementBuilder(newRegistry);

        return {
            astRoot: builder.fromPetriNet(petrinet)
        };
    }

    /**
     * Creates a new runtime for a given source file.
     * The AST for the given source file must have been previously constructed.
     * 
     * @param args
     * @returns
     */
    static initExecution(args: InitArguments): InitResponse {
        const petrinet: PetriNet | undefined = this.petrinets.get(args.sourceFile);

        if (!petrinet)
            throw new Error('The petri net of this file is undefined.');

        this.petrinetStates.set(args.sourceFile, new PetriNetState(petrinet));

        this.availableSteps.set(args.sourceFile, []);

        return {
            isExecutionDone: !this.petrinetStates.get(args.sourceFile)?.canEvolve()
        };
    }

    /**
     * Returns the current runtime state for a given source file.
     * 
     * @param args
     * @returns
     */
    static getRuntimeState(args: GetRuntimeStateArguments): GetRuntimeStateResponse {
        const petrinetState: PetriNetState | undefined = this.petrinetStates.get(args.sourceFile);
        if (!petrinetState)
            throw new Error('The runtime state of this file is undefined.');

        const registry: IDRegistry | undefined = this.registries.get(args.sourceFile);
        if (!registry)
            throw new Error('No registry.');

        const builder: ModelElementBuilder = new ModelElementBuilder(registry);

        return {
            runtimeStateRoot: builder.fromPetriNetState(petrinetState)
        };
    }

    /**
     * Performs a next step action in the runtime associated to a given source file.
     * 
     * @param args 
     * @returns 
     */
    static executeStep(args: StepArguments): StepResponse {
        const petrinetState = this.petrinetStates.get(args.sourceFile);
        if (!petrinetState)
            throw new Error('The runtime state of this file is undefined.');

        const registry: IDRegistry | undefined = this.registries.get(args.sourceFile);
        if (!registry)
            throw new Error('No registry.')

        var transitionToTrigger: TransitionState | undefined;
        
        if (args.stepId) {
            transitionToTrigger = this.availableSteps.get(args.sourceFile)![+args.stepId];
        } else {
            transitionToTrigger = petrinetState.transitionStates.find(transition => transition.isTriggerable);
        }

        if (!transitionToTrigger)
            throw new Error('No transition to trigger.')
        
        petrinetState.trigger(transitionToTrigger.transition);
        registry.clearRuntimeIds();

        return {
            isExecutionDone: !petrinetState.canEvolve()
        };
    }

    /**
     * Retrieves the breakpoint types exposed by the language runtime.
     * 
     * @returns 
     */
    static getBreakpointTypes(): GetBreakpointTypesResponse {
        return {
            breakpointTypes: breakpointTypes
        };
    }

    /**
     * Checks whether a breakpoint is activated.
     * 
     * @param args 
     * @returns
     */
    static checkBreakpoint(args: CheckBreakpointArguments): CheckBreakpointResponse {
        const runtimeState: PetriNetState | undefined = this.petrinetStates.get(args.sourceFile);
        if (!runtimeState)
            throw new Error('The runtime state of this file has not been initialized yet.');

        const nextTransition: Transition | undefined = runtimeState.transitionStates.find(transition => transition.isTriggerable)?.transition;
        if (!nextTransition)
            throw new Error('Execution already done.');

        const registry: IDRegistry | undefined = this.registries.get(args.sourceFile);
        if (!registry)
            throw new Error('No registry.');

        switch (args.typeId) {
            case 'Place.empty': {
                for (const sourceEdge of nextTransition.sources) {
                    const sourcePlace: Place | undefined = sourceEdge.place.ref;
                    if (!sourcePlace || args.elementId != registry.getASTId(sourcePlace)) continue;

                    const sourcePlaceState: PlaceState | undefined = findPlaceStateFromPlace(sourcePlace, runtimeState);
                    if (!sourcePlaceState) continue;

                    if (sourcePlaceState.tokens.length == sourceEdge.weight) {
                        return {
                            isActivated: true,
                            message: `Place ${sourcePlace.name} is about to be empty.`
                        }
                    }
                }
            }
                break;

            case 'Place.full': {
                for (const destinationEdge of nextTransition.destinations) {
                    const destinationPlace: Place | undefined = destinationEdge.place.ref;
                    if (!destinationPlace || args.elementId == registry.getASTId(destinationPlace)) continue;

                    const destinationPlaceState: PlaceState | undefined = findPlaceStateFromPlace(destinationPlace, runtimeState);
                    if (!destinationPlaceState) continue;

                    if (destinationPlaceState.tokens.length + destinationEdge.weight == destinationPlace.maxCapacity) {
                        return {
                            isActivated: true,
                            message: `Place ${destinationPlace.name} is about to be full.`
                        }
                    }
                }
            }
                break;

            case 'Transition.trigger': {
                if (args.elementId == registry.getASTId(nextTransition))
                    return {
                        isActivated: true,
                        message: `Transition ${nextTransition.name} is about to be triggered.`
                    };
            }
                break;

            default: {
                throw new Error('This breakpoint id does not exist : ' + args.typeId);
            }
        }

        return {
            isActivated: false
        };
    }

    /**
     * Retrieves the stepping modes exposed by the language runtime.
     * 
     * @returns 
     */
    static getSteppingModes(): GetSteppingModesResponse {
        return {
            steppingModes: steppingModes
        };
    }

    static getAvailableSteps(args: GetAvailableStepsArguments): GetAvailableStepsResponse {
        const petrinetState = this.petrinetStates.get(args.sourceFile);
        if (!petrinetState)
            throw new Error('The runtime state of this file is undefined.');

        const registry: IDRegistry | undefined = this.registries.get(args.sourceFile);
        if (!registry)
            throw new Error('No registry.')

        switch (args.steppingModeId) {
            case 'atomic':
                const triggerableTransitions: TransitionState[] = petrinetState.transitionStates.filter(transition => transition.isTriggerable);
                this.availableSteps.set(args.sourceFile, triggerableTransitions);

                return {
                    availableSteps: triggerableTransitions.map((transition, index) => {
                        return {
                            id: String(index),
                            name: transition.transition.name,
                            isComposite: false
                        }
                    })
                };

            default:
                throw new Error(`Unknown stepping mode id ${args.steppingModeId}.`);
        }
    }
}


