import { MultiMap, ValidationAcceptor, ValidationChecks } from 'langium';
import { PetriNet, PetriNetAstType, Place, Transition, Arc } from './generated/ast';
import type { PetriNetServices } from './petri-net-module';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: PetriNetServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.PetriNetValidator;
    const checks: ValidationChecks<PetriNetAstType> = {
        Place: validator.checkPlaceHaveLessCurrentTokenNumberThanMaxTokenNumber,
        PetriNet: validator.checkUniquePlacesTransitionsAndArcs
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class PetriNetValidator {

    /**
     * Checks if the place name starts with a capital letter.
     * @param place the place to check
     * @param accept the acceptor to report errors
     */
    checkPlaceHaveLessCurrentTokenNumberThanMaxTokenNumber(place: Place, accept: ValidationAcceptor): void {
        if (place.initialTokenNumber > place.maxCapacity) {
            accept('error', `Too many tokens in this place: ${place.name}`, { node: place, property: 'initialTokenNumber' });
        } if (place.initialTokenNumber < 0) {
            accept('error', `Initial token number cannot be negative.`, { node: place, property: 'initialTokenNumber' });
        } if (place.maxCapacity < 0) {
            accept('error', `Max capacity cannot be negative.`, { node: place, property: 'maxCapacity' });
        }
    }



    /**
     * Checks if there are duplicate place, transition and arc names.
     * @param petrinet the petrinet to check
     * @param accept the acceptor to report errors
     */
    checkUniquePlacesTransitionsAndArcs(petrinet: PetriNet, accept: ValidationAcceptor): void {
        // check for duplicate state and event names and add them to the map
        const names = new MultiMap<string, Place | Transition | Arc>();
        const allSymbols = [...petrinet.places, ...petrinet.transitions, ...petrinet.arcs];
        for (const symbol of allSymbols) {
            names.add(symbol.name, symbol);
        }
        for (const [name, symbols] of names.entriesGroupedByKey()) {
            if (symbols.length > 1) {
                for (const symbol of symbols) {
                    accept('error', `Duplicate identifier name: ${name}`, { node: symbol, property: 'name' });
                }
            }
        }
    }
}
