import { describe, expect, it } from 'bun:test';
import { type Material, MaterialType } from '@jewellery-catalogue/types';

import type { IdGenerator } from '../IdGenerator';
import { mapEtsyInventoryToVariations } from './mappers';

function makeMaterial(overrides: Partial<Material> = {}): Material {
    return {
        type: MaterialType.BEAD,
        id: 'material-1',
        userId: 'user-1',
        name: 'Red',
        brand: '',
        purchaseUrl: '',
        dateAdded: new Date().toISOString(),
        diameter: 6,
        colour: 'red',
        quantityPerPack: 100,
        pricePerPack: 5,
        totalQuantity: 100,
        pricePerBead: 0.05,
        ...overrides,
    } as Material;
}

function makeIdGenerator(): IdGenerator {
    let counter = 0;
    return { generate: () => `id-${++counter}` };
}

describe('mapEtsyInventoryToVariations', () => {
    it('creates a variation group and variants for matched property values', () => {
        const materials = [makeMaterial({ id: 'red', name: 'Red' }), makeMaterial({ id: 'blue', name: 'Blue' })];
        const result = mapEtsyInventoryToVariations(
            {
                products: [
                    {
                        offerings: [{ price: 20, quantity: 3, isEnabled: true }],
                        propertyValues: [{ propertyName: 'Color', values: ['Red'] }],
                    },
                    {
                        offerings: [{ price: 22, quantity: 2, isEnabled: true }],
                        propertyValues: [{ propertyName: 'Color', values: ['Blue'] }],
                    },
                ],
            },
            materials,
            makeIdGenerator()
        );

        expect(result.variationGroups).toHaveLength(1);
        expect(result.variationGroups[0]!.name).toBe('Color');
        expect(result.variationGroups[0]!.options).toHaveLength(2);
        expect(result.variants).toHaveLength(2);
        expect(result.variants[0]).toMatchObject({ name: 'Red', totalQuantity: 3, price: 20 });
        expect(result.unmatchedPropertyValues).toEqual([]);
    });

    it('matches material names case-insensitively and trims whitespace', () => {
        const materials = [makeMaterial({ id: 'red', name: '  red  ' })];
        const result = mapEtsyInventoryToVariations(
            {
                products: [
                    {
                        offerings: [{ price: 20, quantity: 3, isEnabled: true }],
                        propertyValues: [{ propertyName: 'Color', values: ['RED'] }],
                    },
                ],
            },
            materials,
            makeIdGenerator()
        );

        expect(result.variationGroups[0]!.options).toHaveLength(1);
        expect(result.unmatchedPropertyValues).toEqual([]);
    });

    it('drops property values with no matching material instead of fabricating one', () => {
        const result = mapEtsyInventoryToVariations(
            {
                products: [
                    {
                        offerings: [{ price: 20, quantity: 3, isEnabled: true }],
                        propertyValues: [{ propertyName: 'Color', values: ['Chartreuse'] }],
                    },
                ],
            },
            [],
            makeIdGenerator()
        );

        expect(result.variationGroups).toEqual([]);
        expect(result.variants).toEqual([]);
        expect(result.unmatchedPropertyValues).toEqual(['Color: Chartreuse']);
    });

    it('drops a variant when only some of its property values matched', () => {
        const materials = [makeMaterial({ id: 'red', name: 'Red' })];
        const result = mapEtsyInventoryToVariations(
            {
                products: [
                    {
                        offerings: [{ price: 20, quantity: 3, isEnabled: true }],
                        propertyValues: [
                            { propertyName: 'Color', values: ['Red'] },
                            { propertyName: 'Size', values: ['XL'] },
                        ],
                    },
                ],
            },
            materials,
            makeIdGenerator()
        );

        expect(result.variants).toEqual([]);
        expect(result.unmatchedPropertyValues).toEqual(['Size: XL']);
    });

    it('returns nothing for a listing with no inventory products', () => {
        const result = mapEtsyInventoryToVariations({ products: [] }, [], makeIdGenerator());

        expect(result).toEqual({ variationGroups: [], variants: [], unmatchedPropertyValues: [] });
    });
});
