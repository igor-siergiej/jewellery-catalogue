import type { Design } from '@jewellery-catalogue/types';
import { describe, expect, it } from 'vite-plus/test';

import { applyDesignFilters, parseDesignFilters, toSearchParams } from './designFilters';

const design = (over: Partial<Design>) => ({ id: 'x', name: 'x', designType: 'RING', ...over }) as Design;

describe('parseDesignFilters', () => {
    it('reads valid type and etsy values', () => {
        expect(parseDesignFilters(new URLSearchParams('etsy=none&type=RING'))).toEqual({ type: 'RING', etsy: 'none' });
    });

    it('falls back to all for unknown values', () => {
        expect(parseDesignFilters(new URLSearchParams('etsy=bogus&type=HAT'))).toEqual({ type: 'all', etsy: 'all' });
    });

    it('defaults to all when absent', () => {
        expect(parseDesignFilters(new URLSearchParams())).toEqual({ type: 'all', etsy: 'all' });
    });
});

describe('toSearchParams', () => {
    it('omits all', () => {
        expect(toSearchParams({ type: 'all', etsy: 'all' }).toString()).toBe('');
    });

    it('writes set filters', () => {
        expect(toSearchParams({ type: 'RING', etsy: 'listed' }).toString()).toBe('type=RING&etsy=listed');
    });
});

describe('applyDesignFilters', () => {
    const designs = [
        design({ id: 'a', designType: 'RING' }),
        design({ id: 'b', designType: 'RING', etsy: { listingId: 1, state: 'active' } as Design['etsy'] }),
        design({ id: 'c', designType: 'EARRINGS' }),
        design({ id: 'd', designType: 'RING', catalogueOnly: true }),
    ];

    it('keeps only not-on-Etsy designs', () => {
        expect(applyDesignFilters(designs, { type: 'all', etsy: 'none' }).map((d) => d.id)).toEqual(['a', 'c']);
    });

    it('lists catalogue-only designs under all but not under not-on-Etsy', () => {
        expect(applyDesignFilters(designs, { type: 'all', etsy: 'all' }).map((d) => d.id)).toContain('d');
        expect(applyDesignFilters(designs, { type: 'all', etsy: 'none' }).map((d) => d.id)).not.toContain('d');
    });

    it('combines type and etsy', () => {
        expect(applyDesignFilters(designs, { type: 'RING', etsy: 'listed' }).map((d) => d.id)).toEqual(['b']);
    });

    it('returns everything for all', () => {
        expect(applyDesignFilters(designs, { type: 'all', etsy: 'all' })).toHaveLength(4);
    });
});
