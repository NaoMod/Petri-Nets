export class PetriNetState {
private name: string;
private maxIterations: number;
private places: Array<PlaceState> = [];
private transitions:  Array<TransitionState> = [];
private arcs: Array<ArcState> = [];
private events: Array<EventState|ResetState|EvolutionState> = [];
private sorted: boolean = false;

constructor(name: string, maxIteration: number) {
    this.name = name;
    this.maxIterations = maxIteration;
}

// Getters
public getPlaces(): Array<PlaceState> {
    return this.places;
}
public getTransitions(): Array<TransitionState> {
    return this.transitions;
}
public getArcs(): Array<ArcState> {
    return this.arcs;
}
public getEvents(): Array<EventState|ResetState|EvolutionState> {
    return this.events;
}
public getMaxIterations(): number {
    return this.maxIterations;
}
public isSorted(): boolean {
    return this.sorted;
}
public getName(): String {
    return this.name;
}


// Adders
public addPlace(place: PlaceState): void {
    this.places.push(place);
}
public addTransition(transition: TransitionState): void {
    this.transitions.push(transition);
}
public addArc(arc: ArcState): void {
    this.arcs.push(arc);
}
public addEvent(event: EventState): void {
    this.events.push(event);
}


// Removers
public removeEvent(event: EventState): void {
    this.events.splice(this.events.indexOf(event), 1);
}

public containsPlace(placeName:string): boolean {
  for(let place of this.places) {
    if(place.getName() == placeName) return true;
  } return false;
}
public containsTransition(transitionName:string): boolean {
  for(let transition of this.transitions) {
    if(transition.getName() == transitionName) return true;
  } return false;
}

/**
 * Changes the isSorted variable to val
 * @param val the value to set isSorted to
 */
public setSorted(val: boolean): void {
    this.sorted = val;
}

/**
 * Sorts arcs, places to transitions arcs first
 */
public sortArc(): void {
    this.arcs.sort(ArcState.sortArcBySourcePlaceFirst);
    this.sorted = true;
}

/**
 * Verifies that a given transition is doable
 */
public transitionDoAble(transition: TransitionState): boolean {
    let res = true;
    for (let arc of this.getArcs()) {
        if ((arc.getSourceP() != null) && (arc.getSourceP().getCurrentTokenNumber() < arc.getWeight()))
            res = false;
    }
    transition.setDoable(res);
    return res;
}

/**
 * Verifies wether a transition of the petrinet can still be triggered
 * 
 * @return true if there is a triggerable transition
 */
public canEvolve(): boolean {
    let res = false;
    for (let transition of this.getTransitions()) {
        if (this.transitionDoAble(transition))
            res = true;
    }
    return res;
}

/**
 * Suppresses unimportant places (some created by default)
 */
public filterPlaces(): void {
    for (let place of this.getPlaces()) {
        if(place.getName() == "null") {
            this.places.splice(this.places.indexOf(place), 1);
        }
    }
}

/**
 * Suppresses unimportant transitions (some created by default)
 */
public filterTransitions(): void {
    for (let transition of this.getTransitions()) {
        if(transition.getName() == "null") {
            this.transitions.splice(this.transitions.indexOf(transition), 1);
        }
    }
}

/**
 * Suppresses unimportant arcs (some created by default)
 */
public filterArcs(): void {
    for (let arc of this.getArcs()) {
        if((arc.getSourceP().getName() == "null") || (arc.getSourceT().getName() == "null")){
            this.arcs.splice(this.arcs.indexOf(arc), 1);
        }
    }
}

public main(): void {
    let petrinet: PetriNetState = new PetriNetState("PetriNet", 300);

let P1: PlaceState = new PlaceState(petrinet, "P1", 8, 4);
let P2: PlaceState = new PlaceState(petrinet, "P2", 3, 0);
let P3: PlaceState = new PlaceState(petrinet, "P3", 6, 3);

let T1: TransitionState = new TransitionState(petrinet, "T1");

new ArcPtTState(petrinet, "A1", P1, T1, 2);
new ArcTtPState(petrinet, "A2", T1, P2, 1);
new ArcPtTState(petrinet, "A3", P3, T1, 1);

petrinet.sortArc();

let moveableTokens: Array<TokenState> = [];

for (let place of petrinet.getPlaces()) {
  for (let i = 0; i < place.getCurrentTokenNumber(); i++) {
    moveableTokens.push(new TokenState(petrinet, place));
  }
}

console.log("1 : Base");
console.log("events : " + petrinet.getEvents());

for (let place of petrinet.getPlaces()) {
  console.log();
  console.log("    Tokens in place " + place.getName() + " : ");
  for (let i = 0; i < moveableTokens.length; i++) {
    if (moveableTokens[i].getPosition() == place) {
      console.log(moveableTokens[i] + " , ");
    }
  }
  console.log();
}

console.log("------------------------------------------------------------------------");

new EvolutionState(petrinet, moveableTokens);

console.log("2 : Evolution");
console.log("events : " + petrinet.getEvents());

for (let place of petrinet.getPlaces()) {
  console.log();
  console.log("    Tokens in place " + place.getName() + " : ");
  for (let i = 0; i < moveableTokens.length; i++) {
    if (moveableTokens[i].getPosition() == place) {
      console.log(moveableTokens[i] + " , ");
    }
  }
  console.log();
}

console.log("------------------------------------------------------------------------");

new ResetState(petrinet, moveableTokens);
console.log("3 : Reset");
console.log("events : " + petrinet.getEvents());

for (let place of petrinet.getPlaces()) {
  console.log();
  console.log("    Tokens in place " + place.getName() + " : ");
  for (let i = 0; i < moveableTokens.length; i++) {
    if (moveableTokens[i].getPosition() == place) {
      console.log(moveableTokens[i] + " , ");
    }
  }
  console.log();
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

    constructor(petrinet: PetriNetState, position?: PlaceState, source?: TransitionState) {
        this.petrinet = petrinet;
        if (source) {
            this.position = null;
            this.source = source.getName();
        } if (position) {
            this.position = position;
            this.source = "initial state";
        } else {
            this.position = null;
            this.source = "null";
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
     * Will set the token to the place, change the current position and add that token to the place's token list
     * @param pos is the place where the token is currently
     */
    set(pos: PlaceState): void {
        this.position = pos;
        this.source = pos.getName();
    }

    /**
     * Will set the token to the place it is currently in, change the current position and remove that token to the place's token list
     */
    unSet(): void {
            this.position = null;
        
    }
}


export class PlaceState {
private petrinet: PetriNetState;
    private name: string;
    private maxCapacity: number;
    private currentTokenNumber: number;

    constructor(petrinet: PetriNetState, name: string, maxCapacity: number, currentTokenNumber?: number) {
        this.petrinet = petrinet;
        this.name = name;
        this.maxCapacity = maxCapacity;
        if (currentTokenNumber && currentTokenNumber > maxCapacity) {
            throw new Error("Too many tokens in place.");
        }
        this.currentTokenNumber = currentTokenNumber || 0;
        if (name != "null") this.petrinet.addPlace(this);
    }

    // Getters
    getName(): string {
        return this.name;
    }
    getMaxCapacity(): number {
        return this.maxCapacity;
    }
    getCurrentTokenNumber(): number {
        return this.currentTokenNumber;
    }
}


export class TransitionState {
    private petrinet: PetriNetState;
    private doable: boolean = false;
    private name: string;

    constructor(petrinet: PetriNetState, name: string) {
        this.petrinet = petrinet;
        this.name = name;
        if(name != "null") this.petrinet.addTransition(this);
    }

    public getName(): string {
        return this.name;
    }

    public getDoable(): boolean {
        return this.doable;
    }

    public setDoable(val: boolean): void {
        this.doable = val;
    }
}

/**
 * A class representing an arc with a weight
 */
export abstract class ArcState {
  public petrinet: PetriNetState;
  protected name: string;
  protected weight: number;

  protected constructor(petrinet: PetriNetState, name: string, weight: number) {
    this.petrinet = petrinet;
    this.name = name;
    if (weight < 0) {
      throw new Error("Weight must be positive");
    }
    this.weight = weight;
    this.petrinet.setSorted(false);
    this.petrinet.addArc(this);
  }

  // Getters
  public abstract getSourceP(): PlaceState;

  public abstract getSourceT(): TransitionState;

  public abstract getTargetP(): PlaceState;

  public abstract getTargetT(): TransitionState;

  public getWeight(): number {
    return this.weight;
  }

  /**
   * 
   * @param a , first arc to compare
   * @param b , second arc to compare
   * @returns 0, if both arc are ArcPtT, -1 if only b is ArcPtT, 1 if only a is ArcPtT
   */
  static sortArcBySourcePlaceFirst(a: ArcState, b: ArcState): number {
    if (a.getSourceP().getName() !== "null") {
      if (b.getSourceP().getName() !== "null") {
        return 0;
      }
      return -1;
    }
    return 1;
  }
}

/**
 * A class that represents an arc from a Place to a Transition
 */
export class ArcPtTState extends ArcState {
  private source: PlaceState;
  private target: TransitionState;

  constructor(petrinet: PetriNetState, name: string, source: PlaceState, target: TransitionState, weight: number) {
    super(petrinet, name, weight);
    this.source = source;
    this.target = target;
  }

  // Getters
  public getSourceP(): PlaceState {
    return this.source;
  }

  public getSourceT(): TransitionState {
    return new TransitionState(this.petrinet, "null");
  }

  public getTargetP(): PlaceState {
    return new PlaceState(this.petrinet, "null", 0);
  }

  public getTargetT(): TransitionState {
    return this.target;
  }
}

/**
 * A class that represents an arc from a Transition to a Place
 */
export class ArcTtPState extends ArcState {
  private source: TransitionState;
  private target: PlaceState;

  constructor(petrinet: PetriNetState, name: string, source: TransitionState, target: PlaceState, weight: number) {
    super(petrinet, name, weight);
    this.source = source;
    this.target = target;
  }

  // Getters
  public getSourceP(): PlaceState {
    return new PlaceState(this.petrinet, "null", 0);
  }

  public getSourceT(): TransitionState {
    return this.source;
  }

  public getTargetP(): PlaceState {
    return this.target;
  }

  public getTargetT(): TransitionState {
    return new TransitionState(this.petrinet, "null");
  }
}

/**
 * A class representing events that influence the petri net, implemented by
 * Evolution and Reset
 */
export abstract class EventState {
    protected petrinet: PetriNetState;

    constructor(petrinet: PetriNetState) {
        this.petrinet = petrinet;
        this.petrinet.addEvent(this);
        if (!this.petrinet.isSorted())
            this.petrinet.sortArc();
    }

    /**
     * Allow the Reset class to access the triggers of an Evolution event
     */
    public abstract getEveryTriggers(): Array<Trigger>;

    /**
     * Suppresses a trigger from an Evolution event, used by Reset after cancelling that trigger
     * @param trigger to suppress
     */
    public abstract removeTrigger(trigger: Trigger): void;
}


export class EvolutionState extends EventState {
    everyTriggers: Array<Trigger> = new Array<Trigger>();

    constructor(petrinet: PetriNetState, tokens: Array<TokenState>, triggers?: Array<Trigger>) {
        super(petrinet);
        if(triggers) this.everyTriggers = triggers;
        /*
        this.petrinet.addEvent(this);
        this.ContinueEvolving(this.EvolveIt(1, tokens), tokens);
        this.petrinet.filterArcs();
        this.petrinet.filterPlaces();
        this.petrinet.filterTransitions();*/
    }

    /**
     * Will continue to trigger transitions until there are no doable transitions or
     * that the max iteration is reached
     * 
     * @param i is the number of times the petri net has been evolving
     *//*
    private EvolveIt(i: number, tokens: Array<TokenState>): number {
        for (let transition of this.petrinet.getTransitions()) {
            if (this.petrinet.transitionDoAble(transition))
                this.everyTriggers.push(new Trigger(this.petrinet, true, transition, tokens));
        }
        return i + 1;
    }*/

    /**
     * Verifies that the petri net can evolve
     * 
     * @param i is the number of times the petri net has been evolving
     *//*
    private ContinueEvolving(i: number, tokens: Array<TokenState>): void {
        if ((this.petrinet.canEvolve()) || (i < this.petrinet.getMaxIterations()))
            this.EvolveIt(i, tokens);
    }*/

    public getEveryTriggers(): Array<Trigger> {
        return this.everyTriggers;
    }

    public removeTrigger(trigger: Trigger): void {
        this.everyTriggers.splice(this.everyTriggers.indexOf(trigger), 1);
    }
}


/**
 * A class that make it possible to return to the original state of a petri net
 */
export class ResetState extends EventState {
  constructor(petrinet: PetriNetState, tokens: Array<TokenState>) {
    super(petrinet);/*
    this.continueResetting(petrinet.getEvents().length, tokens);
    this.petrinet.filterArcs();
    this.petrinet.filterPlaces();
    this.petrinet.filterTransitions();*/
  }

  /**
   * Will continue to cancel triggers of an Evolution
   * 
   * @param n is the number of events contained in the petrinet
   *//*
  private continueResetting(sizeEvents: number, tokens: Array<TokenState>): void {
    if (sizeEvents > 0) {
        let currentEvent = sizeEvents - 1;
            if (this.petrinet.getEvents()[sizeEvents-1] instanceof EvolutionState) {
                while (this.petrinet.getEvents()[currentEvent].getEveryTriggers().length !== 0) {
                    new Trigger(this.petrinet, false, this.petrinet.getEvents()[currentEvent].getEveryTriggers()[0].getTransition(), tokens);
                    this.petrinet.getEvents()[currentEvent].removeTrigger(
                            this.petrinet.getEvents()[currentEvent].getEveryTriggers()[0]);
                
                }
            }
        this.petrinet.removeEvent(this.petrinet.getEvents()[currentEvent]);
      if (this.petrinet.getEvents()[sizeEvents-1] instanceof ResetState) 
        this.petrinet.removeEvent(this.petrinet.getEvents()[currentEvent]);
      this.continueResetting(this.petrinet.getEvents().length, tokens);
    }
  }*/

  public getEveryTriggers(): Trigger[] {
    return [];
  }

  public removeTrigger(trigger: Trigger): void {
  }
}

/**
 * A class representing a transition trigger, it manages the tokens movements
*/
export class Trigger {
    private petrinet: PetriNetState;
    private transition: TransitionState;

    constructor(petrinet: PetriNetState, isEvolution: boolean, transition: TransitionState, tokens: Array<TokenState>) {
        this.petrinet = petrinet;
        if (this.triggerIt(isEvolution, transition, tokens)) {
            this.transition = transition;
        } else {
            this.transition = new TransitionState(this.petrinet, "null");
        }
    }

    /**
     * Will trigger a transition, this means that every arc having this transition
     * either as a source or a target will be activated. As a consequence, tokens
     * will be deleted or created in corresponding places
     * 
     * OR 
     * 
     * Will cancel a transition by triggering it the other way
     * 
     * @param isEvolution, true if the even is an Evolution, false if it's a Reset
     * @param transition, the transition to trigger
     * @param tokens, the list of existing tokens
     * @return whether the trigger was possible or not
     */
    private triggerIt(isEvolution: boolean, transition: TransitionState, tokens: Array<TokenState>): boolean {
        if (isEvolution) {
            for (let i = 0; i < this.petrinet.getArcs().length; i++) {

                // Arc Place to Transition
                if ((this.petrinet.getArcs()[i].getTargetT() !== undefined)
                        && (this.petrinet.getArcs()[i].getTargetT() === transition)) {
                    if ((this.petrinet.getArcs()[i].getSourceP().getCurrentTokenNumber()
                            - this.petrinet.getArcs()[i].getWeight()) < 0) {
                        return false;
                    }
                    this.removeMultipleTokens(this.petrinet.getArcs()[i].getWeight(),
                            this.petrinet.getArcs()[i].getSourceP(), tokens);
                }

                // Arc Transition to Place
                if ((this.petrinet.getArcs()[i].getSourceT() !== undefined)
                        && (this.petrinet.getArcs()[i].getSourceT() === transition)) {
                    const cTok = this.petrinet.getArcs()[i].getTargetP().getCurrentTokenNumber();
                    const wTrans = this.petrinet.getArcs()[i].getWeight();
                    if ((cTok + wTrans) > (this.petrinet.getArcs()[i].getTargetP().getMaxCapacity())) {
                        return false;
                    }
                    this.addMultipleTokens(transition,
                            this.petrinet.getArcs()[i].getTargetP(),
                            this.petrinet.getArcs()[i].getWeight(), tokens);
                }
            }
        } else {
            for (let i = this.petrinet.getArcs().length - 1; i >= 0; i--) {

                // Arc Place to Transition
                if ((this.petrinet.getArcs()[i].getTargetT() !== undefined)
                        && (this.petrinet.getArcs()[i].getTargetT() === transition)) {
                    this.addMultipleTokens(transition, this.petrinet.getArcs()[i].getSourceP(),
                            this.petrinet.getArcs()[i].getWeight(), tokens);
                }

                // Arc Transition to Places
                if ((this.petrinet.getArcs()[i].getSourceT() !== undefined)
                        && (this.petrinet.getArcs()[i].getSourceT() === transition)) {
                    this.removeMultipleTokens(this.petrinet.getArcs()[i].getWeight(),
                            this.petrinet.getArcs()[i].getTargetP(), tokens);
                }
            }
        }
        return true;
    }

	public getTransition(): TransitionState {
        return this.transition;
    }

    /**
     * Will unset n tokens from a place
     * 
     * @param n,      the number of tokens to remove
     * @param place,  the place being changed
     * @param tokens, the list of existing tokens
     */
	private removeMultipleTokens(n: number, place: PlaceState, tokens: Array<TokenState>): void {
        let k = 0;
        for (let i = tokens.length - 1; i >= 0; i--) {
            if (tokens[i].getPosition() === place) {
                tokens[i].unSet();
                k++;
            }
            if (k === n) {
                return;
            }
        }
    }

    /**
     * Add a token to a place
     * 
     * @param token, the token to set
     * @param place, the place to set the token to
     * @return the token
     */
	private addToken(token: TokenState, place: PlaceState): TokenState {
        token.set(place);
        return token;
    }

/**
     * Add n tokens to a place from a transition
     * 
     * @param transition, the transition the new tokens are from
     * @param place,      the place that is getting new tokens
     * @param n,          the number of tokens to add
     * @param tokens
     */
private addMultipleTokens(transition: TransitionState | null, place: PlaceState, n: number, tokens: Array<TokenState>): void {
  if (transition === null) {
    for (let i = 0; i < n; i++) {
      tokens.push(this.addToken(new TokenState(this.petrinet, place), place));
    }
    return;
  }
  for (let i = 0; i < n; i++) {
    tokens.push(new TokenState(this.petrinet, place, transition));
  }
}
}