import { LRPServer } from './server/server';

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

  try {
    program.parse(process.argv);
  } catch (err) {
    console.log(`${err}`);
  }
}

main();