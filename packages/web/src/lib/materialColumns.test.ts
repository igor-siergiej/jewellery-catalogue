import { MaterialType } from '@jewellery-catalogue/types';
import { describe, expect, it } from 'vite-plus/test';

import { columnsFor } from './materialColumns';

describe('columnsFor', () => {
    it('lists the common columns for all materials', () => {
        expect(columnsFor('all')).toEqual(['name', 'type', 'brand', 'stock', 'pricePerPack', 'unitPrice']);
    });

    it('adds code, diameter and colour for beads', () => {
        const columns = columnsFor(MaterialType.BEAD);

        expect(columns).toEqual(expect.arrayContaining(['code', 'diameter', 'colour']));
        expect(columns).not.toContain('wireType');
        expect(columns).not.toContain('type');
    });

    it('adds wire type, metal type and diameter for wire', () => {
        const columns = columnsFor(MaterialType.WIRE);

        expect(columns).toEqual(expect.arrayContaining(['wireType', 'metalType', 'diameter']));
        expect(columns).not.toContain('colour');
    });

    it('adds metal type and length for chains', () => {
        expect(columnsFor(MaterialType.CHAIN)).toEqual(expect.arrayContaining(['metalType', 'length']));
    });

    it('adds only metal type for ear hooks', () => {
        const columns = columnsFor(MaterialType.EAR_HOOK);

        expect(columns).toContain('metalType');
        expect(columns).not.toContain('length');
        expect(columns).not.toContain('diameter');
    });
});
