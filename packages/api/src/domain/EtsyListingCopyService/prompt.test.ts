import { describe, expect, it } from 'bun:test';
import {
    type Design,
    DesignType,
    ETSY_TAGS_MAX,
    ETSY_TITLE_MAX,
    type RequiredMaterial,
} from '@jewellery-catalogue/types';

import { buildListingPrompt, listingCopyReplySchema, sanitiseListingCopy } from './prompt';

const bead = {
    id: 'b1',
    userId: 'u',
    name: 'Amethyst round bead',
    brand: 'x',
    purchaseUrl: '',
    type: 'BEAD',
    dateAdded: new Date(),
    diameter: 6,
    colour: 'purple',
    quantityPerPack: 10,
    pricePerPack: 2,
    totalQuantity: 10,
    pricePerBead: 0.2,
    requiredQuantity: 2,
} as unknown as RequiredMaterial;
const chain = {
    id: 'c1',
    userId: 'u',
    name: 'Fine curb chain',
    brand: 'x',
    purchaseUrl: '',
    type: 'CHAIN',
    dateAdded: new Date(),
    metalType: 'SILVER',
    wireType: 'PLATED',
    diameter: 1.5,
    lengthPerPack: 5,
    pricePerPack: 3,
    totalLength: 5,
    requiredLength: 45,
} as unknown as RequiredMaterial;

const design = (overrides: Partial<Design> = {}): Design => ({
    id: 'd1',
    userId: 'u',
    name: 'Lilac drop',
    timeRequired: '01:00',
    materials: [bead, chain],
    imageIds: ['i1'],
    diagramImageIds: [],
    makingNotes: 'secret notes',
    price: 42.5,
    description: '<p>Hand <strong>wrapped</strong>.</p>',
    totalMaterialCosts: 3,
    dateAdded: new Date(),
    totalQuantity: 1,
    designType: DesignType.NECKLACE,
    ...overrides,
});

describe('buildListingPrompt', () => {
    it('includes type, plain-text description and material facts with units', () => {
        const prompt = buildListingPrompt(design(), 1);
        expect(prompt).toContain('Item type: necklace');
        expect(prompt).toContain('Hand wrapped.');
        expect(prompt).toContain('colour purple, 6mm diameter');
        expect(prompt).toContain('silver plated');
        expect(prompt).toContain('45cm of chain');
        expect(prompt).toContain('Photos attached: 1');
    });

    it('never leaks price or private making notes', () => {
        const prompt = buildListingPrompt(design(), 0);
        expect(prompt).not.toContain('42.5');
        expect(prompt).not.toContain('secret notes');
    });

    it('lists variation options by group', () => {
        const prompt = buildListingPrompt(
            design({
                variationGroups: [{ id: 'g', name: 'Stone', required: 0, options: [{ id: 'o', material: bead }] }],
            }),
            0
        );
        expect(prompt).toContain('Stone: Amethyst round bead');
    });
});

describe('sanitiseListingCopy', () => {
    it('cuts an over-long title at a word boundary within the limit', () => {
        const words = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
        const { title } = sanitiseListingCopy({ title: words, description: 'd', tags: [] });
        expect(title.length).toBeLessThanOrEqual(ETSY_TITLE_MAX);
        expect(words.startsWith(title)).toBe(true);
        expect(words.charAt(title.length)).toBe(' ');
    });

    it('leaves a title of exactly the max length untouched', () => {
        const title = 'a'.repeat(ETSY_TITLE_MAX);
        expect(sanitiseListingCopy({ title, description: 'd', tags: [] }).title).toBe(title);
    });

    it('keeps only the first of each %, : and & in the title', () => {
        const { title } = sanitiseListingCopy({ title: 'Ring & Band & Gift: Silver: 925', description: 'd', tags: [] });
        expect(title).toBe('Ring & Band Gift: Silver 925');
    });

    it('normalises, dedupes, drops invalid tags and caps at 13', () => {
        const tags = [
            'Silver Necklace',
            'silver necklace',
            'x'.repeat(21),
            ...Array.from({ length: 20 }, (_, i) => `tag ${i}`),
        ];
        const result = sanitiseListingCopy({ title: 't', description: 'd', tags });
        expect(result.tags[0]).toBe('silver necklace');
        expect(result.tags).toHaveLength(ETSY_TAGS_MAX);
        expect(new Set(result.tags).size).toBe(ETSY_TAGS_MAX);
        expect(result.tags.every((t) => t.length <= 20)).toBe(true);
    });

    it('normalises description line endings and blank-line runs', () => {
        const { description } = sanitiseListingCopy({ title: 't', description: ' a\r\n\r\n\r\n\r\nb ', tags: [] });
        expect(description).toBe('a\n\nb');
    });
});

describe('listingCopyReplySchema', () => {
    it('rejects a reply whose title is empty after cleaning', () => {
        expect(listingCopyReplySchema.safeParse({ title: '  ', description: 'd', tags: [] }).success).toBe(false);
    });
});
