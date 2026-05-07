import type { Draft, DraftType } from '@jewellery-catalogue/types';

import type { DraftRepository } from '../DraftRepository';
import type { IdGenerator } from '../IdGenerator';
import type { ImageService } from '../ImageService';

export class DraftService {
    constructor(
        private readonly draftRepo: DraftRepository,
        private readonly imageService: ImageService,
        private readonly idGenerator: IdGenerator
    ) {}

    async getDraftsByUserId(userId: string, type?: DraftType): Promise<Array<Draft>> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const drafts = await this.draftRepo.getByUserId(userId);

        return type ? drafts.filter((d) => d.type === type) : drafts;
    }

    async getDraft(id: string, userId: string): Promise<Draft> {
        const draft = await this.draftRepo.getByIdAndUserId(id, userId);

        if (!draft) {
            throw Object.assign(new Error('Draft not found'), { status: 404 });
        }

        return draft;
    }

    async createDraft(userId: string, type: DraftType, name: string, data: Record<string, unknown>): Promise<Draft> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const now = new Date();
        const draft: Draft = {
            id: this.idGenerator.generate(),
            userId,
            type,
            name: name || 'Untitled',
            data,
            createdAt: now,
            updatedAt: now,
        };

        await this.draftRepo.insert(draft);

        return draft;
    }

    async updateDraft(
        id: string,
        userId: string,
        name: string,
        data: Record<string, unknown>,
        imageId?: string
    ): Promise<Draft> {
        const existing = await this.draftRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Draft not found'), { status: 404 });
        }

        const updated: Draft = {
            ...existing,
            name: name || existing.name,
            data,
            imageId: imageId !== undefined ? imageId : existing.imageId,
            updatedAt: new Date(),
        };

        await this.draftRepo.update(id, updated);

        return updated;
    }

    async uploadDraftImage(id: string, userId: string, imageBuffer: Buffer, contentType: string): Promise<Draft> {
        const existing = await this.draftRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Draft not found'), { status: 404 });
        }

        const imageId = this.idGenerator.generate();
        await this.imageService.uploadImage(imageId, imageBuffer, contentType);

        const updated: Draft = {
            ...existing,
            imageId,
            updatedAt: new Date(),
        };

        await this.draftRepo.update(id, updated);

        return updated;
    }

    async deleteDraft(id: string, userId: string): Promise<void> {
        const existing = await this.draftRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Draft not found'), { status: 404 });
        }

        await this.draftRepo.delete(id);
    }
}
