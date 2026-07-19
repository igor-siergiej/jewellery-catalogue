import type { Design, DesignVariant, RequiredMaterial, VariationGroup } from '@jewellery-catalogue/types';

import type { EtsyDraftListingInput, EtsyInventoryProduct } from '../EtsyClient';

export const renderDescriptionTemplate = (
    template: string,
    design: { description: string; materials: RequiredMaterial[] }
): string => {
    const materialsList = design.materials.map((m) => m.name).join(', ');
    return template.replace(/\{description\}/g, design.description).replace(/\{materials\}/g, materialsList);
};

export const buildDraftListingInput = (args: {
    design: Pick<Design, 'name' | 'price' | 'totalQuantity'>;
    description: string;
    price: number;
    taxonomyId: number;
    shippingProfileId: number;
    readinessStateId: number;
}): EtsyDraftListingInput => ({
    title: args.design.name,
    description: args.description,
    price: args.price,
    quantity: Math.max(1, args.design.totalQuantity),
    whoMade: 'i_did',
    whenMade: 'made_to_order',
    isSupply: false,
    taxonomyId: args.taxonomyId,
    shippingProfileId: args.shippingProfileId,
    readinessStateId: args.readinessStateId,
});

export const buildInventoryProducts = (variants: DesignVariant[], groups: VariationGroup[]): EtsyInventoryProduct[] =>
    variants.map((variant) => {
        const propertyValues = groups
            .map((group) => {
                const option = group.options.find((o) => variant.optionIds.includes(o.id));
                return option ? { propertyName: group.name, values: [option.material.name] } : null;
            })
            .filter((pv): pv is { propertyName: string; values: string[] } => pv !== null);

        return {
            propertyValues,
            offering: { price: variant.price, quantity: variant.totalQuantity, isEnabled: true },
        };
    });
