import { FormMaterial, FormMaterialKeysMap, Material, MaterialType } from '@jewellery-catalogue/types';

import { convertFormDataToMaterial } from '../../utils/material-conversion';
import { CatalogueRepository } from '../CatalogueRepository';
import { IdGenerator } from '../IdGenerator';
import { MaterialRepository } from '../MaterialRepository';

export class MaterialService {
    constructor(
        private readonly materialRepo: MaterialRepository,
        private readonly catalogueRepo: CatalogueRepository,
        private readonly idGenerator: IdGenerator
    ) {}

    async getMaterialsByCatalogue(catalogueId: string): Promise<Array<Material>> {
        if (!catalogueId) {
            throw Object.assign(new Error('Catalogue ID is required'), { status: 400 });
        }

        return this.materialRepo.getByCatalogueId(catalogueId);
    }

    async getMaterial(id: string): Promise<Material> {
        if (!id) {
            throw Object.assign(new Error('Material ID is required'), { status: 400 });
        }

        const material = await this.materialRepo.getById(id);

        if (!material) {
            throw Object.assign(new Error('Material not found'), { status: 404 });
        }

        return material;
    }

    async addMaterial(catalogueId: string, materialData: FormMaterial): Promise<Material> {
        if (!catalogueId) {
            throw Object.assign(new Error('Catalogue ID is required'), { status: 400 });
        }

        // Verify catalogue exists
        const catalogue = await this.catalogueRepo.getById(catalogueId);
        if (!catalogue) {
            throw Object.assign(new Error('Catalogue not found'), { status: 404 });
        }

        // Validate and convert material
        const material = this.validateAndConvertMaterial(materialData);

        await this.materialRepo.insert(material);

        // Update catalogue to include material
        catalogue.materials.push(material);
        await this.catalogueRepo.update(catalogueId, catalogue);

        return material;
    }

    async updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
        if (!id) {
            throw Object.assign(new Error('Material ID is required'), { status: 400 });
        }

        const existing = await this.materialRepo.getById(id);
        if (!existing) {
            throw Object.assign(new Error('Material not found'), { status: 404 });
        }

        const updated = { ...existing, ...updates };
        await this.materialRepo.update(id, updated);

        return updated;
    }

    async deleteMaterial(id: string): Promise<void> {
        if (!id) {
            throw Object.assign(new Error('Material ID is required'), { status: 400 });
        }

        const material = await this.materialRepo.getById(id);
        if (!material) {
            throw Object.assign(new Error('Material not found'), { status: 404 });
        }

        await this.materialRepo.delete(id);
    }

    private validateAndConvertMaterial(materialData: FormMaterial): Material {
        const materialType = materialData?.type;

        if (!(materialType in MaterialType)) {
            throw Object.assign(new Error(`Unknown material type: ${materialType}`), { status: 400 });
        }

        const expectedKeys = Object.keys(FormMaterialKeysMap[materialType]);
        const missingKeys = expectedKeys.filter(key => !(key in materialData));

        if (missingKeys.length > 0) {
            throw Object.assign(
                new Error(`Material of type '${materialType}' is missing the following keys: ${missingKeys.join(', ')}`),
                { status: 400 }
            );
        }

        const filteredMaterial = Object.keys(materialData)
            .filter(key => expectedKeys.includes(key))
            .reduce((obj, key) => {
                obj[key] = materialData[key];
                return obj;
            }, {} as FormMaterial);

        return {
            id: this.idGenerator.generate(),
            ...this.convertFormDataToMaterial(filteredMaterial),
        } as Material;
    }

    private convertFormDataToMaterial(formData: FormMaterial): Partial<Material> {
        return convertFormDataToMaterial(formData);
    }
}
