import { Server } from 'jayson';
import { run } from './main';


export function startServer(port: number): void {
    const server: Server = new Server({
        'execute': execute
    });

    server.tcp().listen(port, 'localhost');
}

function execute(fileNames: string[], callback: any): void {
    if (fileNames.length == 0) throw new Error("No files in this folder.");
    for (let i = 0; i < fileNames.length; i++)
        callback(null, run(fileNames[i]));
}