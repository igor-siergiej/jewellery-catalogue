import { Design, RequiredMaterial, UploadDesign } from '@jewellery-catalogue/types';

import { CatalogueRepository } from '../CatalogueRepository';
import { DesignRepository } from '../DesignRepository';
import { IdGenerator } from '../IdGenerator';
import { ImageService } from '../ImageService';

export class DesignService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly catalogueRepo: CatalogueRepository,
        private readonly imageService: ImageService,
        private readonly idGenerator: IdGenerator
    ) {}

    async getDesignsByCatalogue(catalogueId: string): Promise<Array<Design>> {
        if (!catalogueId) {
            throw Object.assign(new Error('Catalogue ID is required'), { status: 400 });
        }

        return this.designRepo.getByCatalogueId(catalogueId);
    }

    async getDesign(id: string): Promise<Design> {
        if (!id) {
            throw Object.assign(new Error('Design ID is required'), { status: 400 });
        }

        const design = await this.designRepo.getById(id);

        if (!design) {
            throw Object.assign(new Error('Design not found'), { status: 404 });
        }

        return design;
    }

    async addDesign(catalogueId: string, designData: UploadDesign, imageBuffer: Buffer, contentType: string): Promise<Design> {
        if (!catalogueId) {
            throw Object.assign(new Error('Catalogue ID is required'), { status: 400 });
        }

        // Verify catalogue exists
        const catalogue = await this.catalogueRepo.getById(catalogueId);
        if (!catalogue) {
            throw Object.assign(new Error('Catalogue not found'), { status: 404 });
        }

        // Generate IDs
        const designId = this.idGenerator.generate();
        const imageId = this.idGenerator.generate();

        // Upload image
        await this.imageService.uploadImage(imageId, imageBuffer, contentType);

        // Parse materials if needed
        let materials: Array<RequiredMaterial>;
        try {
            materials = typeof designData.materials === 'string'
                ? JSON.parse(designData.materials)
                : designData.materials;
        } catch {
            throw Object.assign(new Error('Invalid materials format'), { status: 400 });
        }

        const design: Design = {
            id: designId,
            name: designData.name,
            description: designData.description,
            timeRequired: designData.timeRequired,
            totalMaterialCosts: designData.totalMaterialCosts,
            price: designData.price,
            imageId,
            materials
        };

        await this.designRepo.insert(design);

        // Update catalogue to include design
        catalogue.designs.push(design);
        await this.catalogueRepo.update(catalogueId, catalogue);

        return design;
    }

    async updateDesign(id: string, updates: Partial<Design>): Promise<Design> {
        if (!id) {
            throw Object.assign(new Error('Design ID is required'), { status: 400 });
        }

        const existing = await this.designRepo.getById(id);
        if (!existing) {
            throw Object.assign(new Error('Design not found'), { status: 404 });
        }

        const updated = { ...existing, ...updates };
        await this.designRepo.update(id, updated);

        return updated;
    }

    async deleteDesign(id: string): Promise<void> {
        if (!id) {
            throw Object.assign(new Error('Design ID is required'), { status: 400 });
        }

        const design = await this.designRepo.getById(id);
        if (!design) {
            throw Object.assign(new Error('Design not found'), { status: 404 });
        }

        await this.designRepo.delete(id);
    }
}
