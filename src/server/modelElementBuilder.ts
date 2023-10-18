import { AstNode, Reference } from "langium";
import { Edge, PetriNet, Place, Transition } from "src/generated/ast";
import { PetriNetState, PlaceState, TokenState, TransitionState } from "src/runtimeState";
import { IDRegistry } from "./idRegistry";
import { Location, ModelElement } from "./lrp";

/**
 * Builds model elements that can be communicated through LRP from elements of
 * either the AST or the runtime state.
 */
export class ModelElementBuilder {
    constructor(private registry: IDRegistry) { }

    public fromPetriNet(petrinet: PetriNet): ModelElement {
        const modelPlaces: ModelElement[] = [];
        for (const place of petrinet.places) {
            modelPlaces.push(this.fromPlace(place));
        }

        const modelTransitions: ModelElement[] = [];
        for (const transition of petrinet.transitions) {
            modelTransitions.push(this.fromTransition(transition));
        }

        return {
            id: this.registry.getOrCreateASTId(petrinet),
            type: petrinet.$type,
            children: {
                'places': modelPlaces,
                'transitions': modelTransitions
            },
            refs: {},
            attributes: {
                name: petrinet.name
            }
        };
    }

    public fromPlace(place: Place): ModelElement {
        return {
            id: this.registry.getOrCreateASTId(place),
            type: place.$type,
            children: {},
            refs: {},
            attributes: {
                placeName: place.name,
                placeCapacity: place.maxCapacity,
                placeInitTokenNumber: place.initialTokenNumber
            },
            location: this.getLocation(place)
        };
    }

    public fromTransition(transition: Transition): ModelElement {
        const sourceEdges: ModelElement[] = [];
        for (const source of transition.sources) {
            sourceEdges.push(this.fromEdge(source));
        }

        const destinationEdges: ModelElement[] = [];
        for (let destination of transition.destinations) {
            destinationEdges.push(this.fromEdge(destination));
        }

        return {
            id: this.registry.getOrCreateASTId(transition),
            type: transition.$type,
            children: {
                sources: sourceEdges,
                destinations: destinationEdges
            },
            refs: {},
            attributes: {
                transitionName: transition.name
            },
            location: this.getLocation(transition)
        };
    }

    public fromEdge(edge: Edge): ModelElement {
        return {
            id: this.registry.getOrCreateASTId(edge),
            type: edge.$type,
            children: {},
            refs: {
                place: this.registry.getOrCreateASTId(this.getReferenceTarget(edge.place))
            },
            attributes: {
                weight: edge.weight
            }
        };
    }

    public fromPetriNetState(petriNetState: PetriNetState): ModelElement {
        const places: ModelElement[] = [];
        for (const placeState of petriNetState.placeStates) {
            places.push(this.fromPlaceState(placeState));
        }

        const transitions: ModelElement[] = [];
        for (const transitionState of petriNetState.transitionStates) {
            transitions.push(this.fromTransitionState(transitionState));
        }

        return {
            id: this.registry.getOrCreateRuntimeId(petriNetState),
            type: 'PetriNetState',
            children: {
                placesState: places,
                transitionsState: transitions
            },
            refs: {
                petrinet: this.registry.getOrCreateASTId(petriNetState.petrinet)
            },
            attributes: {}
        };
    }

    public fromTransitionState(transitionState: TransitionState): ModelElement {
        return {
            id: this.registry.getOrCreateRuntimeId(transitionState),
            type: 'TransitionState',
            children: {},
            refs: {
                transition: this.registry.getOrCreateASTId(transitionState.transition)
            },
            attributes: {
                isTriggerable: transitionState.computeTriggerable()
            }
        };
    }

    public fromPlaceState(placeState: PlaceState): ModelElement {
        const tokens: ModelElement[] = [];
        for (const token of placeState.tokens) {
            tokens.push(this.fromTokenState(token));
        }

        return {
            id: this.registry.getOrCreateRuntimeId(placeState),
            type: 'PlaceState',
            children: {
                tokens: tokens
            },
            refs: {
                place: this.registry.getOrCreateASTId(placeState.place)
            },
            attributes: {}
        };
    }

    public fromTokenState(token: TokenState): ModelElement {
        const source: Transition | undefined = token.source;

        return {
            id: this.registry.getOrCreateRuntimeId(token),
            type: 'TokenState',
            children: {},
            refs: source ?
                {
                    source: this.registry.getOrCreateASTId(source)
                } :
                {},
            attributes: {}
        };
    }

    private getLocation(node: AstNode): Location {
        if (!node.$cstNode) throw new Error('Location expected.');

        return {
            line: node.$cstNode.range.start.line + 1,
            column: node.$cstNode.range.start.character,
            endLine: node.$cstNode.range.end.line + 1,
            endColumn: node.$cstNode.range.end.character
        };
    }

    private getReferenceTarget<T extends AstNode>(ref: Reference<T>): T {
        const target: T | undefined = ref.ref;
        if (!target) throw new Error('Undefined reference.');

        return target;
    }
}