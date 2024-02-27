import { randomUUID } from "crypto";
import { Place, Transition } from "../generated/ast";
import { PetriNetState, PlaceState, findPlaceStateFromPlace } from "../runtimeState";
import { IDRegistry } from "./idRegistry";
import { AstNodeLocator } from "./locator";
import * as LRP from "./lrp";

export abstract class Step {
    readonly id: string;

    constructor(readonly name: string, readonly isComposite: boolean, readonly runtime: PetriNetState, readonly description?: string, readonly parentStep?: Step, readonly location?: LRP.Location) {
        this.id = randomUUID();
    }

    public getCompletedSteps(): Step[] {
        const result: Step[] = this.isCompleted ? [this] : [];
        let parentStep: Step | undefined = this.parentStep;;

        while (parentStep !== undefined) {
            if (!parentStep.isCompleted) break;

            result.push(parentStep);
            parentStep = parentStep.parentStep;
        }

        return result;
    }

    public findOngoingStep(): Step | undefined {
        if (!this.isCompleted) return this;

        return this.parentStep !== undefined ? this.parentStep.findOngoingStep() : undefined;
    }

    public toLRPStep(): LRP.Step {
        return {
            id: this.id,
            name: this.name,
            isComposite: this.isComposite,
            description: this.description
        }
    }

    public abstract get isCompleted(): boolean;

    public abstract getContainedSteps(): Step[];

    public abstract checkBreakpoint(type: string, bindings: LRP.Bindings, registry: IDRegistry): string | undefined;

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

    public override getContainedSteps(): Step[] {
        throw new Error('Step must be composite.');
    }
}

export abstract class CompositeStep extends Step {
    constructor(name: string, runtime: PetriNetState, description?: string, parentStep?: Step, location?: LRP.Location) {
        super(name, true, runtime, description, parentStep, location);
    }

    public override checkBreakpoint(type: string, bindings: LRP.Bindings, registry: IDRegistry): string | undefined {
        throw new Error('Step must be atomic.');
    }

    public override execute(): void {
        throw new Error('Step must be atomic.');
    }
}


export class TransitionStep extends AtomicStep {
    constructor(private transition: Transition, runtime: PetriNetState) {
        super(transition.name, runtime, undefined, undefined, AstNodeLocator.getLocation(transition));
    }

    public override execute(): void {
        this.runtime.trigger(this.transition);
        this._isCompleted = true;
    }

    public override checkBreakpoint(typeId: string, bindings: LRP.Bindings, registry: IDRegistry): string | undefined {
        switch (typeId) {
            case 'placeEmpty':
                for (const sourceEdge of this.transition.sources) {
                    const sourcePlace: Place | undefined = sourceEdge.place.ref;
                    if (sourcePlace === undefined || bindings.p !== registry.getASTId(sourcePlace)) continue;

                    const sourcePlaceState: PlaceState | undefined = findPlaceStateFromPlace(sourcePlace, this.runtime);
                    if (sourcePlaceState === undefined) continue;

                    if (sourcePlaceState.tokens.length === sourceEdge.weight) return `Place ${sourcePlace.name} is about to be empty.`;
                }

                break;

            case 'placeFull':
                for (const destinationEdge of this.transition.destinations) {
                    const destinationPlace: Place | undefined = destinationEdge.place.ref;
                    if (destinationPlace === undefined || bindings.p === registry.getASTId(destinationPlace)) continue;

                    const destinationPlaceState: PlaceState | undefined = findPlaceStateFromPlace(destinationPlace, this.runtime);
                    if (destinationPlaceState === undefined) continue;

                    if (destinationPlaceState.tokens.length + destinationEdge.weight === destinationPlace.maxCapacity) return `Place ${destinationPlace.name} is about to be full.`;
                }

                break;

            case 'transitionTrigger':
                if (bindings.t === registry.getASTId(this.transition)) return `Transition ${this.transition.name} is about to be triggered.`;

                break;

            default: {
                throw new Error(`The breakpoint id ${typeId} does not exist.`);
            }
        }

        return undefined;
    }
}