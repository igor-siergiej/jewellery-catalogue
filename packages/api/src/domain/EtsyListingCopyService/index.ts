import type { Logger } from '@imapps/api-utils';
import { APIError } from '@imapps/api-utils/hono';
import type { EtsyListingCopy } from '@jewellery-catalogue/types';

import { streamToBuffer } from '../../utils/streamToBuffer';
import type { DesignRepository } from '../DesignRepository';
import type { ImageService } from '../ImageService';
import { buildListingPrompt, LISTING_SYSTEM_PROMPT, listingCopyReplySchema } from './prompt';
import type { VisionLlm } from './types';

export const MAX_LISTING_PHOTOS = 3;
// Photos are base64-inlined into one JSON request; cap the total raw bytes to stay inside fal limits.
export const MAX_LISTING_PHOTO_BYTES = 4 * 1024 * 1024;

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
        let totalBytes = 0;
        for (const imageId of imageIds) {
            try {
                const image = await this.imageService.getImage(imageId);
                const buffer = await streamToBuffer(image.stream);
                if (totalBytes + buffer.length > MAX_LISTING_PHOTO_BYTES) {
                    this.logger?.warn('Skipping listing photo that would exceed the size budget', {
                        imageId,
                        size: buffer.length,
                    });
                    continue;
                }
                totalBytes += buffer.length;
                urls.push(`data:${image.contentType};base64,${buffer.toString('base64')}`);
            } catch (error) {
                this.logger?.warn('Skipping listing photo that failed to load', {
                    imageId,
                    message: (error as Error).message,
                });
            }
        }
        this.logger?.info('Sending listing photos', { count: urls.length, totalBytes });
        return urls;
    }
}
