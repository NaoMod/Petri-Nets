import { MultiMap, ValidationAcceptor, ValidationChecks } from 'langium';
import { PetriNet, PetriNetAstType, Place, Transition } from './generated/ast';
import type { PetriNetServices } from './petri-net-module';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: PetriNetServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.PetriNetValidator;
    const checks: ValidationChecks<PetriNetAstType> = {
        Transition: validator.checkWeightCannotBeNegative,
        Place: validator.checkPlaceHaveLessCurrentTokenNumberThanMaxTokenNumber,
        PetriNet: validator.checkUniqueNamesPetrinetPlacesTransitions
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class PetriNetValidator {

    /**
     * Checks if the place's current token number is positive and lesser that the place's max capacity (is also positive)
     * @param place the place to check
     * @param accept the acceptor to report errors
     */
    checkPlaceHaveLessCurrentTokenNumberThanMaxTokenNumber(place: Place, accept: ValidationAcceptor): void {
        if (place.initialTokenNumber > place.maxCapacity) {
            accept('error', `Too many tokens in this place: ${place.name}`, { node: place, property: 'initialTokenNumber' });
        }
        if (place.initialTokenNumber < 0) {
            accept('error', `Initial token number cannot be negative.`, { node: place, property: 'initialTokenNumber' });
        }
        if (place.maxCapacity < 0) {
            accept('error', `Max capacity cannot be negative.`, { node: place, property: 'maxCapacity' });
        }
    }

    /**
     * Checks if the transition doesn't bare negative weights
     * @param transition the transition to check
     * @param accept the acceptor to report errors
     */
    checkWeightCannotBeNegative(transition: Transition, accept: ValidationAcceptor): void {
        for (let source of transition.sources) {
            if (source.weight < 0) {
                accept('error', `Weight cannot be negative.`, { node: source, property: 'weight' });
            }
        }
        for (let destination of transition.destinations) {
            if (destination.weight < 0) {
                accept('error', `Weight cannot be negative.`, { node: destination, property: 'weight' });
            }
        }
    }


    /**
     * Checks if there are duplicate place and transition names and that they all are different form the petrinet's name.
     * @param petrinet the petrinet to check
     * @param accept the acceptor to report errors
     */
    checkUniqueNamesPetrinetPlacesTransitions(petrinet: PetriNet, accept: ValidationAcceptor): void {
        // check for duplicate state and event names and add them to the map
        const names = new MultiMap<string, PetriNet | Place | Transition>();
        const allSymbols = [petrinet, ...petrinet.places, ...petrinet.transitions];
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
