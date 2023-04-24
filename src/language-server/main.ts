import { EmptyFileSystem, Reference, startLanguageServer, toString } from 'langium';
import { NodeFileSystem } from 'langium/node';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { createPetriNetServices } from './petri-net-module';
import { PetriNet, isEvolution, isArcPtT, Place, Transition } from './generated/ast';
import { PetriNetState, TokenState, ArcPtTState, ArcTtPState, PlaceState, TransitionState, EvolutionState, ResetState, Trigger } from './runtimeState';
import { extractDocument } from '../cli/cli-util';
import { parseHelper } from 'langium/test';

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);

// Inject the shared services and language-specific services
const { shared } = createPetriNetServices({ connection, ...NodeFileSystem });

// Start the language server with the shared services
startLanguageServer(shared);




function findPlaceFromReference(petrinet: PetriNet, refPlace: Reference<Place>, petrinetState: PetriNetState): PlaceState {
  for(let place of petrinet.places) {
    if(place === refPlace.ref) return new PlaceState(petrinetState, place.name, place.maxCapacity, place.initialTokenNumber);
  }
  return new PlaceState(petrinetState, "null", 0);
}

function findTransitionFromReference(petrinet: PetriNet, refTransition: Reference<Transition>, petrinetState: PetriNetState): TransitionState {
  for(let transition of petrinet.transitions) {
    if(transition === refTransition.ref) return new TransitionState(petrinetState, transition.name);
  }
  return new TransitionState(petrinetState, "null");
}

/**
 * Will continue to trigger transitions until there are no doable transitions or
 * that the max iteration is reached
 * 
 * @param i is the number of times the petri net has been evolving
 */
function EvolveIt(petrinetState:PetriNetState, i: number, tokens: Array<TokenState>, everyTriggers: Array<Trigger>): number {
  for (let transition of petrinetState.getTransitions()) {
    if (petrinetState.transitionDoAble(transition))
      everyTriggers.push(new Trigger(petrinetState, true, transition, tokens));
  }
  return i + 1;
}

/**
 * Verifies that the petri net can evolve
 * 
 * @param i is the number of times the petri net has been evolving
*/
function ContinueEvolving(petrinetState: PetriNetState, i: number, tokens: Array<TokenState>, everyTriggers: Array<Trigger>): void {
  if ((petrinetState.canEvolve()) || (i < petrinetState.getMaxIterations()))
    EvolveIt(petrinetState, i, tokens, everyTriggers);
}

  /**
   * Will continue to cancel triggers of an Evolution
   * 
   * @param n is the number of events contained in the petrinet
   */
  function continueResetting(petrinetState: PetriNetState, sizeEvents: number, tokens: Array<TokenState>): void {
    if (sizeEvents > 0) {
        let currentEvent = sizeEvents - 1;
            if (petrinetState.getEvents()[sizeEvents-1] instanceof EvolutionState) {
                while (petrinetState.getEvents()[currentEvent].getEveryTriggers().length !== 0) {
                    new Trigger(petrinetState, false, petrinetState.getEvents()[currentEvent].getEveryTriggers()[0].getTransition(), tokens);
                    petrinetState.getEvents()[currentEvent].removeTrigger(
                            petrinetState.getEvents()[currentEvent].getEveryTriggers()[0]);
                }
            }
        petrinetState.removeEvent(petrinetState.getEvents()[currentEvent]);
      if (petrinetState.getEvents()[sizeEvents-1] instanceof ResetState) 
        petrinetState.removeEvent(petrinetState.getEvents()[currentEvent]);
      continueResetting(petrinetState, petrinetState.getEvents().length, tokens);
    }
  }

/**
 * Will run the program with the informations of an existing file.
 * 
 * @param fileName, the name of the file to run
 */
async function run(fileName: string): Promise<void> {

  const services = createPetriNetServices(EmptyFileSystem).PetriNet;
  const document = await extractDocument(fileName, services);
  const parse = parseHelper<PetriNet>(services);
  const ast = await parse(toString(document));
  const petrinet = ast.parseResult.value;

  let petrinetState: PetriNetState = new PetriNetState(petrinet.name, 300);

// Creation of the arcs in PetriNetState
for(let arc of petrinet.arcs) {
  console.log(arc.source.$refText);
    if(isArcPtT(arc)) {
        new ArcPtTState(petrinetState, arc.name, findPlaceFromReference(petrinet, arc.source, petrinetState), findTransitionFromReference(petrinet, arc.target, petrinetState), arc.weight);
    } else {
        new ArcTtPState(petrinetState, arc.name, findTransitionFromReference(petrinet, arc.source, petrinetState), findPlaceFromReference(petrinet, arc.target, petrinetState), arc.weight);
    }
}

// Creation of the places in PetriNetState
for(let place of petrinet.places) {
  if(!petrinetState.containsPlace(place.name))
    new PlaceState(petrinetState, place.name, place.maxCapacity, place.initialTokenNumber);
}

// Creation of the transitions in PetriNetState
for(let transition of petrinet.transitions) {
  if(!petrinetState.containsTransition(transition.name))
    new TransitionState(petrinetState, transition.name);
}


petrinetState.sortArc();

let moveableTokens: Array<TokenState> = [];
// Creation of the tokens in the correct places
for (let place of petrinetState.getPlaces()) {
  for (let i = 0; i < place.getCurrentTokenNumber(); i++) {
    moveableTokens.push(new TokenState(petrinetState, place));
  }
}
  
// Creation of the events AND tokens movements
  let triggers: Array<Trigger> = [];
    for(let event of petrinet.events) {
        if (isEvolution(event)) {
          ContinueEvolving(petrinetState, EvolveIt(petrinetState, 1, moveableTokens, triggers), moveableTokens, triggers);
          petrinetState.addEvent(new EvolutionState(petrinetState, moveableTokens, triggers));
        } else {
          continueResetting(petrinetState, petrinetState.getEvents().length, moveableTokens)
          petrinetState.addEvent(new ResetState(petrinetState, moveableTokens));
        }
    }



console.log("------------------------------------------------------------------------");

console.log("1 : Base");
console.log("events : " + petrinetState.getEvents());

for (let place of petrinetState.getPlaces()) {
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

new EvolutionState(petrinetState, moveableTokens);

console.log("2 : Evolution");
console.log("events : " + petrinetState.getEvents());

for (let place of petrinetState.getPlaces()) {
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

new ResetState(petrinetState, moveableTokens);
console.log("3 : Reset");
console.log("events : " + petrinetState.getEvents());

for (let place of petrinetState.getPlaces()) {
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
}


run("test.PetriNet"); //Need to be automatized so every file.PetriNet is runned

