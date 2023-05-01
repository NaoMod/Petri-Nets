import { CheckBreakpointArguments, CheckBreakpointResponse, GetBreakpointTypesResponse, GetRuntimeStateArguments, InitArguments, InitResponse, ParseArguments, ParseResponse, LRPServices, StepArguments, StepResponse } from "./lrp";

//TODO: Implement LRP services, except for getBreakpointTypes and checkBreakpoint
export class PetriNetsLRPServices implements LRPServices {
    parse(args: ParseArguments): ParseResponse {
        throw new Error("Method not implemented.");
    }
    initExecution(args: InitArguments): InitResponse {
        throw new Error("Method not implemented.");
    }
    getRuntimeState(args: GetRuntimeStateArguments): GetRuntimeStateArguments {
        throw new Error("Method not implemented.");
    }
    nextStep(args: StepArguments): StepResponse {
        throw new Error("Method not implemented.");
    }
    getBreakpointTypes(): GetBreakpointTypesResponse {
        throw new Error("Method not implemented.");
    }
    checkBreakpoint(args: CheckBreakpointArguments): CheckBreakpointResponse {
        throw new Error("Method not implemented.");
    }
}