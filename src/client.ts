import { Client } from 'jayson';

export function createClient(port: number): Client {
    return Client.tcp({
        port: port
    });
}

// function requestParseClient(client: Client, fileName: string) {
//     client.request(
//         'parse', { sourceFile: fileName }
//     );
// }

// function requestInitExecutionClient(client: Client, fileName: string) {
//     client.request(
//         'initExecution', { sourceFile: fileName }
//     );
// }

// function requestGetRuntimeStateClient(client: Client, fileName: string) {
//     client.request(
//         'getRuntimeState', { sourceFile: fileName }
//     );
// }

// function requestNextStepClient(client: Client, fileName: string) {
//     client.request(
//         'nextStep', { sourceFile: fileName }
//     );
// }

// function requestGetBreakpointTypesClient(client: Client, fileName: string) {
//     client.request(
//         'getBreakpointTypes', { sourceFile: fileName }
//     );
// }
// function requestCheckBreakpointClient(client: Client, fileName: string) {
//     client.request(
//         'checkBreakpoint', { sourceFile: fileName }
//     );
// }