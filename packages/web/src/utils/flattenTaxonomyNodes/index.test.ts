import { describe, expect, it } from 'bun:test';

import { flattenTaxonomyNodes } from './index';

describe('flattenTaxonomyNodes', () => {
    it('flattens a nested tree into a list with breadcrumb labels', () => {
        const result = flattenTaxonomyNodes([
            {
                id: 1,
                name: 'Jewelry',
                children: [
                    { id: 2, name: 'Rings', children: [] },
                    { id: 3, name: 'Necklaces', children: [{ id: 4, name: 'Chokers', children: [] }] },
                ],
            },
        ]);

        expect(result).toEqual([
            { id: 1, label: 'Jewelry' },
            { id: 2, label: 'Jewelry > Rings' },
            { id: 3, label: 'Jewelry > Necklaces' },
            { id: 4, label: 'Jewelry > Necklaces > Chokers' },
        ]);
    });

    it('returns an empty array for an empty tree', () => {
        expect(flattenTaxonomyNodes([])).toEqual([]);
    });
});
