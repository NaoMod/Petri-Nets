import { NodeFileSystem } from 'langium/node';
import * as path from 'path';
import { PetriNet } from '../src/generated/ast';
import { extractAstNode } from '../src/parse-util';
import { createPetriNetServices } from '../src/petri-net-module';
import { PetriNetsLRPServices } from '../src/server/lrp-services';
import { PetriNetState } from '../src/runtimeState';

let lrpServices: PetriNetsLRPServices;
const directoryPath = path.join(__dirname, '../examples');
const fileName = directoryPath + "/test.PetriNet";
let services = createPetriNetServices(NodeFileSystem).PetriNet;

beforeEach(() => {
    lrpServices = new PetriNetsLRPServices();
})

test('Parsing method test', () => {
    expect(async () => {
        const EXPECTED_PETRI_NET = await extractAstNode<PetriNet>(fileName, services);

        await lrpServices.parse({ sourceFile: fileName });

        const TESTED_PETRI_NET: PetriNet | undefined = lrpServices.petrinets.get(fileName);

        if ((!TESTED_PETRI_NET) || (!EXPECTED_PETRI_NET)) throw new Error("A petri net is undefined in parsing test");
        else {
            if (TESTED_PETRI_NET.name != EXPECTED_PETRI_NET.name) throw new Error("Wrong petri net");
            for (let i = 0; i < TESTED_PETRI_NET.places.length; i++) {
                if (TESTED_PETRI_NET.places[i].name != EXPECTED_PETRI_NET.places[i].name) throw new Error("Wrong place");
            }
            for (let i = 0; i < TESTED_PETRI_NET.transitions.length; i++) {
                if (TESTED_PETRI_NET.transitions[i].name != EXPECTED_PETRI_NET.transitions[i].name) throw new Error("Wrong transition");
            }
        }
    }).not.toThrow();
})

test('Initial Execution method test', () => {
    expect(async () => {
        await lrpServices.parse({ sourceFile: fileName });
        let petrinet: PetriNet | undefined = lrpServices.petrinets.get(fileName);
        if (!petrinet) throw new Error("Petri net is undefined in init execution test");

        lrpServices.initExecution({ sourceFile: fileName });
        const TESTED_PETRI_NET_STATE = lrpServices.petrinetsState.get(fileName);
        const EXPECTED_PETRI_NET_STATE = new PetriNetState(petrinet);

        if (!TESTED_PETRI_NET_STATE || !EXPECTED_PETRI_NET_STATE) throw new Error("A petri net state is undefined in init execution test");
        else {
            if (TESTED_PETRI_NET_STATE.getPetriNet().name != EXPECTED_PETRI_NET_STATE.getPetriNet().name) throw new Error("Wrong petri net");
            for (let i = 0; i < EXPECTED_PETRI_NET_STATE.getPlaces().length; i++) {
                if (TESTED_PETRI_NET_STATE.getPlaces()[i].getMaxCapacity() != EXPECTED_PETRI_NET_STATE.getPlaces()[i].getMaxCapacity()) throw new Error("Wrong place's max capacity");
                if (TESTED_PETRI_NET_STATE.getPlaces()[i].getCurrentTokenNumber() != EXPECTED_PETRI_NET_STATE.getPlaces()[i].getCurrentTokenNumber()) throw new Error("Wrong place's current token number");
            }
            for (let i = 0; i < EXPECTED_PETRI_NET_STATE.getTransitions().length; i++) {
                if (TESTED_PETRI_NET_STATE.getTransitions()[i].getTransition() != EXPECTED_PETRI_NET_STATE.getTransitions()[i].getTransition()) throw new Error("Wrong transition");
            }
        }
    }).not.toThrow();
})


test('Next Step method test', () => {
    expect(async () => {
        await lrpServices.parse({ sourceFile: fileName });
        lrpServices.initExecution({ sourceFile: fileName });

        let EXPECTED_STATE: PetriNetState | undefined = lrpServices.petrinetsState.get(fileName);
        if (!EXPECTED_STATE) throw new Error();

        EXPECTED_STATE.trigger();

        lrpServices.nextStep({ sourceFile: fileName });
        const TESTED_STATE: PetriNetState | undefined = lrpServices.petrinetsState.get(fileName);

        if (!TESTED_STATE || !EXPECTED_STATE) throw new Error("A petri net state is undefined in next step test");
        else {
            if (TESTED_STATE.getPetriNet().name != EXPECTED_STATE.getPetriNet().name)
                throw new Error("Wrong petri net");
            for (let i = 0; i < EXPECTED_STATE.getPlaces().length; i++) {
                if (TESTED_STATE.getPlaces()[i].getMaxCapacity() != EXPECTED_STATE.getPlaces()[i].getMaxCapacity()) throw new Error("Wrong place's max capacity");
                if (TESTED_STATE.getPlaces()[i].getCurrentTokenNumber() != EXPECTED_STATE.getPlaces()[i].getCurrentTokenNumber()) throw new Error("Wrong place's current token number");
            }
            for (let i = 0; i < EXPECTED_STATE.getTransitions().length; i++) {
                if (TESTED_STATE.getTransitions()[i].getTransition() != EXPECTED_STATE.getTransitions()[i].getTransition()) throw new Error("Wrong transition");
            }
        }
    }).not.toThrow();
})