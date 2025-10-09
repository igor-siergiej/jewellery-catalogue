import { type FormMaterial, FormMaterialKeysMap, type Material, MaterialType } from '@jewellery-catalogue/types';

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

        const expectedKeys = Object.keys(FormMaterialKeysMap[materialType]);
        const missingKeys = expectedKeys.filter((key) => !(key in materialData));

        if (missingKeys.length > 0) {
            throw Object.assign(
                new Error(
                    `Material of type '${materialType}' is missing the following keys: ${missingKeys.join(', ')}`
                ),
                { status: 400 }
            );
        }

        const filteredMaterial = Object.keys(materialData)
            .filter((key) => expectedKeys.includes(key))
            .reduce((obj, key) => {
                obj[key] = materialData[key];

                return obj;
            }, {} as FormMaterial);

        return {
            id: this.idGenerator.generate(),
            userId: userId,
            updatedAt: new Date(),
            dateAdded: new Date(),
            ...this.convertFormDataToMaterial(filteredMaterial),
        } as Material;
    }

    private convertFormDataToMaterial(formData: FormMaterial): Partial<Material> {
        return convertFormDataToMaterial(formData);
    }
}
