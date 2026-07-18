import { APIError } from '@imapps/api-utils/hono';
import type { Design } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import type { ImageService } from '../ImageService';
import type { UserSettingsService } from '../UserSettingsService';
import { buildDraftListingInput, buildInventoryProducts, renderDescriptionTemplate } from './mappers';

const MAX_VARIATION_GROUPS = 2;

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBufferLike));
    }
    return Buffer.concat(chunks);
}

export class EtsyPushService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly imageService: ImageService,
        private readonly etsyClient: EtsyClient,
        private readonly etsyConnectionService: EtsyConnectionService,
        private readonly userSettingsService: UserSettingsService
    ) {}

    async push(
        designId: string,
        userId: string,
        overrides: { description?: string; price?: number } = {}
    ): Promise<Design> {
        const design = await this.designRepo.getByIdAndUserId(designId, userId);
        if (!design) {
            throw new APIError('Design not found', 404);
        }

        if (design.etsy?.listingId && !design.etsy.pushIncomplete) {
            throw new APIError('Design is already on Etsy', 409);
        }

        const groups = design.variationGroups ?? [];
        if (groups.length > MAX_VARIATION_GROUPS) {
            throw new APIError(`Etsy supports at most ${MAX_VARIATION_GROUPS} variation properties`, 400);
        }

        const settings = await this.userSettingsService.get(userId);
        const { accessToken, shopId } = await this.etsyConnectionService.getPushCredentials(userId);

        let listingId = design.etsy?.listingId;

        if (!listingId) {
            const taxonomyId = design.designType ? settings.etsyTaxonomyMap[design.designType] : undefined;
            if (!taxonomyId) {
                throw new APIError('No Etsy category is mapped for this design type', 400);
            }

            const description =
                overrides.description ?? renderDescriptionTemplate(settings.etsyDescriptionTemplate, design);
            const price = overrides.price ?? design.price;

            const draftInput = buildDraftListingInput({ design, description, price, taxonomyId });
            const created = await this.etsyClient.createDraftListing(accessToken, shopId, draftInput);
            listingId = created.listingId;

            await this.designRepo.update(designId, {
                ...design,
                etsy: { listingId, state: 'draft', lastPushedAt: null, pushIncomplete: true },
            });
        }

        const alreadyUploaded = await this.etsyClient.getListingImages(accessToken, listingId);
        const remainingImageIds = design.imageIds.slice(alreadyUploaded.imageIds.length);

        for (const [index, imageId] of remainingImageIds.entries()) {
            const image = await this.imageService.getImage(imageId);
            const buffer = await streamToBuffer(image.stream);
            await this.etsyClient.uploadListingImage(
                accessToken,
                shopId,
                listingId,
                { buffer, contentType: image.contentType, filename: imageId },
                alreadyUploaded.imageIds.length + index + 1
            );
        }

        if (groups.length > 0 && design.variants && design.variants.length > 0) {
            const products = buildInventoryProducts(design.variants, groups);
            await this.etsyClient.updateListingInventory(accessToken, listingId, products);
        }

        const updated: Design = {
            ...design,
            etsy: { listingId, state: 'draft', lastPushedAt: Date.now(), pushIncomplete: false },
        };
        await this.designRepo.update(designId, updated);

        return updated;
    }
}
