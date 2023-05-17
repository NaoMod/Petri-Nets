
import { Reference } from 'langium';
import { PetriNet, Place, Transition } from './generated/ast';

/**
   * Return the place corresponding to a reference
   * 
   * @param refPlace, the place's reference
   * @param petrinet, the petrinet containing the place's reference
   * @returns the corresponding place
   */
export function findPlaceFromReference(refPlace: Reference<Place>, petrinet: PetriNet): Place {
  let plc: Place = petrinet.places[0];
  for (let place of petrinet.places) {
    if (place === refPlace.ref) return place;
  }
  return plc;
}

/**
   * Return the transition corresponding to a reference
   * 
   * @param refTransition, the transition's reference
   * @returns the corresponding transition
   */
export function findTransitionFromReference(refTransition: Reference<Transition>, petrinet: PetriNet): Transition {
  let trnst: Transition = petrinet.transitions[0];
  for (let transition of petrinet.transitions) {
    if (transition === refTransition.ref) return transition;
  }
  return trnst;
}

/**
  * Return the placeState corresponding to a place
  * 
  * @param refPlace, the place's reference
  * @returns the corresponding place
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
        if (transitionState.isDoable()) {
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
        findPlaceStateFromPlace(findPlaceFromReference(source.place, this.petrinet), this).removeTokens(source.weight);

      }
      for (let destination of transition.destinations) {
        findPlaceStateFromPlace(findPlaceFromReference(destination.place, this.petrinet), this).addTokens(destination.weight, transition);
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

  isDoable(): boolean {
    let res = true;
    for (let source of this.transition.sources) {
      let place = findPlaceStateFromPlace(findPlaceFromReference(source.place, this.petrinetState.getPetriNet()), this.petrinetState);
      if (source.weight > place.getCurrentTokenNumber()) {
        res = false;
        break;
      }
    }
    if (res) {
      for (let destination of this.transition.destinations) {
        let place = findPlaceStateFromPlace(findPlaceFromReference(destination.place, this.petrinetState.getPetriNet()), this.petrinetState)
        if (place.getCurrentTokenNumber() + destination.weight > place.getMaxCapacity()) {
          res = false;
          break;
        }
      }
    }
    this.setDoable(res);
    return res;
  }
}