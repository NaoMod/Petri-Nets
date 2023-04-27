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
    console.log(filesConst);
    client.request(
        'execute', filesConst, (err, error, result) => {
            if (error) throw new Error(error?.message);
            if (err) throw new Error(err?.message);

            console.log(`PetriNet: ${result}`);
        });
    console.log("Après request");
}

export function makeMockRequest(client: Client): void {
    const path = require('path');
    const fs = require('fs');
    const directoryPath = path.join(__dirname, '../../examples');
    fs.readdir(directoryPath, function (err: Error | null | undefined, files: Array<string>, client: Client) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
            // Do whatever you want to do with the file
            let filePath = directoryPath + "/" + file;
            linkFile(filePath);
        });
        requestClient(serverClient);
    });
    serverClient = client;
}
