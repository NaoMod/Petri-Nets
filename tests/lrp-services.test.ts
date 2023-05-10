import { extractAstNode } from '../src/parse-util';
import { PetriNet } from '../src/generated/ast';
import { PetriNetState } from "../src/runtimeState";
import { createPetriNetServices } from '../src/petri-net-module';
import { NodeFileSystem } from 'langium/node';
import { PetriNetsLRPServices } from '../src/server/lrp-services';


let lrpServices = new PetriNetsLRPServices();


test('test', async () => {
    expect(true).toBe(true);
})

//beforeEach(async() => {

//})

test('Parsing method test', async () => {
    const path = require('path');
    const directoryPath = path.join(__dirname, '../examples');
    const fileName = directoryPath + "/test.PetriNet";
    const services = createPetriNetServices(NodeFileSystem).PetriNet;
    let petrinet = await extractAstNode<PetriNet>(fileName, services);
    await lrpServices.parse({ sourceFile: fileName })
    expect(lrpServices.petrinets.get(fileName)).toBe(petrinet);
})

test('Initial Execution method test', async () => {
    const path = require('path');
    const directoryPath = path.join(__dirname, '../examples');
    const fileName = directoryPath + "/test.PetriNet";
    lrpServices.parse({ sourceFile: fileName });
    let petrinet = lrpServices.petrinets.get(fileName);
    lrpServices.initExecution({ sourceFile: fileName });
    const petrinetState = lrpServices.petrinetsState.get(fileName);
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
    expect(lrpServices.petrinetsState.get(fileName)).toBe(petrinetState.trigger());
})