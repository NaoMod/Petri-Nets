import {
    createDefaultModule, createDefaultSharedModule, DefaultSharedModuleContext, inject,
    LangiumServices, LangiumSharedServices, Module, PartialLangiumServices
} from 'langium';
import { PetriNetGeneratedModule, PetriNetGeneratedSharedModule } from './generated/module';
import { PetriNetValidator, registerValidationChecks } from './petri-net-validator';

/**
 * Declaration of custom services - add your own service classes here.
 */
export type PetriNetAddedServices = {
    validation: {
        PetriNetValidator: PetriNetValidator
    }
}

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type PetriNetServices = LangiumServices & PetriNetAddedServices

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const PetriNetModule: Module<PetriNetServices, PartialLangiumServices & PetriNetAddedServices> = {
    validation: {
        PetriNetValidator: () => new PetriNetValidator()
    }
};

/**
 * Create the full set of services required by Langium.
 *
 * First inject the shared services by merging two modules:
 *  - Langium default shared services
 *  - Services generated by langium-cli
 *
 * Then inject the language-specific services by merging three modules:
 *  - Langium default language-specific services
 *  - Services generated by langium-cli
 *  - Services specified in this file
 *
 * @param context Optional module context with the LSP connection
 * @returns An object wrapping the shared services and the language-specific services
 */
export function createPetriNetServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices,
    PetriNet: PetriNetServices
} {
    const shared = inject(
        createDefaultSharedModule(context),
        PetriNetGeneratedSharedModule
    );
    const PetriNet = inject(
        createDefaultModule({ shared }),
        PetriNetGeneratedModule,
        PetriNetModule
    );
    shared.ServiceRegistry.register(PetriNet);
    registerValidationChecks(PetriNet);
    return { shared, PetriNet };
}
