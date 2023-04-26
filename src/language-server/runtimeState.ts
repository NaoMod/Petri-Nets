
import { Reference } from 'langium';
import { PetriNet, Place, Transition, isArcPtT, isArcTtP } from './generated/ast';

export class PetriNetState {
  private petrinet: PetriNet;
  private maxIterations: number;
  private currentNumberIterations: number;
  private placesState: Array<PlaceState> = [];
  private transitionsState: Array<TransitionState> = [];
  private tokensState: Array<TokenState> = [];

  constructor(petrinet: PetriNet, maxIteration: number) {
    this.petrinet = petrinet;
    this.maxIterations = maxIteration;
    this.currentNumberIterations = 0;

    for (let place of petrinet.places) {
      let placeState = new PlaceState(this, place, place.initialTokenNumber);
      this.placesState.push(placeState);
      for (let i = 0; i < place.initialTokenNumber; i++) {
        this.tokensState.push(new TokenState(this, placeState));
      }
    }
    for (let transition of petrinet.transitions) {
      this.transitionsState.push(new TransitionState(this, transition));
    }
  }

  // Getters
  public getPetriNet(): PetriNet {
    return this.petrinet;
  }
  public getTokens(): Array<TokenState> {
    return this.tokensState;
  }
  public getPlaces(): Array<PlaceState> {
    return this.placesState;
  }


  /**
   * Return the place corresponding to a reference
   * 
   * @param refPlace, the place's reference
   * @returns the corresponding place
   */
  public findPlaceFromReference(refPlace: Reference<Place>): Place {
    let plc: Place = this.petrinet.places[0];
    for (let place of this.petrinet.places) {
      if (place === refPlace.ref) return place;
    }
    return plc;
  }

  /**
   * Return the placeState corresponding to a place
   * 
   * @param refPlace, the place's reference
   * @returns the corresponding place
   */
  public findPlaceStateFromPlace(place: Place): PlaceState {
    let plc: PlaceState = this.placesState[0];
    for (let placeState of this.placesState) {
      if (placeState.getPlace() == place) return placeState;
    }
    return plc;
  }

  /**
   * Return the transition corresponding to a reference
   * 
   * @param refTransition, the transition's reference
   * @returns the corresponding transition
   */
  public findTransitionFromReference(refTransition: Reference<Transition>): Transition {
    let trnst: Transition = this.petrinet.transitions[0];
    for (let transition of this.petrinet.transitions) {
      if (transition === refTransition.ref) return transition;
    }
    return trnst;
  }

  /**
   * Return the transition corresponding to a reference
   * 
   * @param refTransition, the transition's reference
   * @returns the corresponding transition
   */
  public findTransitionStateFromTransition(transition: Transition): TransitionState {
    let trnst: TransitionState = this.transitionsState[0];
    for (let transitionState of this.transitionsState) {
      if (transitionState.getTransition() === transition) return transitionState;
    }
    return trnst;
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
    let canEvolve: boolean = false;
    let res: boolean = false;
    for (let transitionState of this.transitionsState) {
      res = false;
      for (let arc of this.petrinet.arcs) {
        if ((isArcPtT(arc)) && (transitionState == this.findTransitionStateFromTransition(this.findTransitionFromReference(arc.target)))) {
          if (this.findPlaceStateFromPlace(this.findPlaceFromReference(arc.source)).getCurrentTokenNumber() >= arc.weight) res = true;
          else { res = false; break; }
        } if ((isArcTtP(arc)) && (transitionState == this.findTransitionStateFromTransition(this.findTransitionFromReference(arc.source)))) {
          let placeSt = this.findPlaceStateFromPlace(this.findPlaceFromReference(arc.target));
          if (placeSt.getMaxCapacity() >= placeSt.getCurrentTokenNumber() + arc.weight) res = true;
          else { res = false; break; }
        }
      }
      transitionState.setDoable(res);
      if (res) canEvolve = true;
    }
    return canEvolve;
  }

  /**
   * Trigger a transition, will move tokens through places
   * 
   * @param tokens, every token existing
   */
  public trigger(): void {

    if (this.currentNumberIterations <= this.maxIterations) {
      let transition = this.getNextTriggerableTransition();

      for (let arc of this.petrinet.arcs) {

        // Arc Place to Transition
        if ((isArcPtT(arc)) && (this.findTransitionFromReference(arc.target) == transition)) {
          let placeState = this.findPlaceStateFromPlace(this.findPlaceFromReference(arc.source));
          placeState.setCurrentTokenNumber(placeState.getCurrentTokenNumber() - arc.weight);
          let k = arc.weight;
          for (let i = this.tokensState.length - 1; i >= 0; i--) {
            if (k != 0) {
              if (this.tokensState[i].getPosition() == placeState) {
                this.tokensState[i].unSet();
                this.tokensState.splice(i, 1);
                k = k - 1;
              }
            } else {
              break;
            }
          }
        }

        // Arc Transition to Place
        if ((isArcTtP(arc)) && (this.findTransitionFromReference(arc.source) == transition)) {
          let placeState = this.findPlaceStateFromPlace(this.findPlaceFromReference(arc.target));
          placeState.setCurrentTokenNumber(placeState.getCurrentTokenNumber() + arc.weight);
          for (let i = 0; i < arc.weight; i++) {
            this.tokensState.push(new TokenState(this, placeState, transition));
          }
        }

      }
      this.currentNumberIterations = this.currentNumberIterations + 1;
    }
  }
}

/**
 * A class representing moveable Tokens
 */
export class TokenState {
  private petrinet: PetriNetState;
  private position: PlaceState | null;
  private source: string;

  constructor(petrinet: PetriNetState, position?: PlaceState, source?: Transition) {
    this.petrinet = petrinet;
    if ((source) && (position)) {
      this.position = position;
      this.source = source.name;
    } else {
      if (source) {
        this.position = null;
        this.source = source.name;
      } if (position) {
        this.position = position;
        this.source = "initial state";
      } else {
        this.position = null;
        this.source = "null";
      }
    }

  }

  // Getters
  getPetrinet(): PetriNetState {
    return this.petrinet;
  }
  getSource(): string {
    return this.source;
  }
  getPosition(): PlaceState | null {
    return this.position;
  }

  /**
   * Will set the token to the place, change the current position
   * @param pos is the place where the token is currently
   */
  set(pos: PlaceState, source: TransitionState): void {
    this.position = pos;
    this.source = source.getTransition().name;
  }

  /**
   * Will unset the token to the place it is currently in, remove the current position
   */
  unSet(): void {
    this.position = null;
    this.source = "null";
  }
}


export class PlaceState {
  private petrinetState: PetriNetState;
  private place: Place;
  private currentTokenNumber: number;

  constructor(petrinet: PetriNetState, place: Place, currentTokenNumber?: number) {
    this.petrinetState = petrinet;
    this.place = place;
    this.currentTokenNumber = currentTokenNumber || 0;
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
  getCurrentTokenNumber(): number {
    return this.currentTokenNumber;
  }

  // Setters
  setCurrentTokenNumber(nbToken: number): void {
    this.currentTokenNumber = nbToken;
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
}