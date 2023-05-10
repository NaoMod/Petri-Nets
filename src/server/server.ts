import { Server } from 'jayson';
import { run } from '../main';

export function startServer(port: number): void {
    const server: Server = new Server({
        'execute': execute
    });

    server.tcp().listen(port, 'localhost');
}

function execute(fileNames: string[], callback: any): void {
    if (fileNames.length == 0) throw new Error("No files in this folder.");
    for (let fileName of fileNames) {
        callback(null, run(fileName));
    }
}