import fs from 'fs';
import { expandToNode as toNode, joinToNode as join, Generated, toString } from 'langium';
import path from 'path';
import { Edge, PetriNet, Place, Transition } from './generated/ast';
import { extractDestinationAndName } from './parse-util';

let specificNbPlaces = 0;

let nbMaxTransitions = 50;
let nbMaxPlaces = 50;

let nbMinTransitions = 0;
let nbMinPlaces = 0;

let nTransition = 0;
let nPlace = 0;

/**
 * Generate a random integer in [0; max[
 * @param max, the upper limit
 * @returns, a random integer between 0 and max-1
 */
function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}

export function generatePetriNetFile(filePath: string, destination: string | undefined, petrinet?: PetriNet, specificNumberPlaces?: number, minPlacesLimit?: number, maxPlacesLimit?: number): string {
    const data = extractDestinationAndName(filePath, destination);
    let ctx = <GeneratorContext>{
        fileName: `${data.name}.PetriNet`,
        destination: data.destination,
    };
    if (petrinet) {
        ctx = <GeneratorContext>{
            petrinet,
            fileName: `${data.name}.PetriNet`,
            destination: data.destination,
        };
    }
    if (specificNumberPlaces) specificNbPlaces = specificNumberPlaces;
    if (maxPlacesLimit) nbMaxPlaces = maxPlacesLimit;
    if (minPlacesLimit) nbMinPlaces = minPlacesLimit;
    return generate(ctx);
}

interface GeneratorContext {
    petrinet?: PetriNet;
    fileName: string;
    destination: string;
}

function generate(ctx: GeneratorContext): string {
    const fileNode = generatePetriNetContent(ctx);

    if (!fs.existsSync(ctx.destination)) {
        fs.mkdirSync(ctx.destination, { recursive: true });
    }

    const generatedFilePath = path.join(ctx.destination, ctx.fileName);
    fs.writeFileSync(generatedFilePath, toString(fileNode));
    return generatedFilePath;
}

function joinWithExtraNL<T>(content: T[], toString: (e: T) => Generated): Generated {
    return join(content, toString, { appendNewLineIfNotEmpty: true });
}

function joinGenerated(content: Generated, added: Generated, noAdd?: boolean): Generated {
    if (noAdd)
        return toNode`
    ${content} 
    ${added}
    `;

    return toNode`
    ${content} and ${added}
    `;
}

export function generatePetriNetContent(ctx: GeneratorContext): Generated {
    if (ctx.petrinet)
        return toNode`
    PetriNet ${ctx.petrinet.name} :
        ${joinWithExtraNL(ctx.petrinet.places, place => generatePlaceDeclaration(place))}
        ${joinWithExtraNL(ctx.petrinet.transitions, transition => generateTransitionDeclaration(ctx, transition))}
    `;

    let everyPlacesNames: Array<string> = [];
    let generatedPlaces: Generated;
    let generatedTranstions: Generated;

    if (specificNbPlaces != 0) {
        for (let i = 0; i < specificNbPlaces; i++) {
            nPlace = nPlace + 1;
            everyPlacesNames.push("P" + nPlace);
            generatedPlaces = joinGenerated(generatedPlaces, generatePlaceDeclaration(undefined, everyPlacesNames[i]), true);
        }
        for (let i = 0; i < getRandomInt(nbMinTransitions, nbMaxTransitions); i++) {
            generatedTranstions = joinGenerated(generatedTranstions, generateTransitionDeclaration(ctx, undefined, everyPlacesNames), true);
        }
    } else {
        for (let i = 0; i < getRandomInt(nbMinPlaces, nbMaxPlaces); i++) {
            nPlace = nPlace + 1;
            everyPlacesNames.push("P" + nPlace);
            generatedPlaces = joinGenerated(generatedPlaces, generatePlaceDeclaration(undefined, everyPlacesNames[i]), true);
        }
        for (let i = 0; i < getRandomInt(nbMinTransitions, nbMaxTransitions); i++) {
            generatedTranstions = joinGenerated(generatedTranstions, generateTransitionDeclaration(ctx, undefined, everyPlacesNames), true);
        }
    }

    return toNode`
        PetriNet randomPetriNet :
            ${generatedPlaces}
            ${generatedTranstions}
    `;
}

function generatePlaceDeclaration(place?: Place, namePlace?: string): Generated {
    if (place)
        return toNode`
    Place ${place.name} :
        Capacity : ${place.maxCapacity},
        Initial token number : ${place.initialTokenNumber}
    end    

    `;

    const capacity = getRandomInt(0, 20);

    return toNode`
    Place ${namePlace} :
        Capacity : ${capacity},
        Initial token number : ${getRandomInt(0, capacity)}
    end
    `;
}

function generateTransitionDeclaration(ctx: GeneratorContext, transition?: Transition, everyPlaces?: Array<string>): Generated {
    if ((ctx.petrinet) && (transition)) {
        let generatedSources: Generated = generateEdgeDeclaration(ctx, transition.sources[0]);
        let generatedDestinations: Generated = generateEdgeDeclaration(ctx, transition.destinations[0]);
        for (let source of transition.sources) {
            if (!(source == transition.sources[0]))
                generatedSources = joinGenerated(generatedSources, generateEdgeDeclaration(ctx, source));
        }
        for (let destination of transition.destinations) {
            if (!(destination == transition.destinations[0]))
                generatedDestinations = joinGenerated(generatedDestinations, generateEdgeDeclaration(ctx, destination));
        }
        return toNode`
    Transition ${transition.name} :
        From ${generatedSources}
        To ${generatedDestinations}
    end
    
    `;
    } else
        if (everyPlaces) {
            nTransition = nTransition + 1;
            let UsedPlaces: Array<string> = [everyPlaces[getRandomInt(0, everyPlaces.length)]];
            let generatedSources: Generated = generateEdgeDeclaration(ctx, undefined, [UsedPlaces[0], getRandomInt(0, 6)]);
            for (let i = 0; i <= getRandomInt(0, everyPlaces.length); i++) {
                if (!UsedPlaces.includes(everyPlaces[i])) {
                    generatedSources = joinGenerated(generatedSources, generateEdgeDeclaration(ctx, undefined, [everyPlaces[i], getRandomInt(0, 11)]));
                    UsedPlaces.push(everyPlaces[i]);
                }
            }

            UsedPlaces = [everyPlaces[getRandomInt(0, everyPlaces.length)]];
            let generatedDestinations: Generated = generateEdgeDeclaration(ctx, undefined, [UsedPlaces[0], getRandomInt(0, 6)]);
            for (let i = 0; i <= getRandomInt(0, everyPlaces.length); i++) {
                if (!UsedPlaces.includes(everyPlaces[i])) {
                    generatedDestinations = joinGenerated(generatedDestinations, generateEdgeDeclaration(ctx, undefined, [everyPlaces[i], getRandomInt(0, 11)]));
                    UsedPlaces.push(everyPlaces[i]);
                }
            }
            return toNode`
    Transition T${nTransition} :
        From ${generatedSources}
        To ${generatedDestinations}
    end
    `;
        }
        else return toNode``;
}

function generateEdgeDeclaration(ctx: GeneratorContext, edge?: Edge, newEdge?: Array<any>): Generated {
    if ((ctx.petrinet) && (edge) && (edge.place.ref)) {
        let place: Place = edge.place.ref;
        return toNode`
    ${place.name}, weight : ${edge.weight}
    `;
    }
    else if (newEdge)
        return toNode`
    ${newEdge[0]}, weight : ${newEdge[1]}
    `;
    else return toNode``;
}