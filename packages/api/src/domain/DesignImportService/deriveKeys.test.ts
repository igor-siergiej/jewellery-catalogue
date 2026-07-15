import { describe, expect, it } from 'bun:test';
import type { Design } from '@jewellery-catalogue/types';
import { deriveImportKey, diffChangedFields, extractEtsyImageId, imageSignature, normalise } from './deriveKeys';

const row = {
    title: '  Green   Ring ',
    description: 'desc',
    price: 6.15,
    quantity: 3,
    materials: ['Copper'],
    imageUrls: ['https://i.etsystatic.com/1/il/a/111/il_fullxfull.111_x.jpg'],
    sku: '',
};

describe('deriveKeys', () => {
    it('normalises whitespace and case', () => {
        expect(normalise('  Green   Ring ')).toBe('green ring');
    });

    it('prefers SKU when present, else title hash', () => {
        expect(deriveImportKey({ ...row, sku: 'SKU-9' })).toBe('SKU-9');
        const k = deriveImportKey(row);
        expect(k).toHaveLength(40);
        expect(k).toBe(deriveImportKey({ ...row, title: 'green ring' }));
    });

    it('extracts etsy image id and signature', () => {
        expect(extractEtsyImageId(row.imageUrls[0])).toBe('111');
        expect(imageSignature(row.imageUrls)).toBe('111');
    });

    it('diffs only changed etsy-owned fields', () => {
        const design = {
            name: 'Green Ring',
            description: 'desc',
            price: 6.15,
            etsyImageSignature: '111',
        } as unknown as Design;
        expect(diffChangedFields(row, design)).toEqual([]);
        expect(diffChangedFields({ ...row, price: 9.99 }, design)).toEqual(['price']);
        expect(diffChangedFields({ ...row, imageUrls: [] }, design)).toEqual(['images']);
    });
});
