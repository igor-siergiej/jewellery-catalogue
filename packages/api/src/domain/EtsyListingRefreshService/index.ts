import { APIError } from '@imapps/api-utils/hono';
import type { Design, EtsyListingCopy, EtsyListingRefreshProposal } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import type { EtsyListingCopyService } from '../EtsyListingCopyService';

// Regenerates copy for listings that are already live on Etsy. Proposing never touches Etsy;
// only an explicit apply for one listing does.
export class EtsyListingRefreshService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly copyService: EtsyListingCopyService,
        private readonly etsyClient: EtsyClient,
        private readonly connectionService: EtsyConnectionService
    ) {}

    // Copy is generated from design data, so only listings linked to one of the user's designs qualify.
    private async linkedDesign(listingId: number, userId: string): Promise<Design> {
        const designs = await this.designRepo.getByUserId(userId);
        const design = designs.find((d) => d.etsy?.listingId === listingId);
        if (!design) {
            throw new APIError('This listing is not linked to one of your designs', 404);
        }
        return design;
    }

    // fallow-ignore-next-line unused-class-member
    async propose(listingId: number, userId: string): Promise<EtsyListingRefreshProposal> {
        const design = await this.linkedDesign(listingId, userId);
        const [current, proposed] = await Promise.all([
            this.etsyClient.getListingDetail(listingId),
            this.copyService.generate(design.id, userId),
        ]);

        return {
            listingId,
            designId: design.id,
            designName: design.name,
            current: { title: current.title, description: current.description, tags: current.tags },
            proposed,
        };
    }

    // fallow-ignore-next-line unused-class-member
    async apply(listingId: number, userId: string, copy: EtsyListingCopy): Promise<void> {
        await this.linkedDesign(listingId, userId);
        const { accessToken, shopId } = await this.connectionService.getPushCredentials(userId);
        await this.etsyClient.updateListingCopy(accessToken, shopId, listingId, copy);
    }
}
