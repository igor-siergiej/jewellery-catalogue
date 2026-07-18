import type {
    Design,
    DesignVariant,
    EditDesign,
    Material,
    RequiredMaterial,
    UpdateDesign,
    UploadDesign,
    VariationGroup,
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
        imageBuffers: Array<{ buffer: Buffer; contentType: string }>,
        existingImageIds: string[],
        diagramImageBuffers: Array<{ buffer: Buffer; contentType: string }>,
        existingDiagramImageIds: string[],
        userId: string
    ): Promise<Design> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const designId = this.idGenerator.generate();

        const newImageIds = await Promise.all(
            imageBuffers.map(async ({ buffer, contentType }) => {
                const imageId = this.idGenerator.generate();
                await this.imageService.uploadImage(imageId, buffer, contentType);
                return imageId;
            })
        );

        const newDiagramImageIds = await Promise.all(
            diagramImageBuffers.map(async ({ buffer, contentType }) => {
                const imageId = this.idGenerator.generate();
                await this.imageService.uploadImage(imageId, buffer, contentType);
                return imageId;
            })
        );

        const imageIds = [...existingImageIds, ...newImageIds];
        const diagramImageIds = [...existingDiagramImageIds, ...newDiagramImageIds];

        let materials: Array<RequiredMaterial>;

        try {
            materials =
                typeof designData.materials === 'string' ? JSON.parse(designData.materials) : designData.materials;
        } catch {
            throw Object.assign(new Error('Invalid materials format'), { status: 400 });
        }

        let variationGroups: VariationGroup[] | undefined;
        let variants: DesignVariant[] | undefined;

        if (designData.variationGroups) {
            try {
                variationGroups =
                    typeof designData.variationGroups === 'string'
                        ? JSON.parse(designData.variationGroups)
                        : designData.variationGroups;
            } catch {
                throw Object.assign(new Error('Invalid variationGroups format'), { status: 400 });
            }
        }

        if (designData.variants) {
            try {
                const parsed: DesignVariant[] =
                    typeof designData.variants === 'string' ? JSON.parse(designData.variants) : designData.variants;
                variants = parsed.map((v) => ({ ...v, totalQuantity: 0 }));
            } catch {
                throw Object.assign(new Error('Invalid variants format'), { status: 400 });
            }
        }

        const design: Design = {
            id: designId,
            userId: userId,
            name: designData.name,
            description: designData.description,
            timeRequired: designData.timeRequired,
            totalMaterialCosts: designData.totalMaterialCosts,
            price: designData.price,
            imageIds,
            diagramImageIds,
            makingNotes: designData.makingNotes ?? '',
            materials,
            dateAdded: new Date(),
            totalQuantity: 0,
            lowStockThreshold: designData.lowStockThreshold,
            variationGroups,
            variants,
            designType: designData.designType,
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

        if (updates.addQuantity && updates.addQuantity > 0) {
            return this.produceDesigns(id, updates.addQuantity, userId, updates.variantId);
        }

        const { addQuantity, variantId, ...basicUpdates } = updates;
        const updated = { ...existing, ...basicUpdates };

        await this.designRepo.update(id, updated);

        return updated;
    }

    async editDesignProperties(
        id: string,
        updates: EditDesign,
        imageBuffers: Array<{ buffer: Buffer; contentType: string }>,
        keepImageIds: string[],
        userId: string
    ): Promise<Design> {
        if (!id) {
            throw Object.assign(new Error('Design ID is required'), { status: 400 });
        }

        const existing = await this.designRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Design not found'), { status: 404 });
        }

        const newImageIds = await Promise.all(
            imageBuffers.map(async ({ buffer, contentType }) => {
                const imageId = this.idGenerator.generate();
                await this.imageService.uploadImage(imageId, buffer, contentType);
                return imageId;
            })
        );

        const imageIds = [...keepImageIds, ...newImageIds];

        let materials = existing.materials;
        if (updates.materials) {
            materials = typeof updates.materials === 'string' ? JSON.parse(updates.materials) : updates.materials;
        }

        let variationGroups = existing.variationGroups;
        let variants = existing.variants;

        if (updates.variationGroups !== undefined) {
            variationGroups = updates.variationGroups;
        }

        if (updates.variants !== undefined) {
            variants = mergeVariants(existing.variants ?? [], updates.variants);
        }

        const updated: Design = {
            ...existing,
            ...updates,
            materials,
            imageIds,
            variationGroups,
            variants,
        };

        await this.designRepo.update(id, updated);

        return updated;
    }

    async produceDesigns(designId: string, quantity: number, userId: string, variantId?: string): Promise<Design> {
        const design = await this.designRepo.getByIdAndUserId(designId, userId);

        if (!design) {
            throw Object.assign(new Error('Design not found'), { status: 404 });
        }

        // Collect all materials to deduct: shared + variant-specific
        const materialsToDeduct: Array<RequiredMaterial> = [...design.materials];

        if (variantId) {
            const variant = design.variants?.find((v) => v.id === variantId);
            if (!variant) {
                throw Object.assign(new Error('Variant not found'), { status: 404 });
            }
            const optionMaterials = resolveVariantMaterials(variant, design.variationGroups ?? []);
            materialsToDeduct.push(...optionMaterials);
        }

        const materialUpdates: Array<{ material: Material; newQuantity: number; newLength: number }> = [];

        for (const requiredMaterial of materialsToDeduct) {
            const material = await this.materialRepo.getByIdAndUserId(requiredMaterial.id, userId);

            if (!material) {
                throw Object.assign(new Error(`Material '${requiredMaterial.name}' not found`), { status: 404 });
            }

            let totalRequired: number;
            let currentStock: number;

            switch (material.type) {
                case MaterialType.WIRE:
                case MaterialType.CHAIN: {
                    totalRequired = ((requiredMaterial as any).requiredLength / 100) * quantity;
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

            if (currentStock < totalRequired) {
                throw Object.assign(
                    new Error(
                        `Insufficient stock for material '${material.name}'. Required: ${totalRequired}, Available: ${currentStock}`
                    ),
                    { status: 400 }
                );
            }

            materialUpdates.push({
                material,
                newQuantity: (material as any).totalQuantity ? (material as any).totalQuantity - totalRequired : 0,
                newLength: (material as any).totalLength ? (material as any).totalLength - totalRequired : 0,
            });
        }

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

        let updatedVariants = design.variants;
        if (variantId && updatedVariants) {
            updatedVariants = updatedVariants.map((v) =>
                v.id === variantId ? { ...v, totalQuantity: v.totalQuantity + quantity } : v
            );
        }

        const updatedDesign = {
            ...design,
            totalQuantity: design.totalQuantity + quantity,
            variants: updatedVariants,
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

function resolveVariantMaterials(variant: DesignVariant, groups: VariationGroup[]): RequiredMaterial[] {
    const materials: RequiredMaterial[] = [];
    for (const optionId of variant.optionIds) {
        for (const group of groups) {
            const option = group.options.find((o) => o.id === optionId);
            if (option) {
                materials.push(option.material);
                break;
            }
        }
    }
    return materials;
}

function mergeVariants(existing: DesignVariant[], incoming: DesignVariant[]): DesignVariant[] {
    return incoming.map((newVariant) => {
        const match = existing.find(
            (e) =>
                e.optionIds.length === newVariant.optionIds.length &&
                e.optionIds.every((id, i) => id === newVariant.optionIds[i])
        );
        return match ? { ...newVariant, totalQuantity: match.totalQuantity } : { ...newVariant, totalQuantity: 0 };
    });
}
