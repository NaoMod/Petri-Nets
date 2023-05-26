import { LRPServer } from './server/server';


export async function main(port?: number) {
  const server: LRPServer = new LRPServer();
  server.start(port);

  //wait for server to start
  await new Promise<void>(resolve => setTimeout(() => {
    resolve()
  }, 2000));
}

main();
