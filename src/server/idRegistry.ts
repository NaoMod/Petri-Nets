import { randomUUID } from "crypto";
import { AstNode } from "langium";

/**
 * Creates and stores IDs associated to elements fro mthe AST or runtime state.
 */
export class IDRegistry {
    private astIds: Map<AstNode, string>;
    private runtimeIds: Map<Object, string>;

    constructor() {
        this.astIds = new Map();
        this.runtimeIds = new Map();
    }

    public getOrCreateASTId(node: AstNode): string {
        if (!this.astIds.has(node)) this.astIds.set(node, randomUUID());

        return this.astIds.get(node)!;
    }

    public getOrCreateRuntimeId(object: Object): string {
        if (!this.runtimeIds.has(object)) this.runtimeIds.set(object, randomUUID());

        return this.runtimeIds.get(object)!;
    }

    public getASTId(node: AstNode): string | undefined {
        return this.astIds.get(node)!;
    }

    public clearRuntimeIds(): void {
        this.runtimeIds.clear();
    }
}