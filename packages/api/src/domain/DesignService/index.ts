import type {
    Design,
    EditDesign,
    Material,
    RequiredMaterial,
    UpdateDesign,
    UploadDesign,
} from '@jewellery-catalogue/types';
import { MaterialType } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { IdGenerator } from '../IdGenerator';
import type { ImageService } from '../ImageService';
import type { MaterialRepository } from '../MaterialRepository';

export class DesignService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly imageService: ImageService,
        private readonly idGenerator: IdGenerator,
        private readonly materialRepo: MaterialRepository
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
            totalQuantity: 0,
            lowStockThreshold: designData.lowStockThreshold,
        };

        await this.designRepo.insert(design);

        return design;
    }

    async updateDesign(id: string, updates: UpdateDesign, userId: string): Promise<Design> {
        if (!id) {
            throw Object.assign(new Error('Design ID is required'), { status: 400 });
        }

        const existing = await this.designRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Design not found'), { status: 404 });
        }

        // If adding quantity, produce designs
        if (updates.addQuantity && updates.addQuantity > 0) {
            return this.produceDesigns(id, updates.addQuantity, userId);
        }

        // Otherwise, just update basic fields
        const { addQuantity, ...basicUpdates } = updates;
        const updated = { ...existing, ...basicUpdates };

        await this.designRepo.update(id, updated);

        return updated;
    }

    async editDesignProperties(
        id: string,
        updates: EditDesign,
        imageBuffer: Buffer | null,
        contentType: string | null,
        userId: string
    ): Promise<Design> {
        if (!id) {
            throw Object.assign(new Error('Design ID is required'), { status: 400 });
        }

        const existing = await this.designRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Design not found'), { status: 404 });
        }

        let imageId = existing.imageId;

        // If new image is provided, upload it
        if (imageBuffer && contentType) {
            const newImageId = this.idGenerator.generate();
            await this.imageService.uploadImage(newImageId, imageBuffer, contentType);
            imageId = newImageId;
        }

        // Parse materials if needed
        let materials = existing.materials;
        if (updates.materials) {
            materials = typeof updates.materials === 'string' ? JSON.parse(updates.materials) : updates.materials;
        }

        const updated: Design = {
            ...existing,
            ...updates,
            materials,
            imageId,
        };

        await this.designRepo.update(id, updated);

        return updated;
    }

    async produceDesigns(designId: string, quantity: number, userId: string): Promise<Design> {
        // Get the design
        const design = await this.designRepo.getByIdAndUserId(designId, userId);

        if (!design) {
            throw Object.assign(new Error('Design not found'), { status: 404 });
        }

        // Check material availability and calculate requirements
        const materialUpdates: Array<{ material: Material; newQuantity: number; newLength: number }> = [];

        for (const requiredMaterial of design.materials) {
            const material = await this.materialRepo.getByIdAndUserId(requiredMaterial.id, userId);

            if (!material) {
                throw Object.assign(new Error(`Material '${requiredMaterial.name}' not found`), { status: 404 });
            }

            // Calculate total requirement
            let totalRequired: number;
            let currentStock: number;

            switch (material.type) {
                case MaterialType.WIRE:
                case MaterialType.CHAIN: {
                    totalRequired = (requiredMaterial as any).requiredLength * quantity;
                    currentStock = (material as any).totalLength;
                    break;
                }
                case MaterialType.BEAD:
                case MaterialType.EAR_HOOK: {
                    totalRequired = (requiredMaterial as any).requiredQuantity * quantity;
                    currentStock = (material as any).totalQuantity;
                    break;
                }
                default:
                    throw Object.assign(new Error(`Unknown material type: ${material.type}`), { status: 400 });
            }

            // Check if sufficient stock
            if (currentStock < totalRequired) {
                throw Object.assign(
                    new Error(
                        `Insufficient stock for material '${material.name}'. Required: ${totalRequired}, Available: ${currentStock}`
                    ),
                    { status: 400 }
                );
            }

            // Store the update
            materialUpdates.push({
                material,
                newQuantity: (material as any).totalQuantity ? (material as any).totalQuantity - totalRequired : 0,
                newLength: (material as any).totalLength ? (material as any).totalLength - totalRequired : 0,
            });
        }

        // All materials are available, proceed with updates
        for (const update of materialUpdates) {
            const { material, newQuantity, newLength } = update;

            let updatedMaterial: Material;

            switch (material.type) {
                case MaterialType.WIRE:
                case MaterialType.CHAIN: {
                    updatedMaterial = { ...material, totalLength: newLength } as Material;
                    break;
                }
                case MaterialType.BEAD:
                case MaterialType.EAR_HOOK: {
                    updatedMaterial = { ...material, totalQuantity: newQuantity } as Material;
                    break;
                }
                default:
                    updatedMaterial = material;
            }

            await this.materialRepo.update(material.id, updatedMaterial);
        }

        // Update design quantity
        const updatedDesign = {
            ...design,
            totalQuantity: design.totalQuantity + quantity,
        };

        await this.designRepo.update(designId, updatedDesign);

        return updatedDesign;
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
