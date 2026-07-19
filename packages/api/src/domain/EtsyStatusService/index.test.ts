import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { Design } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import { EtsyStatusService } from './index';

const mockDesignRepo = { getByIdAndUserId: mock(), getByUserId: mock(), update: mock() };
const mockEtsyClient = { getListing: mock(), getShopListingsActive: mock() };
const mockEtsyConnectionService = { getValidAccessToken: mock(), getShopId: mock() };

function makeDesign(overrides: Partial<Design> = {}): Design {
    return {
        id: 'design-1',
        userId: 'user-1',
        name: 'Silver Ring',
        description: 'A lovely ring.',
        timeRequired: '01:00',
        materials: [],
        imageIds: [],
        diagramImageIds: [],
        makingNotes: '',
        price: 25,
        totalMaterialCosts: 10,
        dateAdded: new Date(),
        totalQuantity: 2,
        ...overrides,
    };
}

describe('EtsyStatusService', () => {
    let service: EtsyStatusService;

    beforeEach(() => {
        for (const m of [
            ...Object.values(mockDesignRepo),
            ...Object.values(mockEtsyClient),
            ...Object.values(mockEtsyConnectionService),
        ]) {
            m.mockClear();
        }

        service = new EtsyStatusService(
            mockDesignRepo as unknown as DesignRepository,
            mockEtsyClient as unknown as EtsyClient,
            mockEtsyConnectionService as unknown as EtsyConnectionService
        );

        mockEtsyConnectionService.getValidAccessToken.mockResolvedValue('at-token');
        mockEtsyConnectionService.getShopId.mockResolvedValue(47408839);
    });

    describe('refreshStatus', () => {
        it('fetches the live state and persists it onto the design, preserving other etsy fields', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(
                makeDesign({ etsy: { listingId: 999, state: 'draft', lastPushedAt: 123, pushIncomplete: false } })
            );
            mockEtsyClient.getListing.mockResolvedValue({ listingId: 999, state: 'active' });

            const result = await service.refreshStatus('design-1', 'user-1');

            expect(mockEtsyClient.getListing).toHaveBeenCalledWith('at-token', 999);
            expect(result.etsy).toEqual({ listingId: 999, state: 'active', lastPushedAt: 123, pushIncomplete: false });
            expect(mockDesignRepo.update).toHaveBeenCalledWith('design-1', result);
        });

        it('does not persist and returns the original design when the fetched state is unchanged', async () => {
            const design = makeDesign({
                etsy: { listingId: 999, state: 'active', lastPushedAt: 123, pushIncomplete: false },
            });
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(design);
            mockEtsyClient.getListing.mockResolvedValue({ listingId: 999, state: 'active' });

            const result = await service.refreshStatus('design-1', 'user-1');

            expect(mockDesignRepo.update).not.toHaveBeenCalled();
            expect(result).toEqual(design);
        });

        it('throws when the design does not exist', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(null);

            await expect(service.refreshStatus('design-1', 'user-1')).rejects.toThrow();
            expect(mockEtsyClient.getListing).not.toHaveBeenCalled();
        });

        it('throws when the design is not linked to an Etsy listing', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign());

            await expect(service.refreshStatus('design-1', 'user-1')).rejects.toThrow();
            expect(mockEtsyClient.getListing).not.toHaveBeenCalled();
        });
    });

    describe('listShopListings', () => {
        it("flags listings already linked to one of this user's designs", async () => {
            mockDesignRepo.getByUserId.mockResolvedValue([
                makeDesign({ id: 'design-1', etsy: { listingId: 1, state: 'active', lastPushedAt: 1 } }),
                makeDesign({ id: 'design-2' }),
            ]);
            mockEtsyClient.getShopListingsActive.mockResolvedValue([
                { listingId: 1, title: 'Linked Listing', price: 25, url: 'https://etsy.com/listing/1' },
                { listingId: 2, title: 'Unlinked Listing', price: 30, url: 'https://etsy.com/listing/2' },
            ]);

            const result = await service.listShopListings('user-1');

            expect(mockEtsyConnectionService.getShopId).toHaveBeenCalledWith('user-1');
            expect(mockEtsyClient.getShopListingsActive).toHaveBeenCalledWith(47408839);
            expect(result).toEqual([
                {
                    listingId: 1,
                    title: 'Linked Listing',
                    price: 25,
                    url: 'https://etsy.com/listing/1',
                    linkedDesignId: 'design-1',
                },
                {
                    listingId: 2,
                    title: 'Unlinked Listing',
                    price: 30,
                    url: 'https://etsy.com/listing/2',
                    linkedDesignId: null,
                },
            ]);
        });

        it('returns every listing unlinked when the user has no linked designs', async () => {
            mockDesignRepo.getByUserId.mockResolvedValue([makeDesign()]);
            mockEtsyClient.getShopListingsActive.mockResolvedValue([
                { listingId: 5, title: 'Some Listing', price: 10, url: 'https://etsy.com/listing/5' },
            ]);

            const result = await service.listShopListings('user-1');

            expect(result).toEqual([
                {
                    listingId: 5,
                    title: 'Some Listing',
                    price: 10,
                    url: 'https://etsy.com/listing/5',
                    linkedDesignId: null,
                },
            ]);
        });
    });
});
