import { AstNode, Reference } from "langium";
import { Place } from "src/generated/ast";
import { Step } from "./steps";

abstract class UndefinedElementError<T> implements Error {
    constructor(public name: string, public message: string, public element: T) { }
}

export class UndefinedASTError extends UndefinedElementError<string> {
    constructor(sourceFile: string) {
        super('UndefinedASTError', `No AST defined for file '${sourceFile}'.`, sourceFile);
    }
}

export class UndefinedRuntimeStateError extends UndefinedElementError<string> {
    constructor(sourceFile: string) {
        super('UndefinedRuntimeStateError', `No runtime state defined for file '${sourceFile}'.`, sourceFile);
    }
}

export class UndefinedRegistryError extends UndefinedElementError<string> {
    constructor(sourceFile: string) {
        super('UndefinedRegistryError', `No registry defined for file '${sourceFile}'.`, sourceFile);
    }
}

export class UndefinedStepError extends UndefinedElementError<string> {
    constructor(stepId: string) {
        super('UndefinedStepError', `No step with id '${stepId}'.`, stepId);
    }
}

export class UndefinedBreakpointTypeError extends UndefinedElementError<string> {
    constructor(typeId: string) {
        super('UndefinedBreakpointTypeError', `No breakpoint type with id '${typeId}'.`, typeId);
    }
}

export class UndefinedReferenceError<T extends AstNode> extends UndefinedElementError<Reference<T>>{
    constructor(ref: Reference<T>) {
        super('UndefinedReferenceError', `Undefined reference for '${ref.$refText}'.`, ref);
    }
}

export class UndefinedStateError extends UndefinedElementError<Place> {
    constructor(place: Place) {
        super('UndefinedStateError', `Undefined state for Place '${place.name}'.`, place);
    }
}

export class StepNotAtomicError implements Error {
    name: string;
    message: string;
    step: Step;

    constructor(step: Step) {
        this.name = 'StepNotAtomicError';
        this.message = `Step '${step.name}' is not atomic.`
        this.step = step;
    }
}