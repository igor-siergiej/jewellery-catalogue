import { beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import type { Design } from '@jewellery-catalogue/types';
import type { DesignRepository } from '../DesignRepository';
import type { IdGenerator } from '../IdGenerator';
import type { ImageService } from '../ImageService';
import type { MaterialRepository } from '../MaterialRepository';
import type { EtsyImageFetcher } from './imageFetcher';
import { DesignImportService } from './index';

const designRepo = {
    getByUserId: mock(),
    insert: mock(),
    update: mock(),
    getById: mock(),
    getByIdAndUserId: mock(),
    getAll: mock(),
    delete: mock(),
    findByMaterialId: mock(),
};
const materialRepo = {
    getByUserId: mock(),
    insert: mock(),
    getById: mock(),
    getByIdAndUserId: mock(),
    getAll: mock(),
    update: mock(),
    delete: mock(),
};
const imageService = { uploadImage: mock(), getImage: mock() };
let idc = 0;
const idGenerator = { generate: mock(() => `id-${++idc}`) };
const imageFetcher = { fetch: mock(async () => ({ buffer: Buffer.from([1]), contentType: 'image/jpeg' })) };

const CSV = `TITLE,DESCRIPTION,PRICE,CURRENCY_CODE,QUANTITY,TAGS,MATERIALS,IMAGE1,SKU
New Ring,desc,6.15,GBP,3,t,"Copper,Stone",https://i.etsystatic.com/1/il/a/111/il_x.jpg,
,orphan,1,GBP,1,t,Copper,https://i.etsystatic.com/1/il/a/999/il_z.jpg,`;

const makeService = () =>
    new DesignImportService(
        designRepo as unknown as DesignRepository,
        materialRepo as unknown as MaterialRepository,
        imageService as unknown as ImageService,
        idGenerator as unknown as IdGenerator,
        imageFetcher as unknown as EtsyImageFetcher
    );

describe('DesignImportService.preview', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        idc = 0;
    });

    it('buckets rows into NEW and invalid, mapping materials', async () => {
        designRepo.getByUserId.mockResolvedValue([]);
        const result = await makeService().preview(CSV, 'u1');
        expect(result.summary).toEqual({ new: 1, changed: 0, same: 0, invalid: 1 });
        expect(result.candidates[0].status).toBe('NEW');
        expect(result.candidates[0].mappedMaterials).toEqual(['Generic Copper Wire', 'Generic Stone Bead']);
        expect(result.invalid[0].title).toBe('');
        expect(designRepo.insert).not.toHaveBeenCalled();
    });

    it('marks matching listing SAME and drifted listing CHANGED', async () => {
        const existing = {
            id: 'd1',
            userId: 'u1',
            name: 'New Ring',
            description: 'desc',
            price: 6.15,
            importKey: undefined,
            etsyImageSignature: '111',
        } as unknown as Design;
        // importKey is title-hash of 'New Ring'
        const { deriveImportKey } = await import('./deriveKeys');
        existing.importKey = deriveImportKey({ title: 'New Ring', sku: '' } as any);
        designRepo.getByUserId.mockResolvedValue([existing]);

        const same = await makeService().preview(CSV, 'u1');
        expect(same.candidates.find((c) => c.name === 'New Ring')?.status).toBe('SAME');

        const changedCsv = CSV.replace('6.15', '9.99');
        const changed = await makeService().preview(changedCsv, 'u1');
        const cand = changed.candidates.find((c) => c.name === 'New Ring');
        expect(cand?.status).toBe('CHANGED');
        expect(cand?.changedFields).toEqual(['price']);
    });
});

describe('DesignImportService.commit', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        idc = 0;
    });

    const candidate = (over: Partial<import('@jewellery-catalogue/types').ImportCandidate> = {}) => ({
        importKey: 'k1',
        name: 'New Ring',
        status: 'NEW' as const,
        changedFields: [],
        price: 6.15,
        designType: undefined,
        imageUrls: ['https://i.etsystatic.com/1/il/a/111/il_x.jpg'],
        mappedMaterials: ['Generic Copper Wire'],
        row: {
            title: 'New Ring',
            description: 'desc',
            price: 6.15,
            quantity: 3,
            materials: ['Copper'],
            imageUrls: ['https://i.etsystatic.com/1/il/a/111/il_x.jpg'],
            sku: '',
        },
        ...over,
    });

    it('creates a new design with seeded quantity and placeholder material', async () => {
        designRepo.getByUserId.mockResolvedValue([]);
        materialRepo.getByUserId.mockResolvedValue([]);
        const res = await makeService().commit({ candidates: [candidate({ importKey: 'k1' })] }, 'u1');
        expect(res.created).toBe(1);
        expect(designRepo.insert).toHaveBeenCalledTimes(1);
        const inserted = designRepo.insert.mock.calls[0][0];
        expect(inserted.userId).toBe('u1');
        expect(inserted.totalQuantity).toBe(3);
        expect(inserted.importSource).toBe('ETSY');
        expect(inserted.materials).toHaveLength(1);
        expect(inserted.imageIds).toHaveLength(1);
    });

    it('reports failure when no images could be fetched', async () => {
        designRepo.getByUserId.mockResolvedValue([]);
        materialRepo.getByUserId.mockResolvedValue([]);
        imageFetcher.fetch.mockRejectedValueOnce(new Error('boom'));
        const res = await makeService().commit({ candidates: [candidate({ importKey: 'k1' })] }, 'u1');
        expect(res.created).toBe(0);
        expect(res.failed[0].name).toBe('New Ring');
        expect(designRepo.insert).not.toHaveBeenCalled();
    });

    it('updates only etsy-owned fields on a changed match, preserving materials', async () => {
        const existing = {
            id: 'd1',
            userId: 'u1',
            name: 'New Ring',
            description: 'desc',
            price: 6.15,
            importKey: 'k1',
            etsyImageSignature: '111',
            materials: [{ id: 'real', type: 'WIRE' }],
            totalMaterialCosts: 42,
            totalQuantity: 9,
            imageIds: ['old-img'],
        } as any;
        designRepo.getByUserId.mockResolvedValue([existing]);
        materialRepo.getByUserId.mockResolvedValue([]);
        const res = await makeService().commit(
            {
                candidates: [
                    candidate({
                        importKey: 'k1',
                        status: 'CHANGED',
                        row: {
                            title: 'New Ring',
                            description: 'desc',
                            price: 9.99,
                            quantity: 3,
                            materials: ['Copper'],
                            imageUrls: ['https://i.etsystatic.com/1/il/a/111/il_x.jpg'],
                            sku: '',
                        },
                    }),
                ],
            },
            'u1'
        );
        expect(res.updated).toBe(1);
        const updated = designRepo.update.mock.calls[0][1];
        expect(updated.price).toBe(9.99);
        expect(updated.materials).toEqual([{ id: 'real', type: 'WIRE' }]);
        expect(updated.totalMaterialCosts).toBe(42);
        expect(updated.totalQuantity).toBe(9);
        expect(updated.imageIds).toEqual(['old-img']); // image signature unchanged -> not refetched
    });
});
