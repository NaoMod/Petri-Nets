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
        Place: validator.checkPlaceStartsWithCapitalAndLessCurrentTokenNumberThanMaxTokenNumber,
        Transition: validator.checkTransitionStartsWithCapital,
        Arc: validator.checkArcStartsWithCapital,
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
    checkPlaceStartsWithCapitalAndLessCurrentTokenNumberThanMaxTokenNumber(place: Place, accept: ValidationAcceptor): void {
        if (place.name) {
            const firstChar = place.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Place name should start with a capital.', { node: place, property: 'name' });
            }
        } if (place.initialTokenNumber>place.maxCapacity) {
            accept('error', `Too many tokens in this place: ${place.name}`, { node: place, property: 'initialTokenNumber' });
        }
    }

    /**
     * Checks if the transition name starts with a capital letter.
     * @param transition the transition to check
     * @param accept the acceptor to report errors
     */
    checkTransitionStartsWithCapital(transition: Transition, accept: ValidationAcceptor): void {
        if (transition.name) {
            const firstChar = transition.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Transition name should start with a capital.', { node: transition, property: 'name' });
            }
        }
    }

    /**
     * Checks if the arc name starts with a capital letter.
     * @param arc the place to check
     * @param accept the acceptor to report errors
     */
    checkArcStartsWithCapital(arc: Arc, accept: ValidationAcceptor): void {
        if (arc.name) {
            const firstChar = arc.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Arc name should start with a capital.', { node: arc, property: 'name' });
            }
        }
    }


    /**
     * Checks if there are duplicate place, transition and arc names.
     * @param petrinet the petrinet to check
     * @param accept the acceptor to report errors
     */
    checkUniquePlacesTransitionsAndArcs(petrinet: PetriNet, accept: ValidationAcceptor): void {
        // check for duplicate state and event names and add them to the map
        const names = new MultiMap<string, Place | Transition | Arc >();
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

    /**
     * Checks if there are too many tokens in a place, exceeding the max capacity
     * @param petrinet the petrinet to check
     * @param accept the acceptor to report errors
     */
    checkLessCurrentTokenNumberThanMaxToken(petrinet: PetriNet, accept: ValidationAcceptor): void {
        for(const place of petrinet.places) {
            if(place.initialTokenNumber>place.maxCapacity) {
                accept('error', `Too many tokens in this place: ${place.name}`, { node: place, property: 'initialTokenNumber' });
            }
        }
    }

}
