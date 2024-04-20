import { PetriNet, Place, Transition } from '../generated/ast';
import { UndefinedReferenceError, UndefinedStateError, UndefinedStepError } from './errors';
import { IDRegistry } from './idRegistry';
import * as LRP from './lrp';
import { Step, TransitionStep } from './steps';

/**
  * Return the {@link PlaceState} corresponding to a {@link Place}.
  * 
  * @param place Place to find a placeState from
  * @param runtimeState Runtime state in which to search for placeStates
  * @returns The corresponding placeState.
  */
export function findPlaceStateFromPlace(place: Place, runtimeState: PetriNetState): PlaceState | undefined {
  for (const placeState of runtimeState.placeStates) {
    if (placeState.place === place) return placeState;
  }

  return undefined;
}

/**
 * Runtime state for a Petri Net.
 */
export class PetriNetState {
  /** AST associated to this runtime state. */
  readonly petrinet: PetriNet;

  /** Maximum number of iterations allowed for the execution. */
  readonly maxIterations = 50;

  /** Current number of iterations. */
  private _currentIteration: number;

  /** State of places contained within the Petri Net. */
  readonly placeStates: Array<PlaceState> = [];

  /** State of transitions contained within the Petri Net. */
  readonly transitionStates: Array<TransitionState> = [];

  /** Currently available execution steps. */
  private _availableSteps: Map<string, Step>;

  /** Currently ongoing composite step. */
  private _ongoingCompositeStep?: Step;

  constructor(petrinet: PetriNet) {
    this.petrinet = petrinet;
    this._currentIteration = 0;

    for (const place of petrinet.places) {
      const placeState = new PlaceState(this, place, place.initialTokenNumber);
      this.placeStates.push(placeState);
    }

    for (const transition of petrinet.transitions) {
      this.transitionStates.push(new TransitionState(this, transition));
    }

    this._availableSteps = this.computeAvailableSteps();
  }


  /**
   * Triggers a transition.
   * 
   * @param transition Transition to trigger.
   * @throws {UndefinedReferenceError} If a place referenced by the transition is not defined.
   * @throws {UndefinedStateError} If no runtime state is associated to a place.
   */
  public triggerTransition(transition: Transition): void {
    for (const source of transition.sources) {
      if (!source.place.ref) throw new UndefinedReferenceError(source.place);

      const sourcePlaceState: PlaceState | undefined = findPlaceStateFromPlace(source.place.ref, this);
      if (!sourcePlaceState) throw new UndefinedStateError(source.place.ref);

      sourcePlaceState.removeTokens(source.weight);
    }

    for (const destination of transition.destinations) {
      if (!destination.place.ref) throw new UndefinedReferenceError(destination.place);

      const destinationPlaceState: PlaceState | undefined = findPlaceStateFromPlace(destination.place.ref, this);
      if (!destinationPlaceState) throw new UndefinedStateError(destination.place.ref);

      destinationPlaceState.addTokens(destination.weight, transition);
    }

    this._currentIteration = this._currentIteration + 1;
  }

  /**
   * Enters a composite step.
   * 
   * @param stepId ID of the composite step to enter.
   * @throws {UndefinedStepError} If the step is not defined.
   */
  public enterCompositeStep(stepId: string): void {
    const selectedStep: Step | undefined = this._availableSteps.get(stepId);
    if (selectedStep === undefined) throw new UndefinedStepError(stepId);

    this._availableSteps = this.computeAvailableSteps();
    this._ongoingCompositeStep = selectedStep;
  }

  /**
   * Executes a single atomic step.
   * 
   * @param stepId ID of the atomic step to execute. 
   * @returns The atomic step which was executed.
   * @throws {UndefinedStepError} If the step is not defined.
   */
  public executeAtomicStep(stepId: string): Step {
    const selectedStep: Step | undefined = this._availableSteps.get(stepId);
    if (selectedStep === undefined) throw new UndefinedStepError(stepId);

    selectedStep.execute();
    this._availableSteps = this.computeAvailableSteps();
    this._ongoingCompositeStep = selectedStep.findOngoingStep();

    return selectedStep;
  }

  /**
   * Checks if a breakpoint is activated.
   * 
   * @param typeId ID of the breakpoint type to check. 
   * @param stepId ID of the step on which to check the breakpoint.
   * @param bindings Bindings associated to the breakpoint.
   * @param registry Registy associated to the source file.
   * @returns The message of the activated breakpoint, or undefined if the breakpoint is not activated.
   */
  public checkBreakpoint(typeId: string, stepId: string, bindings: LRP.Bindings, registry: IDRegistry): string | undefined {
    const selectedStep: Step | undefined = this._availableSteps.get(stepId);
    if (selectedStep === undefined) throw new UndefinedStepError(stepId);

    return selectedStep.checkBreakpoint(typeId, bindings, registry);
  }

  /** Current number of iterations. */
  public get currentIteration(): number {
    return this._currentIteration;
  }

  /** Currently ongoing composite step. */
  public get ongoingCompositeStep(): Step | undefined {
    return this._ongoingCompositeStep;
  }

  /** Currently available execution steps. */
  public get availableSteps(): Map<string, Step> {
    return new Map(this._availableSteps);
  }

  /**
   * Computes the available steps from the current runtime step.
   * 
   * @returns The map of IDs to their associated step.
   */
  private computeAvailableSteps(): Map<string, Step> {
    const availableSteps: Map<string, Step> = new Map();

    for (const transitionState of this.transitionStates) {
      if (transitionState.isTriggerable) {
        const step: TransitionStep = new TransitionStep(transitionState.transition, this);
        availableSteps.set(step.id, step);
      }
    }

    return availableSteps;
  }
}


export class PlaceState {
  /** State of the Petri Net containing the place. */
  readonly petrinetState: PetriNetState;

  /** Place to which this state is associated. */
  readonly place: Place;

  /** Tokens stored by the place. */
  readonly tokens: Array<TokenState> = [];

  constructor(petrinet: PetriNetState, place: Place, currentTokenNumber: number) {
    this.petrinetState = petrinet;
    this.place = place;
    for (let i = 0; i < currentTokenNumber; i++)
      this.tokens.push(new TokenState());
  }

  /**
   * Adds tokens to the place.
   * 
   * @param n Number of tokens to add. 
   * @param source Transition from which the tokens are emitted.
   */
  public addTokens(n: number, source: Transition): void {
    for (let i = 0; i < n; i++)
      this.tokens.push(new TokenState(source));
  }

  /**
   * Removes tokens from the place.
   * 
   * @param n Number of tokens to remove.
   */
  public removeTokens(n: number): void {
    this.tokens.splice(0, n);
  }
}

export class TokenState {
  constructor(private _source?: Transition) { }

  /** Transition that emitted this token. */
  public get source(): Transition | undefined {
    return this._source;
  }
}

export class TransitionState {
  /** State of the Petri Net containing the transition. */
  readonly petrinetState: PetriNetState;

  /** Place to which this transition is associated. */
  readonly transition: Transition;

  constructor(petrinet: PetriNetState, transition: Transition) {
    this.petrinetState = petrinet;
    this.transition = transition;
  }

  /** 
   * True if the transition is triggerable, false otherwise.
   * 
   * @throws {UndefinedReferenceError} If a place referenced by the transition is not defined.
   * @throws {UndefinedStateError} If no runtime state is associated to a place.
   */
  public get isTriggerable(): boolean {
    for (const source of this.transition.sources) {
      if (source.place.ref === undefined) throw new UndefinedReferenceError(source.place);

      const placeState: PlaceState | undefined = findPlaceStateFromPlace(source.place.ref, this.petrinetState);
      if (placeState === undefined) throw new UndefinedStateError(source.place.ref);

      if (source.weight > placeState.tokens.length) return false;
    }

    for (const destination of this.transition.destinations) {
      if (!destination.place.ref) throw new UndefinedReferenceError(destination.place);

      const placeState: PlaceState | undefined = findPlaceStateFromPlace(destination.place.ref, this.petrinetState);
      if (!placeState) throw new UndefinedStateError(destination.place.ref);

      if (placeState.tokens.length + destination.weight > placeState.place.maxCapacity) return false;
    }

    return true;
  }
}