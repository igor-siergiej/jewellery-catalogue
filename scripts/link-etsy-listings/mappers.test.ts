import { describe, expect, it } from 'bun:test';
import type { EtsyListingSummary } from '../../packages/api/src/domain/EtsyClient';
import type { Design } from '../../packages/types/src';

import { applyOverrides, buildSuggestions, formatSuggestionsTable, validateSuggestions } from './mappers';

function makeDesign(overrides: Partial<Design> = {}): Design {
    return {
        id: 'design-1',
        userId: 'user-1',
        name: 'Silver Ring',
        description: '',
        timeRequired: '01:00',
        materials: [],
        imageIds: [],
        diagramImageIds: [],
        makingNotes: '',
        price: 25,
        totalMaterialCosts: 10,
        dateAdded: new Date(),
        totalQuantity: 1,
        ...overrides,
    };
}

function makeListing(overrides: Partial<EtsyListingSummary> = {}): EtsyListingSummary {
    return { listingId: 1, title: 'Listing', price: 10, url: 'https://etsy.com/listing/1', ...overrides };
}

describe('buildSuggestions', () => {
    it('matches each unlinked design to its best-titled listing', () => {
        const designs = [
            makeDesign({ id: 'd1', name: 'Silver Moonstone Ring' }),
            makeDesign({ id: 'd2', name: 'Gold Hoop Earrings' }),
        ];
        const listings = [
            makeListing({ listingId: 100, title: 'Silver Moonstone Ring - Handmade' }),
            makeListing({ listingId: 200, title: 'Gold Hoop Earrings, Sterling' }),
        ];

        const result = buildSuggestions(designs, listings);

        expect(result).toEqual([
            {
                design: designs[0],
                listingId: 100,
                listingTitle: 'Silver Moonstone Ring - Handmade',
                score: expect.any(Number),
            },
            {
                design: designs[1],
                listingId: 200,
                listingTitle: 'Gold Hoop Earrings, Sterling',
                score: expect.any(Number),
            },
        ]);
    });

    it('skips designs that are already linked', () => {
        const designs = [
            makeDesign({
                id: 'd1',
                name: 'Silver Ring',
                etsy: { listingId: 100, state: 'active', lastPushedAt: null },
            }),
        ];
        const listings = [makeListing({ listingId: 100, title: 'Silver Ring' })];

        expect(buildSuggestions(designs, listings)).toEqual([]);
    });

    it('excludes listings already linked to a different design from the candidate pool', () => {
        const designs = [
            makeDesign({
                id: 'd1',
                name: 'Already Linked',
                etsy: { listingId: 100, state: 'active', lastPushedAt: null },
            }),
            makeDesign({ id: 'd2', name: 'Silver Ring' }),
        ];
        const listings = [makeListing({ listingId: 100, title: 'Silver Ring' })];

        const result = buildSuggestions(designs, listings);

        expect(result).toEqual([{ design: designs[1], listingId: null, listingTitle: null, score: null }]);
    });

    it('does not suggest the same listing twice when two unlinked designs have similar names', () => {
        const designs = [
            makeDesign({ id: 'd1', name: 'Silver Ring' }),
            makeDesign({ id: 'd2', name: 'Silver Ring Large' }),
        ];
        const listings = [makeListing({ listingId: 100, title: 'Silver Ring' })];

        const result = buildSuggestions(designs, listings);

        expect(result[0].listingId).toBe(100);
        expect(result[1].listingId).toBeNull();
    });

    it('returns an empty array when there are no designs', () => {
        expect(buildSuggestions([], [makeListing()])).toEqual([]);
    });
});

describe('applyOverrides', () => {
    const design = makeDesign({ id: 'd1', name: 'Silver Ring' });
    const baseSuggestion = { design, listingId: 100, listingTitle: 'Original Match', score: 0.1 };
    const listings = [
        makeListing({ listingId: 100, title: 'Original Match' }),
        makeListing({ listingId: 200, title: 'Better Match' }),
    ];

    it('overrides a suggestion to skip (null)', () => {
        const result = applyOverrides([baseSuggestion], { d1: null }, listings);
        expect(result).toEqual([{ design, listingId: null, listingTitle: null, score: null }]);
    });

    it('overrides a suggestion to a different listingId, resolving its title from the listings list', () => {
        const result = applyOverrides([baseSuggestion], { d1: 200 }, listings);
        expect(result).toEqual([{ design, listingId: 200, listingTitle: 'Better Match', score: null }]);
    });

    it('leaves suggestions without a matching override unchanged', () => {
        const result = applyOverrides([baseSuggestion], {}, listings);
        expect(result).toEqual([baseSuggestion]);
    });
});

describe('validateSuggestions', () => {
    it('returns no errors when every listingId is unique', () => {
        const suggestions = [
            { design: makeDesign({ id: 'd1', name: 'A' }), listingId: 100, listingTitle: 'A', score: 0.1 },
            { design: makeDesign({ id: 'd2', name: 'B' }), listingId: 200, listingTitle: 'B', score: 0.1 },
        ];
        expect(validateSuggestions(suggestions)).toEqual([]);
    });

    it('flags two designs assigned to the same listingId', () => {
        const suggestions = [
            { design: makeDesign({ id: 'd1', name: 'A' }), listingId: 100, listingTitle: 'A', score: 0.1 },
            { design: makeDesign({ id: 'd2', name: 'B' }), listingId: 100, listingTitle: 'A', score: 0.1 },
        ];
        expect(validateSuggestions(suggestions)).toEqual([
            'Listing 100 is assigned to both "A" and "B" — each listing can only link to one design.',
        ]);
    });

    it('ignores skipped (null) suggestions when checking for duplicates', () => {
        const suggestions = [
            { design: makeDesign({ id: 'd1', name: 'A' }), listingId: null, listingTitle: null, score: null },
            { design: makeDesign({ id: 'd2', name: 'B' }), listingId: null, listingTitle: null, score: null },
        ];
        expect(validateSuggestions(suggestions)).toEqual([]);
    });
});

describe('formatSuggestionsTable', () => {
    it('renders a row per suggestion including the design name and target listing', () => {
        const suggestions = [
            {
                design: makeDesign({ id: 'd1', name: 'Silver Ring' }),
                listingId: 100,
                listingTitle: 'Silver Ring - Handmade',
                score: 0.05,
            },
        ];
        const table = formatSuggestionsTable(suggestions);
        expect(table).toContain('Silver Ring');
        expect(table).toContain('#100');
        expect(table).toContain('Silver Ring - Handmade');
    });

    it('renders SKIP for suggestions with no listingId', () => {
        const suggestions = [
            { design: makeDesign({ id: 'd1', name: 'Silver Ring' }), listingId: null, listingTitle: null, score: null },
        ];
        expect(formatSuggestionsTable(suggestions)).toContain('SKIP');
    });

    it('returns a placeholder message when there are no suggestions', () => {
        expect(formatSuggestionsTable([])).toBe('(no unlinked designs to suggest matches for)');
    });
});
