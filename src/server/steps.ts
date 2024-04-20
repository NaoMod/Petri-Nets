import { randomUUID } from "crypto";
import { Place, Transition } from "../generated/ast";
import { StepNotAtomicError, UndefinedBreakpointTypeError } from "./errors";
import { IDRegistry } from "./idRegistry";
import { AstNodeLocator } from "./locator";
import * as LRP from "./lrp";
import { PetriNetState, PlaceState, findPlaceStateFromPlace } from "./runtimeState";

export abstract class Step {
    /** Identifier of the step. */
    readonly id: string;

    /** Name of the step. */
    readonly name: string;

    /** True if the step is composite, false otherwise. */
    readonly isComposite: boolean;

    /** Runtime state to which the step is associated. */
    readonly runtimeState: PetriNetState;

    /** Description of hte step. */
    readonly description?: string;

    /** Composite step containing the step. */
    readonly parentStep?: Step;

    /** Location of the step within the source file. */
    readonly location?: LRP.Location;

    constructor(name: string, isComposite: boolean, runtimeState: PetriNetState, description?: string, parentStep?: Step, location?: LRP.Location) {
        this.name = name;
        this.isComposite = isComposite;
        this.runtimeState = runtimeState;
        this.description = description;
        this.parentStep = parentStep;
        this.location = location;
        this.id = randomUUID();
    }

    /** Currently completed steps within the step. */
    public get completedSteps(): Step[] {
        const result: Step[] = this.isCompleted ? [this] : [];
        let parentStep: Step | undefined = this.parentStep;;

        while (parentStep !== undefined) {
            if (!parentStep.isCompleted) break;

            result.push(parentStep);
            parentStep = parentStep.parentStep;
        }

        return result;
    }

    /** True if the step is completed, false otherwise. */
    public abstract get isCompleted(): boolean;

    /** Other steps contained within the step. */
    public abstract get containedSteps(): Step[];

    /**
     * Retrieves the ongoing step.
     * Will not look at the contained steps, only itself and its parents.
     * 
     * @returns The currently ongoing step, or undefined if there is none.
     */
    public findOngoingStep(): Step | undefined {
        if (!this.isCompleted) return this;

        return this.parentStep !== undefined ? this.parentStep.findOngoingStep() : undefined;
    }

    /**
     * Provides the LRP equivalent of the step.
     * 
     * @returns The LRP representation of the step.
     */
    public toLRPStep(): LRP.Step {
        return {
            id: this.id,
            name: this.name,
            isComposite: this.isComposite,
            description: this.description
        }
    }

    /**
     * Checks whether a breakpoint is activated on this step.
     * 
     * @param typeId ID of the breakpoint type to check.
     * @param bindings Bindings associated to the breakpoint.
     * @param registry Registy associated to the source file of this step.
     * 
     * @returns The message of the activated breakpoint, or undefined if the breakpoint is not activated.
     * @throws {UndefinedBreakpointTypeError} If no breakpoint type is defined for the type ID.
     */
    public abstract checkBreakpoint(typeId: string, bindings: LRP.Bindings, registry: IDRegistry): string | undefined;

    /**
     * Executes the step if it is atomic.
     * 
     * @throws {StepNotAtomicError} If the step is not atomic.
     */
    public abstract execute(): void;
}

export abstract class AtomicStep extends Step {
    protected _isCompleted: boolean;

    constructor(name: string, runtime: PetriNetState, description?: string, parentStep?: Step, location?: LRP.Location) {
        super(name, false, runtime, description, parentStep, location);
        this._isCompleted = false;
    }

    public override get isCompleted(): boolean {
        return this._isCompleted;
    }

    public override get containedSteps(): Step[] {
        return [];
    }
}

export abstract class CompositeStep extends Step {
    constructor(name: string, runtime: PetriNetState, description?: string, parentStep?: Step, location?: LRP.Location) {
        super(name, true, runtime, description, parentStep, location);
    }

    public override execute(): void {
        throw new StepNotAtomicError(this);
    }
}


export class TransitionStep extends AtomicStep {
    constructor(private transition: Transition, runtime: PetriNetState) {
        super(transition.name, runtime, undefined, undefined, AstNodeLocator.getLocation(transition));
    }

    public override execute(): void {
        this.runtimeState.triggerTransition(this.transition);
        this._isCompleted = true;
    }

    public override checkBreakpoint(typeId: string, bindings: LRP.Bindings, registry: IDRegistry): string | undefined {
        switch (typeId) {
            case 'placeEmpty':
                for (const sourceEdge of this.transition.sources) {
                    const sourcePlace: Place | undefined = sourceEdge.place.ref;
                    if (sourcePlace === undefined || bindings.p !== registry.getASTId(sourcePlace)) continue;

                    const sourcePlaceState: PlaceState | undefined = findPlaceStateFromPlace(sourcePlace, this.runtimeState);
                    if (sourcePlaceState === undefined) continue;

                    if (sourcePlaceState.tokens.length === sourceEdge.weight) return `Place ${sourcePlace.name} is about to be empty.`;
                }

                break;

            case 'placeFull':
                for (const destinationEdge of this.transition.destinations) {
                    const destinationPlace: Place | undefined = destinationEdge.place.ref;
                    if (destinationPlace === undefined || bindings.p === registry.getASTId(destinationPlace)) continue;

                    const destinationPlaceState: PlaceState | undefined = findPlaceStateFromPlace(destinationPlace, this.runtimeState);
                    if (destinationPlaceState === undefined) continue;

                    if (destinationPlaceState.tokens.length + destinationEdge.weight === destinationPlace.maxCapacity) return `Place ${destinationPlace.name} is about to be full.`;
                }

                break;

            case 'transitionFired':
                if (bindings.t === registry.getASTId(this.transition)) return `Transition ${this.transition.name} is about to be fired.`;

                break;

            default: {
                throw new UndefinedBreakpointTypeError(typeId);
            }
        }

        return undefined;
    }
}