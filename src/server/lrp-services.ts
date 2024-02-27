import { NodeFileSystem } from 'langium/node';
import { PetriNet } from '../generated/ast';
import { extractAstNode } from '../parse-util';
import { createPetriNetServices } from '../petri-net-module';
import { PetriNetState } from '../runtimeState';
import { IDRegistry } from './idRegistry';
import { BreakpointType, CheckBreakpointArguments, CheckBreakpointResponse, EnterCompositeStepArguments, EnterCompositeStepResponse, ExecuteAtomicStepArguments, ExecuteAtomicStepResponse, GetAvailableStepsArguments, GetAvailableStepsResponse, GetBreakpointTypesResponse, GetRuntimeStateArguments, GetRuntimeStateResponse, GetStepLocationArguments, GetStepLocationResponse, InitializeExecutionArguments, InitializeExecutionResponse, ParseArguments, ParseResponse } from './lrp';
import { ModelElementBuilder } from './modelElementBuilder';
import { Step } from './steps';

// Breakpoint types exposed by the language runtime
const breakpointTypes: Array<BreakpointType> = [
    {
        id: 'placeEmpty',
        name: 'Place Empty',
        description: 'Breaks when a place is about to become empty.',
        parameters: [
            {
                type: 'object',
                name: 'p',
                isMultivalued: false,
                objectType: 'Place'
            }
        ]
    },
    {
        id: 'placeFull',
        name: 'Place Full',
        description: 'Breaks when a place is about to reach maximum capacity.',
        parameters: [
            {
                type: 'object',
                name: 'p',
                isMultivalued: false,
                objectType: 'Place'
            }
        ]
    },
    {
        id: 'transitionTrigger',
        name: 'Transition Trigger',
        description: 'Breaks when a transition is about to be triggered',
        parameters: [
            {
                type: 'object',
                name: 't',
                isMultivalued: false,
                objectType: 'Transition'
            }
        ]
    }
];


/**
 * Implements LRP services.
 */
export class PetriNetsLRPServices {
    static petrinets: Map<string, PetriNet> = new Map();
    static petrinetStates: Map<string, PetriNetState> = new Map();
    static registries: Map<string, IDRegistry> = new Map();

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
    static initializeExecution(args: InitializeExecutionArguments): InitializeExecutionResponse {
        const petrinet: PetriNet | undefined = this.petrinets.get(args.sourceFile);

        if (petrinet === undefined)
            throw new Error('The petri net of this file is undefined.');

        this.petrinetStates.set(args.sourceFile, new PetriNetState(petrinet));

        return {};
    }

    /**
     * Returns the current runtime state for a given source file.
     * 
     * @param args
     * @returns
     */
    static getRuntimeState(args: GetRuntimeStateArguments): GetRuntimeStateResponse {
        const petrinetState: PetriNetState | undefined = this.petrinetStates.get(args.sourceFile);
        if (petrinetState === undefined)
            throw new Error('The runtime state of this file is undefined.');

        const registry: IDRegistry | undefined = this.registries.get(args.sourceFile);
        if (registry === undefined)
            throw new Error('No registry.');

        const builder: ModelElementBuilder = new ModelElementBuilder(registry);

        return {
            runtimeStateRoot: builder.fromPetriNetState(petrinetState)
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
        if (runtimeState === undefined)
            throw new Error('The runtime state of this file has not been initialized yet.');

        const registry: IDRegistry | undefined = this.registries.get(args.sourceFile);
        if (registry === undefined)
            throw new Error('No registry.');

        return runtimeState.checkBreakpoint(args.typeId, args.stepId, args.bindings, registry);
    }

    static enterCompositeStep(args: EnterCompositeStepArguments): EnterCompositeStepResponse {
        const petrinetState = this.petrinetStates.get(args.sourceFile);
        if (petrinetState === undefined)
            throw new Error('The runtime state of this file is undefined.');

        petrinetState.enterCompositeStep(args.stepId);

        return {};
    }

    /**
     * Performs a next step action in the runtime associated to a given source file.
     * 
     * @param args 
     * @returns 
     */
    static executeAtomicStep(args: ExecuteAtomicStepArguments): ExecuteAtomicStepResponse {
        const petrinetState = this.petrinetStates.get(args.sourceFile);
        if (petrinetState === undefined)
            throw new Error('The runtime state of this file is undefined.');

        const executedStep: Step = petrinetState.executeAtomicStep(args.stepId);

        return {
            completedSteps: executedStep.getCompletedSteps().map(s => s.id)
        };
    }

    static getAvailableSteps(args: GetAvailableStepsArguments): GetAvailableStepsResponse {
        const petrinetState = this.petrinetStates.get(args.sourceFile);
        if (petrinetState === undefined)
            throw new Error('The runtime state of this file is undefined.');

        const availableSteps: Step[] = [...petrinetState.computeAvailableStep().values()];
        const parentStep: Step | undefined = availableSteps.length > 0 ? availableSteps[0].parentStep : undefined;

        return {
            availableSteps: availableSteps.map(s => s.toLRPStep()),
            parentStepId: parentStep !== undefined ? parentStep.id : undefined
        };
    }

    static getStepLocation(args: GetStepLocationArguments): GetStepLocationResponse {
        const petrinetState = this.petrinetStates.get(args.sourceFile);
        if (petrinetState === undefined)
            throw new Error('The runtime state of this file is undefined.');

        if (petrinetState.availableSteps === undefined)
            throw new Error('No step to compute from.');

        const step: Step | undefined = petrinetState.availableSteps.get(args.stepId);
        if (step === undefined)
            throw new Error(`No step with id ${args.stepId}.`);

        return {
            location: step.location
        }
    }
}