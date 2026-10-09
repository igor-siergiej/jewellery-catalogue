import type { Logger } from '@imapps/api-utils';
import { APIError } from '@imapps/api-utils/hono';
import type { EtsyListingCopy } from '@jewellery-catalogue/types';

import { streamToBuffer } from '../../utils/streamToBuffer';
import type { DesignRepository } from '../DesignRepository';
import type { ImageService } from '../ImageService';
import { buildListingPrompt, LISTING_SYSTEM_PROMPT, listingCopyReplySchema } from './prompt';
import type { VisionLlm } from './types';

export const MAX_LISTING_PHOTOS = 3;

export class EtsyListingCopyService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly imageService: ImageService,
        private readonly vision: VisionLlm,
        private readonly logger?: Logger
    ) {}

    async generate(designId: string, userId: string): Promise<EtsyListingCopy> {
        if (!this.vision.isConfigured()) {
            throw new APIError('AI generation is not configured', 503);
        }

        const design = await this.designRepo.getByIdAndUserId(designId, userId);
        if (!design) {
            throw new APIError('Design not found', 404);
        }

        const imageUrls = await this.loadPhotos(design.imageIds.slice(0, MAX_LISTING_PHOTOS));

        return this.vision.completeStructured({
            operation: 'etsy.listingCopy',
            schema: listingCopyReplySchema,
            system: LISTING_SYSTEM_PROMPT,
            prompt: buildListingPrompt(design, imageUrls.length),
            imageUrls,
        });
    }

    // The bucket is private, so fal cannot fetch our URLs; photos go inline as data URIs.
    private async loadPhotos(imageIds: string[]): Promise<string[]> {
        const urls: string[] = [];
        for (const imageId of imageIds) {
            try {
                const image = await this.imageService.getImage(imageId);
                const buffer = await streamToBuffer(image.stream);
                urls.push(`data:${image.contentType};base64,${buffer.toString('base64')}`);
            } catch (error) {
                this.logger?.warn('Skipping listing photo that failed to load', {
                    imageId,
                    message: (error as Error).message,
                });
            }
        }
        return urls;
    }
}
