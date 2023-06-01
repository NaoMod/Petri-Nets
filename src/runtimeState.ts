
import { PetriNet, Place, Transition } from './generated/ast';

/**
  * Return the placeState corresponding to a place
  * 
  * @param place, the place to find a placeState from
  * @returns the corresponding placeState
  */
function findPlaceStateFromPlace(place: Place, petrinet: PetriNetState): PlaceState {
  let plc: PlaceState = petrinet.getPlaces()[0];
  for (let placeState of petrinet.getPlaces()) {
    if (placeState.getPlace() == place) return placeState;
  }
  return plc;
}


export class PetriNetState {
  private petrinet: PetriNet;
  private maxIterations = 50;
  private currentNumberIterations: number;
  private placesState: Array<PlaceState> = [];
  private transitionsState: Array<TransitionState> = [];

  constructor(petrinet: PetriNet) {
    this.petrinet = petrinet;
    this.currentNumberIterations = 0;

    for (let place of petrinet.places) {
      let placeState = new PlaceState(this, place, place.initialTokenNumber);
      this.placesState.push(placeState);
    }
    for (let transition of petrinet.transitions) {
      this.transitionsState.push(new TransitionState(this, transition));
    }
  }

  // Getters
  public getPetriNet(): PetriNet {
    return this.petrinet;
  }
  public getPlaces(): Array<PlaceState> {
    return this.placesState;
  }
  public getTransitions(): Array<TransitionState> {
    return this.transitionsState;
  }
  public getMaxIterations(): number {
    return this.maxIterations;
  }

  /**
   * Will find the next triggerable Transition
   * 
   * @returns the next triggerableTransition or null if there's none
   */
  public getNextTriggerableTransition(): Transition | null {
    if (this.canEvolve()) {
      for (let transitionState of this.transitionsState) {
        if (transitionState.getDoable()) return transitionState.getTransition();
      }
    }
    return null;
  }


  /**
   * Verifies wether a transition of the petrinet can still be triggered
   * 
   * @return true if there is a triggerable transition
   */
  public canEvolve(): boolean {
    if (this.currentNumberIterations < this.maxIterations) {
      for (let transitionState of this.transitionsState) {
        if (transitionState.computeDoable()) {
          return true;
        }
      }
    }
    return false;;
  }

  /**
   * Trigger a transition, will move tokens through places
   * 
   * @param tokens, every token existing
   */
  public trigger(): boolean {
    let transition = this.getNextTriggerableTransition();

    if (transition != null) {
      for (let source of transition.sources) {
        if (source.place.ref)
          findPlaceStateFromPlace(source.place.ref, this).removeTokens(source.weight);
        else return false;
      }
      for (let destination of transition.destinations) {
        if (destination.place.ref)
          findPlaceStateFromPlace(destination.place.ref, this).addTokens(destination.weight, transition);
        else return false;
      }
      this.currentNumberIterations = this.currentNumberIterations + 1;
      return true;
    }
    return false;
  }
}


export class PlaceState {
  private petrinetState: PetriNetState;
  private place: Place;
  private everyTokens: Array<TokenState> = [];

  constructor(petrinet: PetriNetState, place: Place, currentTokenNumber: number) {
    this.petrinetState = petrinet;
    this.place = place;
    for (let i = 0; i < currentTokenNumber; i++) this.everyTokens.push(new TokenState());
  }

  // Getters
  getPetriNet(): PetriNetState {
    return this.petrinetState;
  }
  getPlace(): Place {
    return this.place;
  }
  getMaxCapacity(): number {
    return this.place.maxCapacity;
  }
  getEveryTokens(): Array<TokenState> {
    return this.everyTokens;
  }
  getCurrentTokenNumber(): number {
    return this.everyTokens.length;
  }

  // Adder
  addTokens(n: number, source: Transition): void {
    for (let i = 0; i < n; i++) this.everyTokens.push(new TokenState(source));
  }

  // Remover
  removeTokens(n: number): void {
    this.everyTokens.splice(0, n);
  }
}

export class TokenState {
  private source: string;

  constructor(source?: Transition) {
    if (source)
      this.source = "From " + source.name;
    else this.source = "initial state";
  }

  // Getters
  getSource(): string {
    return this.source;
  }
}

export class TransitionState {
  private petrinetState: PetriNetState;
  private transition: Transition;
  private doable: boolean;

  constructor(petrinet: PetriNetState, transition: Transition) {
    this.petrinetState = petrinet;
    this.transition = transition;
    this.doable = false;
  }

  // Getters
  getPetriNet(): PetriNetState {
    return this.petrinetState;
  }
  getTransition(): Transition {
    return this.transition;
  }
  getDoable() {
    return this.doable;
  }

  // Setters
  setDoable(res: boolean): void {
    this.doable = res;
  }

  /**
   * Will check if the transition is doable, will change its attribute doable.
   * @returns true if the transition is doable, false otherwise
   */
  computeDoable(): boolean {
    let res = true;
    for (let source of this.transition.sources) {
      if (source.place.ref) {
        let place = findPlaceStateFromPlace(source.place.ref, this.petrinetState);
        if (source.weight > place.getCurrentTokenNumber()) {
          res = false;
          break;
        }
      } else return false;
    }
    if (res) {
      for (let destination of this.transition.destinations) {
        if (destination.place.ref) {
          let place = findPlaceStateFromPlace(destination.place.ref, this.petrinetState)
          if (place.getCurrentTokenNumber() + destination.weight > place.getMaxCapacity()) {
            res = false;
            break;
          }
        } else return false;
      }
    }
    this.setDoable(res);
    return res;
  }
}