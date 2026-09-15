import { DesignType } from '@jewellery-catalogue/types';
import { describe, expect, it } from 'vitest';

import { getDefaultTaxonomyId } from './index';

describe('getDefaultTaxonomyId', () => {
    const options = [
        { id: 1, label: 'Jewelry' },
        { id: 2, label: 'Jewelry > Rings' },
        { id: 3, label: 'Jewelry > Necklaces' },
        { id: 4, label: 'Jewelry > Earrings' },
        { id: 5, label: 'Jewelry > Bracelets' },
    ];

    it('matches a design type to the option with the same leaf category name', () => {
        expect(getDefaultTaxonomyId(DesignType.RING, options)).toBe(2);
        expect(getDefaultTaxonomyId(DesignType.NECKLACE, options)).toBe(3);
        expect(getDefaultTaxonomyId(DesignType.EARRINGS, options)).toBe(4);
        expect(getDefaultTaxonomyId(DesignType.BRACELET, options)).toBe(5);
    });

    it('falls back to Earrings for Ear Cuffs when no dedicated category exists', () => {
        expect(getDefaultTaxonomyId(DesignType.EARCUFF, options)).toBe(4);
    });

    it('prefers a dedicated Ear Cuffs category over the Earrings fallback', () => {
        const withEarCuffs = [...options, { id: 6, label: 'Jewelry > Earrings > Ear Cuffs' }];
        expect(getDefaultTaxonomyId(DesignType.EARCUFF, withEarCuffs)).toBe(6);
    });

    it('returns undefined when no candidate category is present', () => {
        expect(getDefaultTaxonomyId(DesignType.RING, [{ id: 1, label: 'Jewelry > Necklaces' }])).toBeUndefined();
    });
});
