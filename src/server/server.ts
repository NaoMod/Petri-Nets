import { Server } from 'jayson';
import { PetriNetsLRPServices } from './lrp-services';

export class LRPServer {
    private server: Server;

    constructor() {
        this.server = new Server({
            'parse': async function (args: any[], callback: Function) {
                callback(null, await PetriNetsLRPServices.parse(args[0]));
            },
            'initExecution': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.initExecution(args[0]));
            },
            'getRuntimeState': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.getRuntimeState(args[0]));
            },
            'nextStep': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.nextStep(args[0]));
            },
            'getBreakpointTypes': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.getBreakpointTypes());
            },
            'checkBreakpoint': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.checkBreakpoint(args[0]));
            }
        });
    }

    start(port: number): void {
        this.server.tcp().listen(port, 'localhost');
    }
}

