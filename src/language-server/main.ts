import { extractAstNode } from '../cli/cli-util';
import { PetriNet } from './generated/ast';
import { createPetriNetServices } from './petri-net-module';
import { PetriNetState } from './runtimeState';
import { NodeFileSystem } from 'langium/node';
import { startServer } from './server';
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
  let petrinetState: PetriNetState = new PetriNetState(await petrinet, 300);

  console.log("------------------------------------------------------------------------");

  console.log("Petri Net : " + petrinetState.getPetriNet().name);

  console.log("------------------------------------------------------------------------");

  console.log("1 : Base");
  for (let place of petrinetState.getPlaces()) {
    console.log();
    console.log("    Tokens in place " + place.getPlace().name + " : ");
    for (let tok of place.getEveryTokens()) {
      console.log(tok.getSource());
    }
    console.log();
  }

  console.log("------------------------------------------------------------------------");

  console.log("2 : Trigger");
  petrinetState.trigger();
  for (let place of petrinetState.getPlaces()) {
    console.log();
    console.log("    Tokens in place " + place.getPlace().name + " : ");
    for (let tok of place.getEveryTokens()) {
      console.log(tok.getSource());
    }
    console.log();
  }

  console.log("------------------------------------------------------------------------");

  console.log("3 : Trigger");
  petrinetState.trigger();
  for (let place of petrinetState.getPlaces()) {
    console.log();
    console.log("    Tokens in place " + place.getPlace().name + " : ");
    for (let tok of place.getEveryTokens()) {
      console.log(tok.getSource());
    }
    console.log();
  }

  console.log("------------------------------------------------------------------------");
}

main();
