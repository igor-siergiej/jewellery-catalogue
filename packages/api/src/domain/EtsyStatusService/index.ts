import { APIError } from '@imapps/api-utils/hono';
import type { Design } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient, EtsyListingSummary } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';

export interface EtsyListingWithLinkStatus extends EtsyListingSummary {
    linkedDesignId: string | null;
}

export class EtsyStatusService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly etsyClient: EtsyClient,
        private readonly etsyConnectionService: EtsyConnectionService
    ) {}

    async refreshStatus(designId: string, userId: string): Promise<Design> {
        const design = await this.designRepo.getByIdAndUserId(designId, userId);
        if (!design) {
            throw new APIError('Design not found', 404);
        }
        if (!design.etsy?.listingId) {
            throw new APIError('Design is not linked to an Etsy listing', 400);
        }

        const accessToken = await this.etsyConnectionService.getValidAccessToken(userId);
        const status = await this.etsyClient.getListing(accessToken, design.etsy.listingId);

        const updated: Design = { ...design, etsy: { ...design.etsy, state: status.state } };
        await this.designRepo.update(designId, updated);

        return updated;
    }

    async listShopListings(userId: string): Promise<EtsyListingWithLinkStatus[]> {
        const shopId = await this.etsyConnectionService.getShopId(userId);
        const [listings, designs] = await Promise.all([
            this.etsyClient.getShopListingsActive(shopId),
            this.designRepo.getByUserId(userId),
        ]);

        const designIdByListingId = new Map(
            designs
                .filter((d): d is Design & { etsy: NonNullable<Design['etsy']> } => !!d.etsy?.listingId)
                .map((d) => [d.etsy.listingId, d.id])
        );

        return listings.map((listing) => ({
            ...listing,
            linkedDesignId: designIdByListingId.get(listing.listingId) ?? null,
        }));
    }
}
