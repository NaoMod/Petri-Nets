
import { PetriNet, Place, Transition } from './generated/ast';

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

    this.refreshTransitions();
  }


  public get currentIteration(): number {
    return this._currentIteration;
  }

  /**
   * Verifies wether a transition of the petrinet can still be triggered
   * 
   * @return true if there is a triggerable transition, false otherwise
   */
  public canEvolve(): boolean {
    if (this._currentIteration >= this.maxIterations) return false;

    for (const transitionState of this.transitionStates) {
      if (transitionState.isTriggerable) {
        return true;
      }
    }
    
    return false;
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

    this.refreshTransitions();
    this._currentIteration = this._currentIteration + 1;
    return true;
  }

  private refreshTransitions(): void {
    for (const transition of this.transitionStates) {
      transition.computeTriggerable();
    }
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
  private _isTriggerable: boolean;

  constructor(petrinet: PetriNetState, transition: Transition) {
    this.petrinetState = petrinet;
    this.transition = transition;
    this._isTriggerable = false;
  }

  public get isTriggerable(): boolean {
    return this._isTriggerable;
  }

  public computeTriggerable(): void {
    let res: boolean = true;

    for (const source of this.transition.sources) {
      if (!source.place.ref)
        return;

      const placeState: PlaceState | undefined = findPlaceStateFromPlace(source.place.ref, this.petrinetState);
      if (!placeState)
        throw new Error('No place state associated.');

      if (source.weight > placeState.tokens.length) {
        res = false;
        break;
      }
    }

    if (res) {
      for (const destination of this.transition.destinations) {
        if (!destination.place.ref)
          return;

        const placeState: PlaceState | undefined = findPlaceStateFromPlace(destination.place.ref, this.petrinetState);
        if (!placeState)
          throw new Error('No place state associated.');

        if (placeState.tokens.length + destination.weight > placeState.place.maxCapacity) {
          res = false;
          break;
        }
      }
    }

    this._isTriggerable = res;
  }
}