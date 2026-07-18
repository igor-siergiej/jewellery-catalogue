import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Readable } from 'node:stream';
import type { Design } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import type { ImageService } from '../ImageService';
import type { UserSettingsService } from '../UserSettingsService';
import { EtsyPushService } from './index';

const mockDesignRepo = { getByIdAndUserId: mock(), update: mock() };
const mockImageService = { getImage: mock(), uploadImage: mock() };
const mockEtsyClient = {
    createDraftListing: mock(),
    uploadListingImage: mock(),
    getListingImages: mock(),
    updateListingInventory: mock(),
    getSellerTaxonomyNodes: mock(),
};
const mockEtsyConnectionService = { getPushCredentials: mock() };
const mockUserSettingsService = { get: mock() };

function makeDesign(overrides: Partial<Design> = {}): Design {
    return {
        id: 'design-1',
        userId: 'user-1',
        name: 'Silver Ring',
        description: 'A lovely ring.',
        timeRequired: '01:00',
        materials: [],
        imageIds: ['img-1'],
        diagramImageIds: ['diagram-1'],
        makingNotes: 'private notes',
        price: 25,
        totalMaterialCosts: 10,
        dateAdded: new Date(),
        totalQuantity: 2,
        designType: 'RING' as Design['designType'],
        ...overrides,
    };
}

describe('EtsyPushService', () => {
    let service: EtsyPushService;

    beforeEach(() => {
        [
            ...Object.values(mockDesignRepo),
            ...Object.values(mockImageService),
            ...Object.values(mockEtsyClient),
            ...Object.values(mockEtsyConnectionService),
            ...Object.values(mockUserSettingsService),
        ].forEach((m) => {
            m.mockClear();
        });

        service = new EtsyPushService(
            mockDesignRepo as unknown as DesignRepository,
            mockImageService as unknown as ImageService,
            mockEtsyClient as unknown as EtsyClient,
            mockEtsyConnectionService as unknown as EtsyConnectionService,
            mockUserSettingsService as unknown as UserSettingsService
        );

        mockEtsyConnectionService.getPushCredentials.mockResolvedValue({
            accessToken: 'at-token',
            shopId: 47408839,
        });
        mockUserSettingsService.get.mockResolvedValue({
            userId: 'user-1',
            hourlyWage: 10,
            profitMargin: 15,
            markupMultiplier: 2.5,
            hourlyRate: 0,
            etsyDescriptionTemplate: '{description}',
            etsyTaxonomyMap: { RING: 1234 },
        });
        mockImageService.getImage.mockResolvedValue({
            stream: Readable.from([Buffer.from('fake-image-bytes')]),
            contentType: 'image/png',
            cacheControl: 'public',
        });
        mockEtsyClient.getListingImages.mockResolvedValue({ imageIds: [] });
    });

    describe('push — new listing (no prior etsy.listingId)', () => {
        it('creates the listing, uploads only product photos (never diagram images), and persists the etsy block', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign());
            mockEtsyClient.createDraftListing.mockResolvedValue({ listingId: 999 });

            const result = await service.push('design-1', 'user-1');

            expect(mockEtsyClient.createDraftListing).toHaveBeenCalledWith(
                'at-token',
                47408839,
                expect.objectContaining({ title: 'Silver Ring', taxonomyId: 1234, quantity: 2 })
            );

            expect(mockImageService.getImage).toHaveBeenCalledTimes(1);
            expect(mockImageService.getImage).toHaveBeenCalledWith('img-1');
            expect(mockImageService.getImage).not.toHaveBeenCalledWith('diagram-1');
            expect(mockEtsyClient.uploadListingImage).toHaveBeenCalledTimes(1);

            expect(mockEtsyClient.updateListingInventory).not.toHaveBeenCalled();

            expect(result.etsy).toEqual({
                listingId: 999,
                state: 'draft',
                lastPushedAt: expect.any(Number),
                pushIncomplete: false,
            });

            const lastUpdateCall = mockDesignRepo.update.mock.calls.at(-1) as [string, Design];
            expect(lastUpdateCall[1].etsy?.pushIncomplete).toBe(false);
        });

        it('rejects when the design has more than 2 variation groups, before calling Etsy at all', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(
                makeDesign({
                    variationGroups: [
                        { id: 'g1', name: 'A', required: 1, options: [] },
                        { id: 'g2', name: 'B', required: 1, options: [] },
                        { id: 'g3', name: 'C', required: 1, options: [] },
                    ],
                })
            );

            await expect(service.push('design-1', 'user-1')).rejects.toThrow();
            expect(mockEtsyClient.createDraftListing).not.toHaveBeenCalled();
        });

        it('rejects when there is no taxonomy mapping for the design type', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(
                makeDesign({ designType: 'NECKLACE' as Design['designType'] })
            );

            await expect(service.push('design-1', 'user-1')).rejects.toThrow();
            expect(mockEtsyClient.createDraftListing).not.toHaveBeenCalled();
        });

        it('rejects re-push when the design already has a completed etsy.listingId', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(
                makeDesign({
                    etsy: { listingId: 555, state: 'draft', lastPushedAt: Date.now(), pushIncomplete: false },
                })
            );

            await expect(service.push('design-1', 'user-1')).rejects.toThrow();
            expect(mockEtsyClient.createDraftListing).not.toHaveBeenCalled();
        });

        it('uses the provided description/price overrides instead of re-rendering the template', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign());
            mockEtsyClient.createDraftListing.mockResolvedValue({ listingId: 999 });

            await service.push('design-1', 'user-1', { description: 'Edited by hand', price: 30 });

            expect(mockEtsyClient.createDraftListing).toHaveBeenCalledWith(
                'at-token',
                47408839,
                expect.objectContaining({ description: 'Edited by hand', price: 30 })
            );
        });
    });

    describe('push — resume (pushIncomplete: true)', () => {
        it('does not re-create the listing, and skips images Etsy already has', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(
                makeDesign({
                    imageIds: ['img-1', 'img-2'],
                    etsy: { listingId: 999, state: 'draft', lastPushedAt: null, pushIncomplete: true },
                })
            );
            mockEtsyClient.getListingImages.mockResolvedValue({ imageIds: [111] });

            await service.push('design-1', 'user-1');

            expect(mockEtsyClient.createDraftListing).not.toHaveBeenCalled();
            expect(mockImageService.getImage).toHaveBeenCalledTimes(1);
            expect(mockImageService.getImage).toHaveBeenCalledWith('img-2');
            expect(mockEtsyClient.uploadListingImage).toHaveBeenCalledTimes(1);
        });
    });

    describe('push — crash safety and resume', () => {
        it('persists pushIncomplete:true right after listing creation, propagates a later failure, then resumes without re-creating the listing', async () => {
            // Phase 1: createDraftListing succeeds, uploadListingImage crashes mid-flow.
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign());
            mockEtsyClient.createDraftListing.mockResolvedValue({ listingId: 999 });
            mockEtsyClient.uploadListingImage.mockRejectedValue(new Error('network fail'));

            await expect(service.push('design-1', 'user-1')).rejects.toThrow('network fail');

            expect(mockEtsyClient.createDraftListing).toHaveBeenCalledTimes(1);
            expect(mockDesignRepo.update).toHaveBeenCalledTimes(1);
            expect(mockDesignRepo.update).toHaveBeenCalledWith(
                'design-1',
                expect.objectContaining({
                    etsy: { listingId: 999, state: 'draft', lastPushedAt: null, pushIncomplete: true },
                })
            );

            // Phase 2: resumed push picks up the persisted listingId and completes.
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(
                makeDesign({
                    etsy: { listingId: 999, state: 'draft', lastPushedAt: null, pushIncomplete: true },
                })
            );
            mockEtsyClient.getListingImages.mockResolvedValue({ imageIds: [] });
            mockEtsyClient.uploadListingImage.mockResolvedValue(undefined);

            const result = await service.push('design-1', 'user-1');

            expect(mockEtsyClient.createDraftListing).toHaveBeenCalledTimes(1);
            expect(result.etsy).toEqual({
                listingId: 999,
                state: 'draft',
                lastPushedAt: expect.any(Number),
                pushIncomplete: false,
            });
        });
    });

    describe('push — variations', () => {
        it('builds and puts inventory when the design has variation groups and variants', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(
                makeDesign({
                    variationGroups: [
                        {
                            id: 'g1',
                            name: 'Colour',
                            required: 1,
                            options: [{ id: 'opt-1', material: { id: 'm1', name: 'Silver' } as any }],
                        },
                    ],
                    variants: [
                        {
                            id: 'v1',
                            optionIds: ['opt-1'],
                            name: 'Silver',
                            totalQuantity: 5,
                            totalMaterialCosts: 3,
                            price: 20,
                        },
                    ],
                })
            );
            mockEtsyClient.createDraftListing.mockResolvedValue({ listingId: 999 });

            await service.push('design-1', 'user-1');

            expect(mockEtsyClient.updateListingInventory).toHaveBeenCalledWith(
                'at-token',
                999,
                expect.arrayContaining([
                    expect.objectContaining({ offering: { price: 20, quantity: 5, isEnabled: true } }),
                ])
            );
        });
    });
});
