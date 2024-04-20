import { AstNode } from "langium";
import { Location } from "./lrp";

/**
 * Handles the retrieval of information about the location of AST elements.
 */
export class AstNodeLocator {
    /**
     * Retrieves the location of an AST element.
     * 
     * @param node AST node to locate.
     * @returns The location of the AST node, or undefined if there is none.
     */
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