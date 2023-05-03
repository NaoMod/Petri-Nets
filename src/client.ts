import { Client } from 'jayson';

export function createClient(port: number): Client {
    return Client.tcp({
        port: port
    });
}

let serverClient: Client;

let filesConst: Array<string> = [];

function linkFile(fileName: string) {
    filesConst.push(fileName);
}

function requestClient(client: Client) {
    client.request(
        'execute', filesConst, (err, error, result) => {
            if (error) throw new Error(error?.message);
            if (err) throw new Error(err?.message);

            console.log(`PetriNet: ${result}`);
        });
}

export function makeMockRequest(client: Client): void {
    serverClient = client;
    const path = require('path');
    const fs = require('fs');
    const directoryPath = path.join(__dirname, '../examples');
    fs.readdir(directoryPath, function (err: Error | null | undefined, files: Array<string>, client: Client) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
            // Listing the path to the file in a global constant
            let filePath = directoryPath + "/" + file;
            linkFile(filePath);
        });
        requestClient(serverClient);
    });
}
