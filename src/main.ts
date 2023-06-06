import path from 'path';
import { LRPServer } from './server/server';
import { generatePetriNetFile } from './generators/file-PetriNet-generator';


export default async function main(port?: number) {
  const { Command } = require('commander');
  const program = new Command();

  program.command('run')
    .description('Run a server to specific port')
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
      console.log(options.places, options.placesMax, typeof options.placesMinMax);
      const generatedDirectoryPath = path.join(__dirname, '../examples/generated');
      if (options.places)
        generatePetriNetFile(generatedDirectoryPath + "/specificNumberPlacesGenerated.PetriNet", generatedDirectoryPath, undefined, options.places);
      else if (options.placesMax)
        generatePetriNetFile(generatedDirectoryPath + "/randomMaxNumberPlacesGenerated.PetriNet", generatedDirectoryPath, undefined, undefined, options.placesMax);
      else if (options.placesMinMax) {
        let secondNumber: boolean = false;
        let minNumber: string = '';
        let maxNumber: string = '';
        for (let i = 0; i < options.placesMinMax.length; i++) {
          if (options.placesMinMax[i] == ':') {
            secondNumber = true;
            i++;
          }
          if (!secondNumber)
            minNumber = minNumber + options.placesMinMax[i];
          else
            maxNumber = maxNumber + options.placesMinMax[i];
        }
        generatePetriNetFile(generatedDirectoryPath + "/randomMinMaxNumberPlacesGenerated.PetriNet", generatedDirectoryPath, undefined, undefined, Number(maxNumber), Number(minNumber));
      }
      else
        generatePetriNetFile(generatedDirectoryPath + "/randomGenerated.PetriNet", generatedDirectoryPath);
    });

  program.parse(process.argv);
}

main();
