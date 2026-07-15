import { describe, expect, it } from 'bun:test';
import { designSchema } from '../design';
import type { ImportCandidate } from './index';

describe('etsyImport types', () => {
    it('designSchema accepts optional import fields', () => {
        const parsed = designSchema.parse({
            id: 'd1',
            userId: 'u1',
            name: 'Ring',
            timeRequired: '0',
            materials: [],
            imageIds: ['i1'],
            price: 6.15,
            description: 'x',
            totalMaterialCosts: 0,
            dateAdded: new Date(),
            totalQuantity: 3,
            importSource: 'ETSY',
            importKey: 'abc',
            etsyImageSignature: '123',
            etsyMaterials: ['Copper'],
        });
        expect(parsed.importKey).toBe('abc');
    });

    it('ImportCandidate shape compiles', () => {
        const c: ImportCandidate = {
            importKey: 'k',
            name: 'Ring',
            status: 'NEW',
            changedFields: [],
            price: 6.15,
            designType: undefined,
            imageUrls: ['u'],
            mappedMaterials: ['Generic Copper Wire'],
            row: {
                title: 'Ring',
                description: 'x',
                price: 6.15,
                quantity: 3,
                materials: ['Copper'],
                imageUrls: ['u'],
                sku: '',
            },
        };
        expect(c.status).toBe('NEW');
    });
});
