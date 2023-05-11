import { NodeFileSystem } from 'langium/node';
import { PetriNet } from '../src/generated/ast';
import { extractAstNode } from '../src/parse-util';
import { createPetriNetServices } from '../src/petri-net-module';
import { PetriNetsLRPServices } from '../src/server/lrp-services';
import * as path from 'path';


let lrpServices = new PetriNetsLRPServices();


test('test', async () => {
    expect(true).toBe(true);
})

test('Parsing method test', async () => {
    const EXPECTED_PETRI_NET_NAME: string = "test";

    const directoryPath = path.join(__dirname, '../examples');
    const fileName = directoryPath + "/test.PetriNet";
    const services = createPetriNetServices(NodeFileSystem).PetriNet;
    let petrinet = await extractAstNode<PetriNet>(fileName, services);
    await lrpServices.parse({ sourceFile: fileName });

    expect(petrinet.name).toBe(EXPECTED_PETRI_NET_NAME);
   /*  expect(lrpServices.petrinets.get(fileName)).toBe(0.); */
})

/* test('Initial Execution method test', async () => {
    const path = require('path');
    const directoryPath = path.join(__dirname, '../examples');
    const fileName = directoryPath + "/test.PetriNet";
    lrpServices.parse({ sourceFile: fileName });
    let petrinet = lrpServices.petrinets.get(fileName);
    lrpServices.initExecution({ sourceFile: fileName });
    const petrinetState = lrpServices.petrinetsState.get(fileName);

    if (!petrinet || !petrinetState) fail();

    expect(petrinetState).toBe(new PetriNetState(petrinet, petrinetState.getMaxIterations()));
})

test('Next Step method test', async () => {
    const path = require('path');
    const directoryPath = path.join(__dirname, '../examples');
    const fileName = directoryPath + "/test.PetriNet";
    lrpServices.parse({ sourceFile: fileName });
    lrpServices.initExecution({ sourceFile: fileName });
    let petrinetState = lrpServices.petrinetsState.get(fileName);
    lrpServices.nextStep({ sourceFile: fileName });

    if (!petrinetState) fail();
    expect(lrpServices.petrinetsState.get(fileName)).toBe(petrinetState.trigger());
}) */