import { describe, expect, it } from 'bun:test';
import { type Design, type Material, MaterialType } from '@jewellery-catalogue/types';

import { buildShoppingList, summariseProducible } from './plan';

const wire = (overrides: Record<string, unknown> = {}) =>
    ({
        id: 'wire',
        userId: 'user-1',
        name: 'Silver Wire',
        brand: 'Acme',
        purchaseUrl: 'https://shop/wire',
        type: MaterialType.WIRE,
        dateAdded: '2026-01-01T00:00:00.000Z',
        diameter: 0.5,
        wireType: 'FULL',
        metalType: 'SILVER',
        lengthPerPack: 5,
        pricePerPack: 8,
        totalLength: 1,
        pricePerMeter: 1.6,
        ...overrides,
    }) as unknown as Material;

const bead = (overrides: Record<string, unknown> = {}) =>
    ({
        id: 'bead',
        userId: 'user-1',
        name: 'Opal Bead',
        brand: 'Acme',
        purchaseUrl: 'https://shop/bead',
        type: MaterialType.BEAD,
        dateAdded: '2026-01-01T00:00:00.000Z',
        diameter: 4,
        colour: 'white',
        quantityPerPack: 50,
        pricePerPack: 3,
        totalQuantity: 20,
        pricePerBead: 0.06,
        ...overrides,
    }) as unknown as Material;

// 30cm of wire and 4 beads per piece.
const requiredWire = (cm = 30) => ({ ...(wire() as object), requiredLength: cm }) as never;
const requiredBead = (qty = 4, overrides: Record<string, unknown> = {}) =>
    ({ ...(bead(overrides) as object), requiredQuantity: qty }) as never;

const makeDesign = (overrides: Partial<Design> = {}): Design => ({
    id: 'ring',
    userId: 'user-1',
    name: 'Ring',
    description: '',
    timeRequired: '01:00',
    materials: [requiredWire(), requiredBead()],
    imageIds: [],
    diagramImageIds: [],
    makingNotes: '',
    price: 20,
    totalMaterialCosts: 2,
    dateAdded: new Date(),
    totalQuantity: 0,
    ...overrides,
});

const byId = (...materials: Material[]) => new Map(materials.map((m) => [m.id, m]));

describe('summariseProducible', () => {
    it('is limited by the scarcest material, converting cm requirements to metres of stock', () => {
        // 1m of wire / 0.3m = 3, 20 beads / 4 = 5
        expect(summariseProducible(makeDesign(), byId(wire(), bead())).canMake).toBe(3);
    });

    it('does not round down exact fits because of floating-point error', () => {
        expect(summariseProducible(makeDesign(), byId(wire({ totalLength: 0.9 }), bead())).canMake).toBe(3);
    });

    it('treats a deleted material as zero stock', () => {
        expect(summariseProducible(makeDesign(), byId(bead())).canMake).toBe(0);
    });

    it('adds up a material listed more than once', () => {
        const design = makeDesign({ materials: [requiredBead(4), requiredBead(6)] });

        expect(summariseProducible(design, byId(bead())).canMake).toBe(2);
    });

    it('returns null when the design lists no materials', () => {
        expect(summariseProducible(makeDesign({ materials: [] }), byId()).canMake).toBeNull();
    });

    it('works out each variant from shared plus option materials, and reports the best one', () => {
        const design = makeDesign({
            materials: [requiredWire(10)],
            variationGroups: [
                {
                    id: 'stone',
                    name: 'Stone',
                    required: 1,
                    options: [
                        { id: 'opt-opal', material: requiredBead(2) },
                        { id: 'opt-jade', material: requiredBead(1, { id: 'jade', name: 'Jade' }) },
                    ],
                },
            ],
            variants: [
                {
                    id: 'v-opal',
                    optionIds: ['opt-opal'],
                    name: 'Opal',
                    totalQuantity: 0,
                    totalMaterialCosts: 1,
                    price: 1,
                },
                {
                    id: 'v-jade',
                    optionIds: ['opt-jade'],
                    name: 'Jade',
                    totalQuantity: 0,
                    totalMaterialCosts: 1,
                    price: 1,
                },
            ],
        });
        const materials = byId(
            wire({ totalLength: 1 }),
            bead({ totalQuantity: 20 }),
            bead({ id: 'jade', totalQuantity: 4 })
        );

        const summary = summariseProducible(design, materials);

        // wire allows 10; opal beads allow 10; jade beads allow 4
        expect(summary.variants).toEqual([
            { variantId: 'v-opal', name: 'Opal', canMake: 10 },
            { variantId: 'v-jade', name: 'Jade', canMake: 4 },
        ]);
        expect(summary.canMake).toBe(10);
    });
});

describe('buildShoppingList', () => {
    it('totals requirements across targets and buys whole packs to cover the shortfall', () => {
        const designs = new Map([['ring', makeDesign()]]);

        const list = buildShoppingList([{ designId: 'ring', quantity: 10 }], designs, byId(wire(), bead()));

        // wire: need 3m, have 1m, short 2m -> 1 pack of 5m (£8); beads: need 40, have 20, short 20 -> 1 pack (£3)
        expect(list.lines).toEqual([
            {
                materialId: 'bead',
                name: 'Opal Bead',
                brand: 'Acme',
                purchaseUrl: 'https://shop/bead',
                unit: 'pcs',
                required: 40,
                inStock: 20,
                shortfall: 20,
                packSize: 50,
                packsToBuy: 1,
                pricePerPack: 3,
                estimatedCost: 3,
            },
            {
                materialId: 'wire',
                name: 'Silver Wire',
                brand: 'Acme',
                purchaseUrl: 'https://shop/wire',
                unit: 'm',
                required: 3,
                inStock: 1,
                shortfall: 2,
                packSize: 5,
                packsToBuy: 1,
                pricePerPack: 8,
                estimatedCost: 8,
            },
        ]);
        expect(list.totalCost).toBe(11);
    });

    it('lists materials already in stock with nothing to buy, after the shortfalls', () => {
        const designs = new Map([['ring', makeDesign()]]);

        const list = buildShoppingList(
            [{ designId: 'ring', quantity: 2 }],
            designs,
            byId(wire({ totalLength: 0.1 }), bead())
        );

        expect(list.lines.map((l) => [l.materialId, l.packsToBuy])).toEqual([
            ['wire', 1],
            ['bead', 0],
        ]);
        expect(list.totalCost).toBe(8);
    });

    it('needs several packs when the shortfall exceeds one', () => {
        const designs = new Map([['ring', makeDesign({ materials: [requiredBead(30)] })]]);

        const list = buildShoppingList([{ designId: 'ring', quantity: 4 }], designs, byId(bead()));

        // need 120, have 20, short 100 -> exactly 2 packs of 50
        expect(list.lines[0]).toMatchObject({ shortfall: 100, packsToBuy: 2, estimatedCost: 6 });
    });

    it('falls back to the design snapshot for a deleted material, assuming no stock', () => {
        const designs = new Map([['ring', makeDesign({ materials: [requiredBead(10)] })]]);

        const list = buildShoppingList([{ designId: 'ring', quantity: 1 }], designs, byId());

        expect(list.lines[0]).toMatchObject({ name: 'Opal Bead', inStock: 0, shortfall: 10, packsToBuy: 1 });
    });

    it('includes variant option materials for a variant target', () => {
        const design = makeDesign({
            materials: [],
            variationGroups: [
                { id: 'g', name: 'Stone', required: 1, options: [{ id: 'o', material: requiredBead(5) }] },
            ],
            variants: [{ id: 'v', optionIds: ['o'], name: 'Opal', totalQuantity: 0, totalMaterialCosts: 1, price: 1 }],
        });

        const list = buildShoppingList(
            [{ designId: 'ring', variantId: 'v', quantity: 2 }],
            new Map([['ring', design]]),
            byId(bead())
        );

        expect(list.lines[0]).toMatchObject({ materialId: 'bead', required: 10, shortfall: 0 });
    });
});
