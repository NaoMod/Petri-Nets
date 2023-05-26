const { Command } = require('commander');
const program = new Command();

program.command('run')
  .description('Run a server to specific port')
  .argument('<number>', 'port number')
  .action(async (port) => {
    // const server = new LRPServer();
    // server.start(port);

    // //wait for server to start
    // await new Promise(resolve => setTimeout(() => {
    //   resolve()
    // }, 2000));
    
    console.log(port, ' test run');
  });

program.parse(process.argv);