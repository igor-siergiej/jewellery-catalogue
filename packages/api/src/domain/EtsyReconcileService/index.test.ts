import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { Design } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import type { IdGenerator } from '../IdGenerator';
import { EtsyReconcileService } from './index';

const mockDesignRepo = { getByUserId: mock(), getByIdAndUserId: mock(), insert: mock(), update: mock() };
const mockEtsyClient = { getShopListingsActive: mock(), getListingDetail: mock() };
const mockEtsyConnectionService = { getShopId: mock() };
const mockIdGenerator = { generate: mock() };

function makeDesign(overrides: Partial<Design> = {}): Design {
    return {
        id: 'design-1',
        userId: 'user-1',
        name: 'Existing',
        description: '',
        timeRequired: '00:00',
        materials: [],
        imageIds: [],
        diagramImageIds: [],
        makingNotes: '',
        price: 10,
        totalMaterialCosts: 0,
        dateAdded: new Date(),
        totalQuantity: 0,
        ...overrides,
    };
}

function makeService() {
    return new EtsyReconcileService(
        mockDesignRepo as unknown as DesignRepository,
        mockEtsyClient as unknown as EtsyClient,
        mockEtsyConnectionService as unknown as EtsyConnectionService,
        mockIdGenerator as unknown as IdGenerator
    );
}

describe('EtsyReconcileService.createDesignFromListing', () => {
    beforeEach(() => {
        for (const m of [
            ...Object.values(mockDesignRepo),
            ...Object.values(mockEtsyClient),
            ...Object.values(mockEtsyConnectionService),
            ...Object.values(mockIdGenerator),
        ]) {
            m.mockClear();
        }
        mockEtsyConnectionService.getShopId.mockResolvedValue(47408839);
        mockIdGenerator.generate.mockReturnValue('new-design-1');
        mockDesignRepo.getByUserId.mockResolvedValue([]);
        mockEtsyClient.getShopListingsActive.mockResolvedValue([
            { listingId: 555, title: 'Silver Ring', price: 25, url: 'https://etsy.com/555' },
        ]);
        mockEtsyClient.getListingDetail.mockResolvedValue({
            title: 'Silver Ring',
            description: 'A lovely ring.',
            price: 25,
            imageUrls: ['https://i.etsy.com/1.jpg'],
        });
    });

    it('creates a stub design pre-filled from the listing and returns its id', async () => {
        const result = await makeService().createDesignFromListing(555, 'user-1');

        expect(result).toEqual({ designId: 'new-design-1' });
        expect(mockDesignRepo.insert).toHaveBeenCalledTimes(1);
        const inserted = mockDesignRepo.insert.mock.calls[0]![0] as Design;
        expect(inserted.id).toBe('new-design-1');
        expect(inserted.userId).toBe('user-1');
        expect(inserted.name).toBe('Silver Ring');
        expect(inserted.description).toBe('A lovely ring.');
        expect(inserted.price).toBe(25);
        expect(inserted.materials).toEqual([]);
        expect(inserted.imageIds).toEqual([]);
        expect(inserted.etsy).toEqual({
            listingId: 555,
            state: 'active',
            lastPushedAt: null,
            pushIncomplete: true,
            imageUrls: ['https://i.etsy.com/1.jpg'],
        });
    });

    it('rejects with 400 when the listing is not in the shop', async () => {
        await expect(makeService().createDesignFromListing(999, 'user-1')).rejects.toMatchObject({ status: 400 });
        expect(mockDesignRepo.insert).not.toHaveBeenCalled();
    });

    it('rejects with 409 when the listing is already linked to a design', async () => {
        mockDesignRepo.getByUserId.mockResolvedValue([
            makeDesign({ etsy: { listingId: 555, state: 'active', lastPushedAt: null } }),
        ]);
        await expect(makeService().createDesignFromListing(555, 'user-1')).rejects.toMatchObject({ status: 409 });
        expect(mockDesignRepo.insert).not.toHaveBeenCalled();
    });
});
