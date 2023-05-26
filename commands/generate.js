// import {generatePetriNetFile} from '../src/generators/file-PetriNet-generator';
import { Command } from 'commander';
const generate = new Command();

generate.command('generate')
  .description('Generate a .PetriNet file')
  .option('-p, --places <integer>', 'Generate a .PetriNet file with a specific number of places')
  .action((options)=> {
    const limit = options.places ? true : undefined;
    // if(!limit){
    //   const genearatedDirectoryPath = path.join(__dirname, '../src/generators/generated');
    //   generatePetriNetFile(genearatedDirectoryPath + "/randomGenerated.PetriNet", genearatedDirectoryPath);
    // }   console.log(options.places,limit);
  });

generate.parse(process.argv);

const optionsGen = generate.opts();
if (optionsGen.places == undefined) console.log('no option');
else if (optionsGen.places == true) console.log('have option');
else console.log(`option is : ${optionsGen.places}`);