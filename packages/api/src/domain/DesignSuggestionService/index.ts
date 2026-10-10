import type { Logger } from '@imapps/api-utils';
import { APIError } from '@imapps/api-utils/hono';
import type { DesignSuggestion } from '@jewellery-catalogue/types';

import { streamToBuffer } from '../../utils/streamToBuffer';
import type { DesignRepository } from '../DesignRepository';
import type { DraftRepository } from '../DraftRepository';
import type { VisionLlm } from '../EtsyListingCopyService/types';
import type { ImageService } from '../ImageService';
import type { ImageResizer } from '../ImageService/types';
import type { MaterialRepository } from '../MaterialRepository';
import {
    buildDesignSuggestionPrompt,
    DESIGN_SUGGESTION_SYSTEM_PROMPT,
    type DesignSuggestionReply,
    designSuggestionReplySchema,
} from './prompt';

const MAX_PHOTOS = 3;
// Photos are base64-inlined into one request, so shrink them first; 1024px is plenty to identify materials.
const PHOTO_MAX_DIMENSION = 1024;

export interface UploadedPhoto {
    buffer: Buffer;
    contentType: string;
}

export class DesignSuggestionService {
    constructor(
        private readonly vision: VisionLlm,
        private readonly resizer: ImageResizer,
        private readonly materialRepo: MaterialRepository,
        private readonly imageService: ImageService,
        private readonly designRepo: DesignRepository,
        private readonly draftRepo: DraftRepository,
        private readonly logger?: Logger
    ) {}

    // fallow-ignore-next-line unused-class-member
    async suggest(userId: string, input: { photos: UploadedPhoto[]; imageIds: string[] }): Promise<DesignSuggestion> {
        if (!this.vision.isConfigured()) {
            throw new APIError('AI generation is not configured', 503);
        }

        const photos = [...input.photos, ...(await this.loadOwnedImages(userId, input.imageIds))].slice(0, MAX_PHOTOS);
        if (photos.length === 0) {
            throw new APIError('Add at least one photo first', 400);
        }

        const inventory = await this.materialRepo.getByUserId(userId);
        const imageUrls = await Promise.all(photos.map((photo) => this.toDataUri(photo)));

        const reply = await this.vision.completeStructured({
            operation: 'design.suggestFromPhoto',
            schema: designSuggestionReplySchema,
            system: DESIGN_SUGGESTION_SYSTEM_PROMPT,
            prompt: buildDesignSuggestionPrompt(inventory, imageUrls.length),
            imageUrls,
        });

        return this.constrainToInventory(reply, new Set(inventory.map((m) => m.id)));
    }

    // The model is told to use inventory ids only; anything else is dropped here, never passed on.
    private constrainToInventory(reply: DesignSuggestionReply, ownedIds: Set<string>): DesignSuggestion {
        const byId = new Map<string, DesignSuggestion['materials'][number]>();
        let dropped = 0;

        for (const material of reply.materials) {
            if (!ownedIds.has(material.materialId)) {
                dropped++;
                continue;
            }
            const existing = byId.get(material.materialId);
            byId.set(material.materialId, {
                materialId: material.materialId,
                quantity: (existing?.quantity ?? 0) + material.quantity,
                confidence: Math.max(existing?.confidence ?? 0, material.confidence),
            });
        }

        if (dropped > 0) {
            this.logger?.warn('Dropped suggested materials that are not in the inventory', { dropped });
        }

        return {
            name: reply.name,
            designType: reply.designType,
            materials: [...byId.values()],
            notInStock: reply.notInStock,
        };
    }

    private async loadOwnedImages(userId: string, imageIds: string[]): Promise<UploadedPhoto[]> {
        const photos: UploadedPhoto[] = [];
        for (const imageId of imageIds.slice(0, MAX_PHOTOS)) {
            const [ownedByDesign, ownedByDraft] = await Promise.all([
                this.designRepo.imageBelongsToUser(imageId, userId),
                this.draftRepo.imageBelongsToUser(imageId, userId),
            ]);
            if (!ownedByDesign && !ownedByDraft) {
                throw new APIError('Image not found', 404);
            }
            const image = await this.imageService.getImage(imageId);
            photos.push({ buffer: await streamToBuffer(image.stream), contentType: image.contentType });
        }
        return photos;
    }

    private async toDataUri(photo: UploadedPhoto): Promise<string> {
        try {
            const resized = await this.resizer.toWebp(photo.buffer, PHOTO_MAX_DIMENSION);
            return `data:image/webp;base64,${resized.toString('base64')}`;
        } catch {
            throw new APIError('One of the photos could not be read as an image', 400);
        }
    }
}
