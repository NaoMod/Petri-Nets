import { LRPServer } from './server/server';


const PORT: number = 49152;

async function main() {
  const server: LRPServer = new LRPServer();
  server.start(PORT);

  //wait for server to start
  await new Promise<void>(resolve => setTimeout(() => {
    resolve()
  }, 2000));
}

main();
