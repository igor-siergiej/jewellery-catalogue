import { type FormMaterial, FormMaterialSchemas, type Material, MaterialType } from '@jewellery-catalogue/types';

import { convertFormDataToMaterial } from '../../utils/material-conversion';
import type { IdGenerator } from '../IdGenerator';
import type { MaterialRepository } from '../MaterialRepository';

export class MaterialService {
    constructor(
        private readonly materialRepo: MaterialRepository,
        private readonly idGenerator: IdGenerator
    ) {}

    async getMaterialsByUserId(userId: string): Promise<Array<Material>> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        return this.materialRepo.getByUserId(userId);
    }

    async getMaterial(id: string, userId: string): Promise<Material> {
        if (!id) {
            throw Object.assign(new Error('Material ID is required'), { status: 400 });
        }

        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const material = await this.materialRepo.getByIdAndUserId(id, userId);

        if (!material) {
            throw Object.assign(new Error('Material not found'), { status: 404 });
        }

        return material;
    }

    async addMaterial(materialData: FormMaterial, userId: string): Promise<Material> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        // Validate and convert material
        const material = this.validateAndConvertMaterial(materialData, userId);

        await this.materialRepo.insert(material);

        return material;
    }

    async updateMaterial(id: string, updates: Partial<Material>, userId: string): Promise<Material> {
        if (!id) {
            throw Object.assign(new Error('Material ID is required'), { status: 400 });
        }

        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const existing = await this.materialRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Material not found'), { status: 404 });
        }

        const updated = { ...existing, ...updates };

        await this.materialRepo.update(id, updated);

        return updated;
    }

    async deleteMaterial(id: string, userId: string): Promise<void> {
        if (!id) {
            throw Object.assign(new Error('Material ID is required'), { status: 400 });
        }

        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const material = await this.materialRepo.getByIdAndUserId(id, userId);

        if (!material) {
            throw Object.assign(new Error('Material not found'), { status: 404 });
        }

        await this.materialRepo.delete(id);
    }

    private validateAndConvertMaterial(materialData: FormMaterial, userId: string): Material {
        const materialType = materialData?.type;

        if (!(materialType in MaterialType)) {
            throw Object.assign(new Error(`Unknown material type: ${materialType}`), { status: 400 });
        }

        const schema = FormMaterialSchemas[materialType];

        const result = schema.safeParse(materialData);

        if (!result.success) {
            const issues = result.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
            }));

            throw Object.assign(
                new Error(
                    `Validation failed for material of type '${materialType}':\n` +
                        issues.map((i) => `- ${i.path}: ${i.message}`).join('\n')
                ),
                { status: 400, issues }
            );
        }

        const material = this.convertFormDataToMaterial(result.data);

        return {
            id: this.idGenerator.generate(),
            userId: userId,
            dateAdded: new Date(),
            ...material,
        } as Material;
    }

    private convertFormDataToMaterial(formData: FormMaterial): Partial<Material> {
        return convertFormDataToMaterial(formData);
    }
}
