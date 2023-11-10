import { Server } from 'jayson';
import { PetriNetsLRPServices } from './lrp-services';

/**
 * TCP server running at a given port and providing LRP services.
 */
export class LRPServer {
    private server: Server;

    constructor() {
        this.server = new Server({
            'initialize': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.initialize());
            },
            'parse': async function (args: any[], callback: Function) {
                callback(null, await PetriNetsLRPServices.parse(args[0]));
            },
            'initExecution': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.initExecution(args[0]));
            },
            'getRuntimeState': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.getRuntimeState(args[0]));
            },
            'executeStep': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.executeStep(args[0]));
            },
            'getBreakpointTypes': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.getBreakpointTypes());
            },
            'checkBreakpoint': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.checkBreakpoint(args[0]));
            },
            'getSteppingModes': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.getSteppingModes());
            },
            'getAvailableSteps': function (args: any[], callback: Function) {
                callback(null, PetriNetsLRPServices.getAvailableSteps(args[0]));
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

