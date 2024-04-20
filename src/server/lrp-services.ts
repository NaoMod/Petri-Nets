import { NodeFileSystem } from 'langium/node';
import { PetriNet } from '../generated/ast';
import { extractAstNode } from '../parse-util';
import { createPetriNetServices } from '../petri-net-module';
import { UndefinedASTError, UndefinedRegistryError, UndefinedRuntimeStateError, UndefinedStepError } from './errors';
import { IDRegistry } from './idRegistry';
import { BreakpointType, CheckBreakpointArguments, CheckBreakpointResponse, EnterCompositeStepArguments, EnterCompositeStepResponse, ExecuteAtomicStepArguments, ExecuteAtomicStepResponse, GetAvailableStepsArguments, GetAvailableStepsResponse, GetBreakpointTypesResponse, GetRuntimeStateArguments, GetRuntimeStateResponse, GetStepLocationArguments, GetStepLocationResponse, InitializeExecutionArguments, InitializeExecutionResponse, ParseArguments, ParseResponse } from './lrp';
import { ModelElementBuilder } from './modelElementBuilder';
import { PetriNetState } from './runtimeState';
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
        id: 'transitionFired',
        name: 'Transition Fired',
        description: 'Breaks when a transition is about to be fired.',
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
    /** Map of source files to their associated Petri Net AST. */
    static petrinets: Map<string, PetriNet> = new Map();

    /** Map of source files to their associated Petri Net runtime state. */
    static petrinetStates: Map<string, PetriNetState> = new Map();

    /** Map of source files to their associated registry of IDs for model elements. */
    static registries: Map<string, IDRegistry> = new Map();

    /**
     * Parses a file and stores the generated Petri Net.
     * 
     * @param args Arguments of the request.
     * @returns The LRP response to the request.
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
     * Creates a new runtime state for the given source file and stores it.
     * The AST for the given source file must have been previously constructed through the {@link parse} service.
     * 
     * @param args Arguments of the request.
     * @returns The LRP response to the request.
     * @throws {UndefinedASTError} If no AST is defined for the source file.
     */
    static initializeExecution(args: InitializeExecutionArguments): InitializeExecutionResponse {
        const petrinet: PetriNet | undefined = this.petrinets.get(args.sourceFile);
        if (petrinet === undefined) throw new UndefinedASTError(args.sourceFile);

        this.petrinetStates.set(args.sourceFile, new PetriNetState(petrinet));

        return {};
    }

    /**
     * Returns the current runtime state for the given source file.
     * 
     * @param args Arguments of the request.
     * @returns The LRP response to the request.
     * @throws {UndefinedRuntimeStateError} If no runtime state is defined for the source file.
     * @throws {UndefinedRegistryError} If no registry is defiend for the source file.
     */
    static getRuntimeState(args: GetRuntimeStateArguments): GetRuntimeStateResponse {
        const runtimeState: PetriNetState | undefined = this.petrinetStates.get(args.sourceFile);
        if (runtimeState === undefined) throw new UndefinedRuntimeStateError(args.sourceFile);

        const registry: IDRegistry | undefined = this.registries.get(args.sourceFile);
        if (registry === undefined) throw new UndefinedRegistryError(args.sourceFile);

        const builder: ModelElementBuilder = new ModelElementBuilder(registry);

        return {
            runtimeStateRoot: builder.fromPetriNetState(runtimeState)
        };
    }

    /**
     * Returns the available breakpoint types.
     * 
     * @returns The LRP response to the request.
     */
    static getBreakpointTypes(): GetBreakpointTypesResponse {
        return {
            breakpointTypes: breakpointTypes
        };
    }

    /**
     * Checks whether a breakpoint of a certain type is verified with the given arguments,
     * in the runtime state associated to the given source file.
     * 
     * @param args Arguments of the request.
     * @returns The LRP response to the request.
     * @throws {UndefinedRuntimeStateError} If no runtime state is defined for the source file.
     * @throws {UndefinedRegistryError} If no registry is defiend for the source file.
     */
    static checkBreakpoint(args: CheckBreakpointArguments): CheckBreakpointResponse {
        const runtimeState: PetriNetState | undefined = this.petrinetStates.get(args.sourceFile);
        if (runtimeState === undefined) throw new UndefinedRuntimeStateError(args.sourceFile);

        const registry: IDRegistry | undefined = this.registries.get(args.sourceFile);
        if (registry === undefined) throw new UndefinedRegistryError(args.sourceFile);

        const message: string | undefined = runtimeState.checkBreakpoint(args.typeId, args.stepId, args.bindings, registry);
        if (message === undefined) {
            return { isActivated: false };
        }

        return {
            isActivated: true,
            message: message
        }
    }

    /**
     * Enters a composite step in the runtime state associated to the given source file.
     * The possible steps are exposed by the language runtime through the {@link getAvailableSteps} service.
     * 
     * @param args Arguments of the request.
     * @returns The LRP response to the request.
     * @throws {UndefinedRuntimeStateError} If no runtime state is defined for the source file.
     */
    static enterCompositeStep(args: EnterCompositeStepArguments): EnterCompositeStepResponse {
        const runtimeState = this.petrinetStates.get(args.sourceFile);
        if (runtimeState === undefined) throw new UndefinedRuntimeStateError(args.sourceFile);

        runtimeState.enterCompositeStep(args.stepId);

        return {};
    }

    /**
     * Performs a single atomic step in the runtime state associated to the given source file.
     * The possible steps are exposed by the language runtime through the {@link getAvailableSteps} service.
     * 
     * @param args Arguments of the request.
     * @returns The LRP response to the request.
     * @throws {UndefinedRuntimeStateError} If no runtime state is defined for the source file.
     */
    static executeAtomicStep(args: ExecuteAtomicStepArguments): ExecuteAtomicStepResponse {
        const runtimeState = this.petrinetStates.get(args.sourceFile);
        if (runtimeState === undefined) throw new UndefinedRuntimeStateError(args.sourceFile);

        const executedStep: Step = runtimeState.executeAtomicStep(args.stepId);

        return {
            completedSteps: executedStep.completedSteps.map(s => s.id)
        };
    }

    /**
     * Returns the currently available steps.
     * 
     * @param args Arguments of the request.
     * @returns The LRP response to the request.
     * @throws {UndefinedRuntimeStateError} If no runtime state is defined for the source file.
     */
    static getAvailableSteps(args: GetAvailableStepsArguments): GetAvailableStepsResponse {
        const runtimeState = this.petrinetStates.get(args.sourceFile);
        if (runtimeState === undefined) throw new UndefinedRuntimeStateError(args.sourceFile);

        const availableSteps: Step[] = [...runtimeState.availableSteps.values()];

        return {
            availableSteps: availableSteps.map(s => s.toLRPStep())
        };
    }

    /**
     * Returns the location of a step in the runtime state associated to the given source file.
     * The possible steps are exposed by the language runtime through the {@link getAvailableSteps} service.
     * 
     * @param args Arguments of the request.
     * @returns The LRP response to the request.
     * @throws {UndefinedRuntimeStateError} If no runtime state is defined for the source file.
     * @throws {UndefinedStepError} If no step is defined for the step ID.
     */
    static getStepLocation(args: GetStepLocationArguments): GetStepLocationResponse {
        const runtimeState = this.petrinetStates.get(args.sourceFile);
        if (runtimeState === undefined) throw new UndefinedRuntimeStateError(args.sourceFile);

        const step: Step | undefined = runtimeState.availableSteps.get(args.stepId);
        if (step === undefined) throw new UndefinedStepError(args.stepId);

        return {
            location: step.location
        }
    }
}