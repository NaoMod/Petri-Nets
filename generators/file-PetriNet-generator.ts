import fs from 'fs';
import { expandToNode as toNode, joinToNode as join, Generated, toString } from 'langium';
import path from 'path';
import { Edge, PetriNet, Place, Transition } from '../src/generated/ast';
import { extractDestinationAndName } from '../src/parse-util';
import { findPlaceFromReference } from '../src/runtimeState';



export function generatePetriNetFile(petrinet: PetriNet, filePath: string, destination: string | undefined): string {
    const data = extractDestinationAndName(filePath, destination);
    const ctx = <GeneratorContext>{
        petrinet,
        fileName: `${data.name}.PetriNet`,
        destination: data.destination,
    };
    return generate(ctx);
}

interface GeneratorContext {
    petrinet: PetriNet;
    fileName: string;
    destination: string;
}

function generate(ctx: GeneratorContext): string {
    const fileNode = generateJavaContent(ctx);

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
    return toNode`
    ${content} and ${added}
    `;
}

export function generateJavaContent(ctx: GeneratorContext): Generated {
    return toNode`
    PetriNet ${ctx.petrinet.name} :

        ${joinWithExtraNL(ctx.petrinet.places, place => generatePlaceDeclaration(ctx, place))}
        ${joinWithExtraNL(ctx.petrinet.transitions, transition => generateTransitionDeclaration(ctx, transition))}
    `;
}

function generatePlaceDeclaration(ctx: GeneratorContext, place: Place): Generated {
    return toNode`
    Place ${place.name} :
        Capacity : ${place.maxCapacity},
        Initial token number : ${place.initialTokenNumber}
    end    

    `;
}

function generateTransitionDeclaration(ctx: GeneratorContext, transition: Transition): Generated {
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
}

function generateEdgeDeclaration(ctx: GeneratorContext, edge: Edge): Generated {
    let place: Place = findPlaceFromReference(edge.place, ctx.petrinet)
    return toNode`
    ${place.name}, weight : ${edge.weight}
    `;
}