import { type Material, MaterialType } from '@jewellery-catalogue/types';
import { describe, expect, it } from 'vite-plus/test';

import { columnsFor, sortValue } from './materialColumns';

describe('columnsFor', () => {
    it('lists the common columns for all materials', () => {
        expect(columnsFor('all')).toEqual(['name', 'type', 'brand', 'stock', 'pricePerPack', 'unitPrice']);
    });

    it('leaves pack size out of the all tab', () => {
        expect(columnsFor('all')).not.toContain('perPack');
    });

    it('adds code, diameter, colour and pack size for beads', () => {
        const columns = columnsFor(MaterialType.BEAD);

        expect(columns).toEqual(expect.arrayContaining(['code', 'diameter', 'colour', 'perPack']));
        expect(columns).not.toContain('wireType');
        expect(columns).not.toContain('type');
    });

    it('adds wire type, metal type and diameter for wire', () => {
        const columns = columnsFor(MaterialType.WIRE);

        expect(columns).toEqual(expect.arrayContaining(['wireType', 'metalType', 'diameter', 'perPack']));
        expect(columns).not.toContain('colour');
    });

    it('adds metal type and length per pack for chains, without a separate pack size', () => {
        const columns = columnsFor(MaterialType.CHAIN);

        expect(columns).toEqual(expect.arrayContaining(['metalType', 'length']));
        expect(columns).not.toContain('perPack');
    });

    it('adds metal type and pack size for ear hooks', () => {
        const columns = columnsFor(MaterialType.EAR_HOOK);

        expect(columns).toEqual(expect.arrayContaining(['metalType', 'perPack']));
        expect(columns).not.toContain('length');
        expect(columns).not.toContain('diameter');
    });
});

describe('sortValue', () => {
    const wire = (metalType: string, wireType: string, totalLength: number) =>
        ({
            type: MaterialType.WIRE,
            name: 'w',
            brand: 'b',
            metalType,
            wireType,
            totalLength,
        }) as unknown as Material;

    it('orders enum columns by the label the user sees', () => {
        // FULL is labelled "Solid", so it sorts after FILLED ("Filled") and before PLATED ("Plated") by label, not by key
        const labels = [wire('GOLD', 'PLATED', 1), wire('GOLD', 'FULL', 1), wire('GOLD', 'FILLED', 1)]
            .map((m) => sortValue(m, 'wireType') as string)
            .sort((a, b) => a.localeCompare(b));

        expect(labels).toEqual(['Filled', 'Plated', 'Solid']);
        expect(sortValue(wire('GILT', 'FULL', 1), 'metalType')).toBe('Gilt');
    });

    it('sorts the type column by its label', () => {
        expect(sortValue({ type: MaterialType.EAR_HOOK } as Material, 'type')).toBe('Ear hook');
    });

    it('returns numbers for numeric columns', () => {
        expect(sortValue(wire('GOLD', 'FULL', 12.5), 'stock')).toBe(12.5);
    });
});
