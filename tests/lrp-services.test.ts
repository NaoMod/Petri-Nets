import { NodeFileSystem } from 'langium/node';
import * as path from 'path';
import { PetriNet } from '../src/generated/ast';
import { extractAstNode } from '../src/parse-util';
import { PetriNetServices, createPetriNetServices } from '../src/petri-net-module';
import { PetriNetsLRPServices } from '../src/server/lrp-services';
import { PetriNetState } from '../src/runtimeState';

let lrpServices: PetriNetsLRPServices = new PetriNetsLRPServices();
let fileName: string;
let services: PetriNetServices;

declare function fail(error?: any): never;

/*
function fail(message?: string) {
    if (message) throw new Error(message);
    throw new Error();
}*/

beforeEach(() => {
    lrpServices = new PetriNetsLRPServices();
    const directoryPath = path.join(__dirname, '../examples');
    fileName = directoryPath + "/test.PetriNet";
    services = createPetriNetServices(NodeFileSystem).PetriNet;
})

test('Parsing method test', () => {
    expect(async () => {
        const EXPECTED_PETRI_NET = await extractAstNode<PetriNet>(fileName, services);

        await lrpServices.parse({ sourceFile: fileName });

        const TESTED_PETRI_NET = lrpServices.petrinets.get(fileName);

        if (!TESTED_PETRI_NET || !EXPECTED_PETRI_NET) throw new Error();
        else {
            if (TESTED_PETRI_NET.name != EXPECTED_PETRI_NET.name) throw new Error();
            for (let i = 0; i < TESTED_PETRI_NET.places.length; i++) {
                if (TESTED_PETRI_NET.places[i] != EXPECTED_PETRI_NET.places[i]) throw new Error();
            }
            for (let i = 0; i < TESTED_PETRI_NET.transitions.length; i++) {
                if (TESTED_PETRI_NET.transitions[i] != EXPECTED_PETRI_NET.transitions[i]) throw new Error();
            }
        }
    }).not.toThrow();
})

test('Initial Execution method test', () => {
    expect(() => {
        lrpServices.parse({ sourceFile: fileName });
        let petrinet = lrpServices.petrinets.get(fileName);
        lrpServices.initExecution({ sourceFile: fileName });
        const TESTED_PETRI_NET_STATE = lrpServices.petrinetsState.get(fileName);
        if (!petrinet) throw new Error();
        const EXPECTED_PETRI_NET_STATE = new PetriNetState(petrinet);

        if (!TESTED_PETRI_NET_STATE || !EXPECTED_PETRI_NET_STATE) throw new Error();
        else {
            if (TESTED_PETRI_NET_STATE.getPetriNet().name != EXPECTED_PETRI_NET_STATE.getPetriNet().name) throw new Error();
            for (let i = 0; i < EXPECTED_PETRI_NET_STATE.getPlaces().length; i++) {
                if (TESTED_PETRI_NET_STATE.getPlaces()[i].getMaxCapacity() != EXPECTED_PETRI_NET_STATE.getPlaces()[i].getMaxCapacity()) throw new Error();
                if (TESTED_PETRI_NET_STATE.getPlaces()[i].getCurrentTokenNumber() != EXPECTED_PETRI_NET_STATE.getPlaces()[i].getCurrentTokenNumber()) throw new Error();
            }
            for (let i = 0; i < EXPECTED_PETRI_NET_STATE.getTransitions().length; i++) {
                if (TESTED_PETRI_NET_STATE.getTransitions()[i].getTransition() != EXPECTED_PETRI_NET_STATE.getTransitions()[i].getTransition()) throw new Error();
            }
        }
    }).not.toThrow();
})

/*
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