import { Server } from 'jayson';
import { PetriNetsLRPServices } from './lrp-services';

export function startServer(port: number): void {
    const lrpServices: PetriNetsLRPServices = new PetriNetsLRPServices();
    const server: Server = new Server({
        'parse': lrpServices.parse,
        'initExecution': lrpServices.initExecution,
        'getRuntimeState': lrpServices.getRuntimeState,
        'nextStep': lrpServices.nextStep,
        'getBreakpointTypes': lrpServices.getBreakpointTypes,
        'checkBreakpoint': lrpServices.checkBreakpoint
    });
    server.tcp().listen(port, 'localhost');
}

