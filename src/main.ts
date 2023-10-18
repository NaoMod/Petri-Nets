import path from 'path';
import { LRPServer } from './server/server';
import { generatePetriNetFile } from './petrinet-generator';


export default async function main() {
  const { Command } = require('commander');
  const program = new Command();

  program.command('run')
    .description('Run a server at a specific port')
    .argument('<number>', 'port')
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
    .option('-p, --places <number>[:<number>]', 'Generate a .PetriNet file with a specific number of places or with a random number of places between a min and a max')
    .action((options: any) => {
      const generatedDirectoryPath = path.join(__dirname, '../examples/generated');

      if (options.places) {
        let secondNumber: boolean = false;
        let minNumber: string = '0';
        let maxNumber: string = '0';
        for (let i = 0; i < options.places.length; i++) {
          if (options.places[i] == ':') {
            if (i == options.places.length - 1)
              throw Error('Incorrect command');
            secondNumber = true;
            i++;
          }
          if (!secondNumber)
            minNumber = minNumber + options.places[i];
          else
            maxNumber = maxNumber + options.places[i];
        }
        if (Number(maxNumber) == 0)
          generatePetriNetFile(generatedDirectoryPath + "/specificNumberPlacesGenerated.PetriNet", generatedDirectoryPath, undefined, Number(minNumber));
        else if (Number(minNumber) > Number(maxNumber))
          throw Error('Maximum must be greater than minimum');
        else
          generatePetriNetFile(generatedDirectoryPath + "/randomMinMaxNumberPlacesGenerated.PetriNet", generatedDirectoryPath, undefined, undefined, Number(minNumber), Number(maxNumber));
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
