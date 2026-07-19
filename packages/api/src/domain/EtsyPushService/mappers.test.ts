import { describe, expect, it } from 'bun:test';
import type { DesignVariant, RequiredMaterial, VariationGroup } from '@jewellery-catalogue/types';

import { buildDraftListingInput, buildInventoryProducts, renderDescriptionTemplate } from './mappers';

const material = (name: string): RequiredMaterial =>
    ({ id: `mat-${name}`, name, type: 'BEAD', requiredQuantity: 1 }) as unknown as RequiredMaterial;

describe('renderDescriptionTemplate', () => {
    it('substitutes {description} and {materials} placeholders', () => {
        const result = renderDescriptionTemplate('{description}\n\nMaterials: {materials}', {
            description: 'A lovely ring.',
            materials: [material('Silver wire'), material('Moonstone bead')],
        });

        expect(result).toBe('A lovely ring.\n\nMaterials: Silver wire, Moonstone bead');
    });

    it('handles a template with no placeholders unchanged', () => {
        const result = renderDescriptionTemplate('Static text only', { description: 'ignored', materials: [] });
        expect(result).toBe('Static text only');
    });

    it('handles an empty materials list', () => {
        const result = renderDescriptionTemplate('{description} ({materials})', {
            description: 'A ring.',
            materials: [],
        });
        expect(result).toBe('A ring. ()');
    });
});

describe('buildDraftListingInput', () => {
    it('maps design + resolved fields into the fixed-field Etsy draft listing shape', () => {
        const result = buildDraftListingInput({
            design: { name: 'Silver Ring', price: 25.5, totalQuantity: 3 },
            description: 'A lovely ring.',
            price: 25.5,
            taxonomyId: 1234,
            shippingProfileId: 5678,
        });

        expect(result).toEqual({
            title: 'Silver Ring',
            description: 'A lovely ring.',
            price: 25.5,
            quantity: 3,
            whoMade: 'i_did',
            whenMade: 'made_to_order',
            taxonomyId: 1234,
            shippingProfileId: 5678,
        });
    });

    it('floors quantity at 1 when totalQuantity is 0', () => {
        const result = buildDraftListingInput({
            design: { name: 'Ring', price: 10, totalQuantity: 0 },
            description: 'd',
            price: 10,
            taxonomyId: 1,
            shippingProfileId: 1,
        });

        expect(result.quantity).toBe(1);
    });
});

describe('buildInventoryProducts', () => {
    it('maps each variant to a product with one property value per group and one offering', () => {
        const groups: VariationGroup[] = [
            {
                id: 'group-1',
                name: 'Colour',
                required: 1,
                options: [
                    { id: 'opt-silver', material: material('Silver') },
                    { id: 'opt-gold', material: material('Gold') },
                ],
            },
        ];
        const variants: DesignVariant[] = [
            {
                id: 'variant-1',
                optionIds: ['opt-silver'],
                name: 'Silver',
                totalQuantity: 5,
                totalMaterialCosts: 3,
                price: 20,
            },
            {
                id: 'variant-2',
                optionIds: ['opt-gold'],
                name: 'Gold',
                totalQuantity: 2,
                totalMaterialCosts: 4,
                price: 30,
            },
        ];

        const result = buildInventoryProducts(variants, groups);

        expect(result).toEqual([
            {
                propertyValues: [{ propertyName: 'Colour', values: ['Silver'] }],
                offering: { price: 20, quantity: 5, isEnabled: true },
            },
            {
                propertyValues: [{ propertyName: 'Colour', values: ['Gold'] }],
                offering: { price: 30, quantity: 2, isEnabled: true },
            },
        ]);
    });

    it('maps a variant spanning two groups to two property values', () => {
        const groups: VariationGroup[] = [
            {
                id: 'group-1',
                name: 'Colour',
                required: 1,
                options: [{ id: 'opt-silver', material: material('Silver') }],
            },
            {
                id: 'group-2',
                name: 'Size',
                required: 1,
                options: [{ id: 'opt-small', material: material('Small') }],
            },
        ];
        const variants: DesignVariant[] = [
            {
                id: 'variant-1',
                optionIds: ['opt-silver', 'opt-small'],
                name: 'Silver / Small',
                totalQuantity: 1,
                totalMaterialCosts: 3,
                price: 20,
            },
        ];

        const result = buildInventoryProducts(variants, groups);

        expect(result).toEqual([
            {
                propertyValues: [
                    { propertyName: 'Colour', values: ['Silver'] },
                    { propertyName: 'Size', values: ['Small'] },
                ],
                offering: { price: 20, quantity: 1, isEnabled: true },
            },
        ]);
    });
});
