// packages/api/src/domain/EtsyListingCopyService/index.test.ts
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Readable } from 'node:stream';
import type { Design } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { ImageService } from '../ImageService';
import { EtsyListingCopyService, MAX_LISTING_PHOTOS } from './index';
import type { VisionLlm } from './types';

const designRepo = { getByIdAndUserId: mock() };
const imageService = { getImage: mock() };
const vision = { isConfigured: mock(() => true), completeStructured: mock() };

const design = (overrides: Partial<Design> = {}): Design => ({
    id: 'd1',
    userId: 'u1',
    name: 'Lilac drop',
    timeRequired: '01:00',
    materials: [],
    imageIds: ['a', 'b', 'c', 'd'],
    diagramImageIds: ['diagram'],
    makingNotes: '',
    price: 10,
    description: '',
    totalMaterialCosts: 1,
    dateAdded: new Date(),
    totalQuantity: 1,
    ...overrides,
});

const copy = { title: 'Lilac Drop Necklace', description: 'Pretty.', tags: ['lilac necklace'] };

describe('EtsyListingCopyService', () => {
    let service: EtsyListingCopyService;

    beforeEach(() => {
        for (const m of [designRepo.getByIdAndUserId, imageService.getImage, vision.completeStructured]) m.mockReset();
        vision.isConfigured.mockImplementation(() => true);
        imageService.getImage.mockImplementation(async (name: string) => ({
            stream: Readable.from([Buffer.from(`bytes-${name}`)]),
            contentType: 'image/jpeg',
            cacheControl: 'public',
        }));
        vision.completeStructured.mockResolvedValue(copy);
        service = new EtsyListingCopyService(
            designRepo as unknown as DesignRepository,
            imageService as unknown as ImageService,
            vision as unknown as VisionLlm
        );
    });

    it('sends at most 3 product photos as base64 data URIs and returns the copy', async () => {
        designRepo.getByIdAndUserId.mockResolvedValue(design());

        const result = await service.generate('d1', 'u1');

        expect(result).toEqual(copy);
        expect(designRepo.getByIdAndUserId).toHaveBeenCalledWith('d1', 'u1');
        const opts = vision.completeStructured.mock.calls[0][0];
        expect(opts.imageUrls).toHaveLength(MAX_LISTING_PHOTOS);
        expect(opts.imageUrls[0]).toBe(`data:image/jpeg;base64,${Buffer.from('bytes-a').toString('base64')}`);
        expect(imageService.getImage).not.toHaveBeenCalledWith('diagram');
        expect(opts.prompt).toContain('Photos attached: 3');
    });

    it('skips photos that fail to load and still generates', async () => {
        designRepo.getByIdAndUserId.mockResolvedValue(design({ imageIds: ['missing', 'b'] }));
        imageService.getImage.mockImplementationOnce(async () => {
            throw Object.assign(new Error('Image not found'), { status: 404 });
        });

        await service.generate('d1', 'u1');

        expect(vision.completeStructured.mock.calls[0][0].imageUrls).toHaveLength(1);
    });

    it('404s for a design the user does not own', async () => {
        designRepo.getByIdAndUserId.mockResolvedValue(null);

        await expect(service.generate('d1', 'other')).rejects.toMatchObject({ status: 404 });
        expect(vision.completeStructured).not.toHaveBeenCalled();
    });

    it('503s without touching the design when AI is not configured', async () => {
        vision.isConfigured.mockImplementation(() => false);

        await expect(service.generate('d1', 'u1')).rejects.toMatchObject({ status: 503 });
        expect(designRepo.getByIdAndUserId).not.toHaveBeenCalled();
    });
});
