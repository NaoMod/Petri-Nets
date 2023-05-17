import { NodeFileSystem } from 'langium/node';
import * as path from 'path';
import { PetriNet } from '../src/generated/ast';
import { extractAstNode } from '../src/parse-util';
import { createPetriNetServices } from '../src/petri-net-module';
import { generatePetriNetFile } from './file-PetriNet-generator';

beforeEach(async () => {
    const directoryPath = path.join(__dirname, '../examples');
    const fileName = directoryPath + "/test.PetriNet";
    const services = createPetriNetServices(NodeFileSystem).PetriNet;
    const EXPECTED_PETRI_NET = await extractAstNode<PetriNet>(fileName, services);
    generatePetriNetFile(EXPECTED_PETRI_NET, directoryPath + "/generatedTest.PetriNet", path.join(__dirname, '../generators'));
}

)
test('Generating a file correctly', async () => {
    const directoryPath = path.join(__dirname, '../examples');
    const fileName = directoryPath + "/test.PetriNet";
    const services = createPetriNetServices(NodeFileSystem).PetriNet;
    const EXPECTED_PETRI_NET = await extractAstNode<PetriNet>(fileName, services);

    const testDirectoryPath = path.join(__dirname, '../generators');
    const TESTED_PETRI_NET = await extractAstNode<PetriNet>(testDirectoryPath + "/generatedTest.PetriNet", services);

    expect(async () => {
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