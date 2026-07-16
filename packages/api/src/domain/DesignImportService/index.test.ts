import { beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import type { Design } from '@jewellery-catalogue/types';
import type { DesignRepository } from '../DesignRepository';
import type { IdGenerator } from '../IdGenerator';
import type { ImageService } from '../ImageService';
import type { MaterialRepository } from '../MaterialRepository';
import { deriveImportKey } from './deriveKeys';
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

describe('DesignImportService.commitCandidate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        idc = 0;
        // clearAllMocks resets call history but not mockRejectedValue set by earlier tests
        imageFetcher.fetch.mockImplementation(async () => ({ buffer: Buffer.from([1]), contentType: 'image/jpeg' }));
    });

    const newCandidate = (overrides: Partial<import('@jewellery-catalogue/types').EtsyRow> = {}) => {
        const row = {
            title: 'New Ring',
            description: 'desc',
            price: 6.15,
            quantity: 3,
            materials: ['Copper'],
            imageUrls: ['https://i.etsystatic.com/1/il/a/111/il_x.jpg'],
            sku: '',
            ...overrides,
        };
        return {
            importKey: deriveImportKey(row),
            name: row.title,
            status: 'NEW' as const,
            changedFields: [],
            price: row.price,
            imageUrls: row.imageUrls,
            mappedMaterials: [],
            row,
        };
    };

    it('creates a design for an unmatched candidate', async () => {
        designRepo.getByUserId.mockResolvedValue([]);
        materialRepo.getByUserId.mockResolvedValue([]);
        const service = makeService();
        const ctx = await service.createCommitContext('u1');
        const result = await service.commitCandidate(newCandidate(), ctx);
        expect(result).toEqual({ outcome: 'created', designId: expect.any(String) });
        expect(designRepo.insert).toHaveBeenCalledTimes(1);
    });

    it('fails the candidate when no images can be fetched', async () => {
        designRepo.getByUserId.mockResolvedValue([]);
        imageFetcher.fetch.mockRejectedValue(new Error('boom'));
        const service = makeService();
        const ctx = await service.createCommitContext('u1');
        const result = await service.commitCandidate(newCandidate(), ctx);
        expect(result).toEqual({ outcome: 'failed', reason: 'No images could be fetched' });
        expect(designRepo.insert).not.toHaveBeenCalled();
    });

    it('updates a matched candidate with changed fields', async () => {
        const row = newCandidate().row;
        const existing = {
            id: 'existing-1',
            userId: 'u1',
            importKey: deriveImportKey(row),
            name: 'Old name',
            description: 'old',
            price: 1,
            imageIds: ['img-old'],
            etsyImageSignature: 'sig-old',
        } as unknown as Design;
        designRepo.getByUserId.mockResolvedValue([existing]);
        const service = makeService();
        const ctx = await service.createCommitContext('u1');
        const result = await service.commitCandidate(newCandidate(), ctx);
        expect(result).toEqual({ outcome: 'updated', designId: 'existing-1' });
        expect(designRepo.update).toHaveBeenCalledTimes(1);
    });

    it('reports image progress per settled fetch', async () => {
        designRepo.getByUserId.mockResolvedValue([]);
        materialRepo.getByUserId.mockResolvedValue([]);
        const urls = [1, 2, 3].map((n) => `https://i.etsystatic.com/1/il/a/${n}/il_x.jpg`);
        const progress: Array<[number, number]> = [];
        const service = makeService();
        const ctx = await service.createCommitContext('u1');
        await service.commitCandidate(newCandidate({ imageUrls: urls }), ctx, (done, total) => {
            progress.push([done, total]);
        });
        expect(progress).toEqual([
            [1, 3],
            [2, 3],
            [3, 3],
        ]);
    });

    it('skips a matched candidate with no changed fields', async () => {
        designRepo.getByUserId.mockResolvedValue([]);
        materialRepo.getByUserId.mockResolvedValue([]);
        const service = makeService();
        const ctx = await service.createCommitContext('u1');
        await service.commitCandidate(newCandidate(), ctx);
        const inserted = designRepo.insert.mock.calls[0][0] as Design;
        designRepo.getByUserId.mockResolvedValue([inserted]);
        const ctx2 = await service.createCommitContext('u1');
        const result = await service.commitCandidate(newCandidate(), ctx2);
        expect(result).toEqual({ outcome: 'skipped', designId: inserted.id });
        expect(designRepo.update).not.toHaveBeenCalled();
    });
});
