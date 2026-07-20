import { APIError } from '@imapps/api-utils/hono';
import { type Design, type DesignVariant, plainTextToHtml, type VariationGroup } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import type { IdGenerator } from '../IdGenerator';
import type { MaterialRepository } from '../MaterialRepository';
import { mapEtsyInventoryToVariations } from './mappers';

export class EtsyReconcileService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly etsyClient: EtsyClient,
        private readonly etsyConnectionService: EtsyConnectionService,
        private readonly idGenerator: IdGenerator,
        private readonly materialRepo: MaterialRepository
    ) {}

    // Best-effort: a listing may have no inventory record at all (Etsy 404s), or the
    // token may lack scope — either way this must never block design creation itself.
    private async importVariations(
        listingId: number,
        userId: string
    ): Promise<{ variationGroups: VariationGroup[]; variants: DesignVariant[] }> {
        try {
            const [accessToken, materials] = await Promise.all([
                this.etsyConnectionService.getValidAccessToken(userId),
                this.materialRepo.getByUserId(userId),
            ]);
            const inventory = await this.etsyClient.getListingInventory(accessToken, listingId);
            const { variationGroups, variants } = mapEtsyInventoryToVariations(inventory, materials, this.idGenerator);
            return { variationGroups, variants };
        } catch {
            return { variationGroups: [], variants: [] };
        }
    }

    // Throws if the listing isn't an active listing in this user's shop, or is already
    // linked to one of their designs — the precondition shared by create-from and link-to.
    private async assertListingIsLinkable(listingId: number, userId: string): Promise<void> {
        const [shopId, accessToken] = await Promise.all([
            this.etsyConnectionService.getShopId(userId),
            this.etsyConnectionService.getValidAccessToken(userId),
        ]);
        const [listings, designs] = await Promise.all([
            this.etsyClient.getShopListingsByState(accessToken, shopId, 'active'),
            this.designRepo.getByUserId(userId),
        ]);

        if (!listings.some((l) => l.listingId === listingId)) {
            throw new APIError('Listing not found in your Etsy shop', 400);
        }
        if (designs.some((d) => d.etsy?.listingId === listingId)) {
            throw new APIError('This listing is already linked to a design', 409);
        }
    }

    // fallow-ignore-next-line unused-class-member
    async createDesignFromListing(listingId: number, userId: string): Promise<{ designId: string }> {
        await this.assertListingIsLinkable(listingId, userId);

        const [detail, { variationGroups, variants }] = await Promise.all([
            this.etsyClient.getListingDetail(listingId),
            this.importVariations(listingId, userId),
        ]);
        const designId = this.idGenerator.generate();

        const design: Design = {
            id: designId,
            userId,
            name: detail.title,
            description: plainTextToHtml(detail.description),
            timeRequired: '00:00',
            materials: [],
            imageIds: [],
            diagramImageIds: [],
            makingNotes: '',
            price: detail.price,
            totalMaterialCosts: 0,
            dateAdded: new Date(),
            totalQuantity: 0,
            ...(variationGroups.length > 0 ? { variationGroups, variants } : {}),
            etsy: {
                listingId,
                state: 'active',
                lastPushedAt: null,
                pushIncomplete: true,
                imageUrls: detail.imageUrls,
            },
        };

        await this.designRepo.insert(design);
        return { designId };
    }

    // fallow-ignore-next-line unused-class-member
    async linkListingToDesign(listingId: number, designId: string, userId: string): Promise<void> {
        const design = await this.designRepo.getByIdAndUserId(designId, userId);
        if (!design) {
            throw new APIError('Design not found', 404);
        }
        if (design.etsy?.listingId) {
            throw new APIError('This design is already linked to an Etsy listing', 409);
        }

        await this.assertListingIsLinkable(listingId, userId);

        const updated: Design = { ...design, etsy: { listingId, state: 'active', lastPushedAt: null } };
        await this.designRepo.update(designId, updated);
    }
}
