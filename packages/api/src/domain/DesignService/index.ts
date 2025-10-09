import type { Design, RequiredMaterial, UploadDesign } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { IdGenerator } from '../IdGenerator';
import type { ImageService } from '../ImageService';

export class DesignService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly imageService: ImageService,
        private readonly idGenerator: IdGenerator
    ) {}

    async getDesignsByUserId(userId: string): Promise<Array<Design>> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        return this.designRepo.getByUserId(userId);
    }

    async getDesign(id: string, userId: string): Promise<Design> {
        if (!id) {
            throw Object.assign(new Error('Design ID is required'), { status: 400 });
        }

        const design = await this.designRepo.getByIdAndUserId(id, userId);

        if (!design) {
            throw Object.assign(new Error('Design not found'), { status: 404 });
        }

        return design;
    }

    async addDesign(
        designData: UploadDesign,
        imageBuffer: Buffer,
        contentType: string,
        userId: string
    ): Promise<Design> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        // Generate IDs
        const designId = this.idGenerator.generate();
        const imageId = this.idGenerator.generate();

        // Upload image
        await this.imageService.uploadImage(imageId, imageBuffer, contentType);

        // Parse materials if needed
        let materials: Array<RequiredMaterial>;

        try {
            materials =
                typeof designData.materials === 'string' ? JSON.parse(designData.materials) : designData.materials;
        } catch {
            throw Object.assign(new Error('Invalid materials format'), { status: 400 });
        }

        const design: Design = {
            id: designId,
            userId: userId,
            name: designData.name,
            description: designData.description,
            timeRequired: designData.timeRequired,
            totalMaterialCosts: designData.totalMaterialCosts,
            price: designData.price,
            imageId,
            materials,
            dateAdded: new Date(),
        };

        await this.designRepo.insert(design);

        return design;
    }

    async updateDesign(id: string, updates: Partial<Design>, userId: string): Promise<Design> {
        if (!id) {
            throw Object.assign(new Error('Design ID is required'), { status: 400 });
        }

        const existing = await this.designRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Design not found'), { status: 404 });
        }

        const updated = { ...existing, ...updates };

        await this.designRepo.update(id, updated);

        return updated;
    }

    async deleteDesign(id: string, userId: string): Promise<void> {
        if (!id) {
            throw Object.assign(new Error('Design ID is required'), { status: 400 });
        }

        const design = await this.designRepo.getByIdAndUserId(id, userId);

        if (!design) {
            throw Object.assign(new Error('Design not found'), { status: 404 });
        }

        await this.designRepo.delete(id);
    }
}
