import { PetriNet, Place, Transition } from './generated/ast';
import { IDRegistry } from './server/idRegistry';
import * as LRP from './server/lrp';
import { Step, TransitionStep } from './server/steps';

/**
  * Return the placeState corresponding to a place
  * 
  * @param place, the place to find a placeState from
  * @param runtimeState runtime state in which to search for placeStates
  * @returns the corresponding placeState
  */
export function findPlaceStateFromPlace(place: Place, runtimeState: PetriNetState): PlaceState | undefined {
  for (const placeState of runtimeState.placeStates) {
    if (placeState.place === place) return placeState;
  }

  return undefined;
}


export class PetriNetState {
  readonly petrinet: PetriNet;
  readonly maxIterations = 50;
  private _currentIteration: number;
  readonly placeStates: Array<PlaceState> = [];
  readonly transitionStates: Array<TransitionState> = [];

  private _availableSteps?: Map<string, Step>;
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
  }

  public get currentIteration(): number {
    return this._currentIteration;
  }

  /**
   * Trigger a transition, will move tokens through places
   */
  public trigger(transition: Transition): boolean {
    for (const source of transition.sources) {
      if (!source.place.ref)
        return false;

      const sourcePlaceState: PlaceState | undefined = findPlaceStateFromPlace(source.place.ref, this);
      if (!sourcePlaceState)
        throw new Error('No place state associated.');

      sourcePlaceState.removeTokens(source.weight);
    }

    for (const destination of transition.destinations) {
      if (!destination.place.ref)
        return false;

      const destinationPlaceState: PlaceState | undefined = findPlaceStateFromPlace(destination.place.ref, this);
      if (!destinationPlaceState)
        throw new Error('No place state associated.');

      destinationPlaceState.addTokens(destination.weight, transition);
    }

    this._currentIteration = this._currentIteration + 1;
    return true;
  }

  public enterCompositeStep(stepId: string): void {
    if (this._availableSteps === undefined) throw new Error('No steps to compute from.');

    const selectedStep: Step | undefined = this._availableSteps.get(stepId);
    if (selectedStep === undefined) throw new Error(`No step with id ${stepId}.`);
    if (!selectedStep.isComposite) throw new Error('Step must be composite.');

    this._ongoingCompositeStep = selectedStep;
    this._availableSteps = undefined;
  }

  public executeAtomicStep(stepId: string): Step {
    if (this._availableSteps === undefined) throw new Error('No steps to compute from.');

    const selectedStep: Step | undefined = this._availableSteps.get(stepId);
    if (selectedStep === undefined) throw new Error(`No step with id ${stepId}.`);

    selectedStep.execute();
    this._ongoingCompositeStep = selectedStep.findOngoingStep();
    this._availableSteps = undefined;

    return selectedStep;
  }

  public checkBreakpoint(typeId: string, stepId: string, bindings: LRP.Bindings, registry: IDRegistry): LRP.CheckBreakpointResponse {
    if (this._availableSteps === undefined) throw new Error('No steps to compute from.');

    const selectedStep: Step | undefined = this._availableSteps.get(stepId);
    if (selectedStep === undefined) throw new Error(`No step with id ${stepId}.`);

    const message: string | undefined = selectedStep.checkBreakpoint(typeId, bindings, registry);

    if (message === undefined) {
      return { isActivated: false };
    }

    return {
      isActivated: true,
      message: message
    }
  }

  public computeAvailableStep(): Map<string, Step> {
    if (this._availableSteps !== undefined) return new Map(this._availableSteps);
    
    this._availableSteps = new Map();

    for (const transitionState of this.transitionStates) {
      if (transitionState.isTriggerable()) {
        const step: TransitionStep = new TransitionStep(transitionState.transition, this);
        this._availableSteps.set(step.id, step);
      }
    }

    return this._availableSteps;
  }

  public get ongoingCompositeStep(): Step | undefined {
    return this._ongoingCompositeStep;
  }

  public get availableSteps(): Map<string, Step> | undefined {
    return this._availableSteps !== undefined ? new Map(this._availableSteps) : undefined;
  }
}


export class PlaceState {
  readonly petrinetState: PetriNetState;
  readonly place: Place;
  readonly tokens: Array<TokenState> = [];

  constructor(petrinet: PetriNetState, place: Place, currentTokenNumber: number) {
    this.petrinetState = petrinet;
    this.place = place;
    for (let i = 0; i < currentTokenNumber; i++)
      this.tokens.push(new TokenState());
  }

  public addTokens(n: number, source: Transition): void {
    for (let i = 0; i < n; i++)
      this.tokens.push(new TokenState(source));
  }

  public removeTokens(n: number): void {
    this.tokens.splice(0, n);
  }
}

export class TokenState {
  constructor(private _source?: Transition) { }

  public get source(): Transition | undefined {
    return this._source;
  }
}

export class TransitionState {
  readonly petrinetState: PetriNetState;
  readonly transition: Transition;

  constructor(petrinet: PetriNetState, transition: Transition) {
    this.petrinetState = petrinet;
    this.transition = transition;
  }

  public isTriggerable(): boolean {
    for (const source of this.transition.sources) {
      if (source.place.ref === undefined) throw new Error('No place state associated.');

      const placeState: PlaceState | undefined = findPlaceStateFromPlace(source.place.ref, this.petrinetState);
      if (placeState === undefined) throw new Error(`No runtime state for place ${source.place.ref.name}.`);

      if (source.weight > placeState.tokens.length) return false;
    }

    for (const destination of this.transition.destinations) {
      if (!destination.place.ref) throw new Error('No place state associated.');

      const placeState: PlaceState | undefined = findPlaceStateFromPlace(destination.place.ref, this.petrinetState);
      if (!placeState) throw new Error(`No runtime state for place ${destination.place.ref.name}.`);

      if (placeState.tokens.length + destination.weight > placeState.place.maxCapacity) return false;
    }

    return true;
  }
}