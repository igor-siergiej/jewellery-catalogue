import { APIError } from '@imapps/api-utils/hono';
import type { Design } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import type { IdGenerator } from '../IdGenerator';

export class EtsyReconcileService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly etsyClient: EtsyClient,
        private readonly etsyConnectionService: EtsyConnectionService,
        private readonly idGenerator: IdGenerator
    ) {}

    async createDesignFromListing(listingId: number, userId: string): Promise<{ designId: string }> {
        const shopId = await this.etsyConnectionService.getShopId(userId);
        const [listings, designs] = await Promise.all([
            this.etsyClient.getShopListingsActive(shopId),
            this.designRepo.getByUserId(userId),
        ]);

        if (!listings.some((l) => l.listingId === listingId)) {
            throw new APIError('Listing not found in your Etsy shop', 400);
        }
        if (designs.some((d) => d.etsy?.listingId === listingId)) {
            throw new APIError('This listing is already linked to a design', 409);
        }

        const detail = await this.etsyClient.getListingDetail(listingId);
        const designId = this.idGenerator.generate();

        const design: Design = {
            id: designId,
            userId,
            name: detail.title,
            description: detail.description,
            timeRequired: '00:00',
            materials: [],
            imageIds: [],
            diagramImageIds: [],
            makingNotes: '',
            price: detail.price,
            totalMaterialCosts: 0,
            dateAdded: new Date(),
            totalQuantity: 0,
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
}
