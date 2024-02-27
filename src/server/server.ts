import { Server } from 'jayson';
import { PetriNetsLRPServices } from './lrp-services';

/**
 * TCP server running at a given port and providing LRP services.
 */
export class LRPServer {
    private server: Server;

    constructor() {
        this.server = new Server({
            'parse': async function (args: any[], callback: Function) {
                callback(null, await PetriNetsLRPServices.parse(args[0]));
            },
            'initializeExecution': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.initializeExecution(args[0]));
            },
            'getRuntimeState': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.getRuntimeState(args[0]));
            },
            'getBreakpointTypes': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.getBreakpointTypes());
            },
            'checkBreakpoint': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.checkBreakpoint(args[0]));
            },
            'getAvailableSteps': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.getAvailableSteps(args[0]));
            },
            'enterCompositeStep': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.enterCompositeStep(args[0]));
            },
            'executeAtomicStep': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.executeAtomicStep(args[0]));
            },
            'getStepLocation': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.getStepLocation(args[0]));
            },
        });
    }

    public start(port?: number): void {
        if (!port)
            this.server.tcp().listen(49152, 'localhost');
        this.server.tcp().listen(port, 'localhost');
    }
}

