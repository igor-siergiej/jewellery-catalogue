import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { type Design, type Material, MaterialType } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import type { IdGenerator } from '../IdGenerator';
import type { MaterialRepository } from '../MaterialRepository';
import { EtsyReconcileService } from './index';

const mockDesignRepo = { getByUserId: mock(), getByIdAndUserId: mock(), insert: mock(), update: mock() };
const mockEtsyClient = { getShopListingsByState: mock(), getListingDetail: mock(), getListingInventory: mock() };
const mockEtsyConnectionService = { getShopId: mock(), getValidAccessToken: mock() };
const mockMaterialRepo = { getByUserId: mock() };
const mockIdGenerator = { generate: mock() };

function makeMaterial(overrides: Partial<Material> = {}): Material {
    return {
        type: MaterialType.BEAD,
        id: 'material-1',
        userId: 'user-1',
        name: 'Red',
        brand: '',
        purchaseUrl: '',
        dateAdded: new Date().toISOString(),
        diameter: 6,
        colour: 'red',
        quantityPerPack: 100,
        pricePerPack: 5,
        totalQuantity: 100,
        pricePerBead: 0.05,
        ...overrides,
    } as Material;
}

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
        mockIdGenerator as unknown as IdGenerator,
        mockMaterialRepo as unknown as MaterialRepository
    );
}

describe('EtsyReconcileService.createDesignFromListing', () => {
    beforeEach(() => {
        for (const m of [
            ...Object.values(mockDesignRepo),
            ...Object.values(mockEtsyClient),
            ...Object.values(mockEtsyConnectionService),
            ...Object.values(mockMaterialRepo),
            ...Object.values(mockIdGenerator),
        ]) {
            m.mockClear();
        }
        mockEtsyConnectionService.getShopId.mockResolvedValue(47408839);
        mockEtsyConnectionService.getValidAccessToken.mockResolvedValue('access-token');
        mockIdGenerator.generate.mockReturnValue('new-design-1');
        mockDesignRepo.getByUserId.mockResolvedValue([]);
        mockMaterialRepo.getByUserId.mockResolvedValue([]);
        mockEtsyClient.getListingInventory.mockResolvedValue({ products: [] });
        mockEtsyClient.getShopListingsByState.mockResolvedValue([
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
        expect(inserted.description).toBe('<p>A lovely ring.</p>');
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

    it('preserves new lines from the listing description as HTML paragraphs/breaks', async () => {
        mockEtsyClient.getListingDetail.mockResolvedValue({
            title: 'Silver Ring',
            description: 'Line one.\nLine two.\n\nSecond paragraph.',
            price: 25,
            imageUrls: ['https://i.etsy.com/1.jpg'],
        });

        const result = await makeService().createDesignFromListing(555, 'user-1');

        expect(result).toEqual({ designId: 'new-design-1' });
        const inserted = mockDesignRepo.insert.mock.calls[0]![0] as Design;
        expect(inserted.description).toBe('<p>Line one.<br>Line two.</p><p>Second paragraph.</p>');
    });

    it('imports variations for property values that match an existing material by name', async () => {
        let counter = 0;
        mockIdGenerator.generate.mockImplementation(() => `id-${++counter}`);
        mockMaterialRepo.getByUserId.mockResolvedValue([
            makeMaterial({ id: 'material-red', name: 'Red' }),
            makeMaterial({ id: 'material-blue', name: 'Blue' }),
        ]);
        mockEtsyClient.getListingInventory.mockResolvedValue({
            products: [
                {
                    offerings: [{ price: 20, quantity: 3, isEnabled: true }],
                    propertyValues: [{ propertyName: 'Color', values: ['Red'] }],
                },
                {
                    offerings: [{ price: 22, quantity: 2, isEnabled: true }],
                    propertyValues: [{ propertyName: 'Color', values: ['Blue'] }],
                },
                {
                    // "Green" has no matching material in the catalogue and must be dropped.
                    offerings: [{ price: 24, quantity: 1, isEnabled: true }],
                    propertyValues: [{ propertyName: 'Color', values: ['Green'] }],
                },
            ],
        });

        await makeService().createDesignFromListing(555, 'user-1');

        const inserted = mockDesignRepo.insert.mock.calls[0]![0] as Design;
        expect(inserted.variationGroups).toHaveLength(1);
        expect(inserted.variationGroups![0].name).toBe('Color');
        expect(inserted.variationGroups![0].options.map((o) => o.material.name)).toEqual(['Red', 'Blue']);
        expect(inserted.variants).toHaveLength(2);
        expect(inserted.variants!.map((v) => v.name)).toEqual(['Red', 'Blue']);
        expect(inserted.variants!.map((v) => v.price)).toEqual([20, 22]);
    });

    it('does not fail design creation when the inventory fetch errors', async () => {
        mockEtsyClient.getListingInventory.mockRejectedValue(new Error('no inventory record'));

        const result = await makeService().createDesignFromListing(555, 'user-1');

        expect(result).toEqual({ designId: 'new-design-1' });
        const inserted = mockDesignRepo.insert.mock.calls[0]![0] as Design;
        expect(inserted.variationGroups).toBeUndefined();
        expect(inserted.variants).toBeUndefined();
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

describe('EtsyReconcileService.linkListingToDesign', () => {
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
        mockDesignRepo.getByUserId.mockResolvedValue([]);
        mockEtsyClient.getShopListingsByState.mockResolvedValue([
            { listingId: 555, title: 'Silver Ring', price: 25, url: 'https://etsy.com/555' },
        ]);
        mockEtsyClient.getListingDetail.mockResolvedValue({
            title: 'Silver Ring',
            description: 'A lovely ring.',
            price: 25,
            imageUrls: ['https://i.etsy.com/555.jpg'],
        });
    });

    it('writes the etsy link (with the listing image) onto an existing unlinked design', async () => {
        mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign({ id: 'design-9' }));

        await makeService().linkListingToDesign(555, 'design-9', 'user-1');

        expect(mockDesignRepo.update).toHaveBeenCalledTimes(1);
        const [id, updated] = mockDesignRepo.update.mock.calls[0]! as [string, Design];
        expect(id).toBe('design-9');
        expect(updated.etsy).toEqual({
            listingId: 555,
            state: 'active',
            lastPushedAt: null,
            imageUrls: ['https://i.etsy.com/555.jpg'],
        });
    });

    it('rejects with 404 when the design does not belong to the user', async () => {
        mockDesignRepo.getByIdAndUserId.mockResolvedValue(null);
        await expect(makeService().linkListingToDesign(555, 'nope', 'user-1')).rejects.toMatchObject({ status: 404 });
        expect(mockDesignRepo.update).not.toHaveBeenCalled();
    });

    it('rejects with 409 when the design is already linked', async () => {
        mockDesignRepo.getByIdAndUserId.mockResolvedValue(
            makeDesign({ id: 'design-9', etsy: { listingId: 1, state: 'active', lastPushedAt: null } })
        );
        await expect(makeService().linkListingToDesign(555, 'design-9', 'user-1')).rejects.toMatchObject({
            status: 409,
        });
        expect(mockDesignRepo.update).not.toHaveBeenCalled();
    });

    it('rejects with 400 when the listing is not in the shop', async () => {
        mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign({ id: 'design-9' }));
        await expect(makeService().linkListingToDesign(999, 'design-9', 'user-1')).rejects.toMatchObject({
            status: 400,
        });
        expect(mockDesignRepo.update).not.toHaveBeenCalled();
    });

    it('rejects with 409 when the listing is already linked to another design', async () => {
        mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign({ id: 'design-9' }));
        mockDesignRepo.getByUserId.mockResolvedValue([
            makeDesign({ id: 'design-7', etsy: { listingId: 555, state: 'active', lastPushedAt: null } }),
        ]);
        await expect(makeService().linkListingToDesign(555, 'design-9', 'user-1')).rejects.toMatchObject({
            status: 409,
        });
        expect(mockDesignRepo.update).not.toHaveBeenCalled();
    });
});
