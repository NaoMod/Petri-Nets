import path from 'path';
import { LRPServer } from './server/server';
import { generatePetriNetFile } from './generators/file-PetriNet-generator';


export default async function main(port?: number) {
  const { Command } = require('commander');
  const program = new Command();

  program.command('run')
    .description('Run a server to a specific port')
    .argument('<number>', 'port number')
    .action(async (port: number) => {
      const server = new LRPServer();
      server.start(port);

      //wait for server to start
      await new Promise<void>(resolve => setTimeout(() => {
        resolve()
      }, 2000));
    });

  program.command('generate')
    .description('Generate a .PetriNet file')
    .option('-p, --places <integer>', 'Generate a .PetriNet file with a specific number of places')
    .option('-pM, --placesMax <integer>', 'Generate a .PetriNet file with a random number of places')
    .option('-pmM, --placesMinMax <integer>:<integer>', 'Generate a .PetriNet file with a random number of places between min and max')
    .action((options: any) => {
      const generatedDirectoryPath = path.join(__dirname, '../examples/generated');

      if (options.places) {
        for (let i = 0; i < options.places.length; i++) {
          if (options.places[i] == ':') {
            throw Error('Incorrect command');
          }
        }
        generatePetriNetFile(generatedDirectoryPath + "/specificNumberPlacesGenerated.PetriNet", generatedDirectoryPath, undefined, Number(options.places));
      }
      if (options.placesMax) {
        for (let i = 0; i < options.placesMax.length; i++) {
          if (options.placesMax[i] == ':') {
            throw Error('Incorrect command');
          }
        }
        generatePetriNetFile(generatedDirectoryPath + "/randomMaxNumberPlacesGenerated.PetriNet", generatedDirectoryPath, undefined, undefined, Number(options.placesMax));
      }
      if (options.placesMinMax) {
        let secondNumber: boolean = false;
        let minNumber: string = '';
        let maxNumber: string = '';
        for (let i = 0; i < options.placesMinMax.length; i++) {
          if (options.placesMinMax[i] == ':') {
            if (i == options.placesMinMax.length - 1)
              throw Error('Incorrect command');
            secondNumber = true;
            i++;
          }
          if (!secondNumber)
            minNumber = minNumber + options.placesMinMax[i];
          else
            maxNumber = maxNumber + options.placesMinMax[i];
        }
        if (Number(minNumber) > Number(maxNumber))
          throw Error('Maximum must be greater than minimum');
        generatePetriNetFile(generatedDirectoryPath + "/randomMinMaxNumberPlacesGenerated.PetriNet", generatedDirectoryPath, undefined, undefined, Number(maxNumber), Number(minNumber));
      }
      else
        generatePetriNetFile(generatedDirectoryPath + "/randomGenerated.PetriNet", generatedDirectoryPath);
    });

  try {
    program.parse(process.argv);
  } catch (err) {
    console.log(`${err}`);
  }
}

main();
