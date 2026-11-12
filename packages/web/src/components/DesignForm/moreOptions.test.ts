import { describe, expect, it } from 'vite-plus/test';

import { hasMoreOptionsData } from './moreOptions';

const empty: Parameters<typeof hasMoreOptionsData>[0] = {
    variationGroups: [],
    description: '',
    diagramImages: [],
    makingNotes: '',
    lowStockThreshold: undefined,
};

describe('hasMoreOptionsData', () => {
    it('is false for a blank form, an empty editor paragraph or a null threshold', () => {
        expect(hasMoreOptionsData(empty)).toBe(false);
        expect(hasMoreOptionsData({ ...empty, description: '<p></p>', makingNotes: '  ' })).toBe(false);
        expect(hasMoreOptionsData({ ...empty, lowStockThreshold: null })).toBe(false);
        expect(hasMoreOptionsData({})).toBe(false);
    });

    it.each([
        ['variations', { variationGroups: [{ id: 'g', name: 'Gemstone', required: 1, options: [] }] }],
        ['a description', { description: '<p>Dainty studs.</p>' }],
        ['a diagram', { diagramImages: ['diagram-1'] }],
        ['making notes', { makingNotes: 'Wrap twice' }],
        ['a stock alert of 0', { lowStockThreshold: 0 }],
    ])('is true when the design has %s', (_, values) => {
        expect(hasMoreOptionsData({ ...empty, ...values })).toBe(true);
    });
});
