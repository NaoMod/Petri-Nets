import { extractAstNode } from './parse-util';
import { PetriNet } from './generated/ast';
import { createPetriNetServices } from './petri-net-module';
import { PetriNetState } from './runtimeState';
import { NodeFileSystem } from 'langium/node';
import { startServer } from './server/server';
import { createClient, makeMockRequest } from './client';
import { Client } from 'jayson';

/* // Create a connection to the client
const connection = createConnection(ProposedFeatures.all);

// Inject the shared services and language-specific services
const { shared } = createPetriNetServices({ connection, ...NodeFileSystem });

// Start the language server with the shared services
startLanguageServer(shared); */

const PORT: number = 49152;

async function main() {
  startServer(PORT);

  //wait for server to start
  await new Promise<void>(resolve => setTimeout(() => {
    resolve()
  }, 2000));

  const client: Client = createClient(PORT);
  makeMockRequest(client);
}

/**
 * Will continue to trigger transitions until it's not possible anymore
 * 
 * @param petrinetState , the petrinet to evolve
 */
function completeEvolution(petrinetState: PetriNetState) {
  console.log("1 : Base");
  for (let place of petrinetState.getPlaces()) {
    console.log();
    console.log("    Tokens in place " + place.getPlace().name + " : " + place.getCurrentTokenNumber());
    console.log();
  }
  let i = 2;
  while (petrinetState.canEvolve()) {
    console.log("------------------------------------------------------------------------");

    console.log(i + " : Trigger");
    petrinetState.trigger();
    for (let place of petrinetState.getPlaces()) {
      console.log();
      console.log("    Tokens in place " + place.getPlace().name + " : " + place.getCurrentTokenNumber());
      console.log();
    }
    i++;
  }
}


async function parse(fileName: string) {
  const services = createPetriNetServices(NodeFileSystem).PetriNet;
  return await extractAstNode<PetriNet>(fileName, services);
}

/**
 * Will run the program with the informations of an existing file.
 * 
 * @param fileName, the name of the file to run
 */
export async function run(fileName: string): Promise<void> {

  const petrinet = parse(fileName);
  let petrinetState: PetriNetState = new PetriNetState(await petrinet, 50);

  console.log("------------------------------------------------------------------------");

  console.log("Petri Net : " + petrinetState.getPetriNet().name);

  console.log("------------------------------------------------------------------------");

  completeEvolution(petrinetState);
}

main();