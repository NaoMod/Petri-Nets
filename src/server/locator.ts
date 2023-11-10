import { AstNode } from "langium";
import { Location } from "./lrp";

export class AstNodeLocator {
    static getLocation(node: AstNode): Location | undefined {
        if (!node.$cstNode) return undefined;

        return {
            line: node.$cstNode.range.start.line + 1,
            column: node.$cstNode.range.start.character,
            endLine: node.$cstNode.range.end.line + 1,
            endColumn: node.$cstNode.range.end.character +1
        };
    }
}