import { Catalogue } from '@jewellery-catalogue/types';
import { ObjectId } from 'mongodb';

import { CatalogueRepository } from '../CatalogueRepository';
import { IdGenerator } from '../IdGenerator';

export class CatalogueService {
    constructor(
        private readonly repo: CatalogueRepository,
        private readonly idGenerator: IdGenerator
    ) {}

    async getCatalogue(id: string): Promise<Catalogue> {
        if (!id) {
            throw Object.assign(new Error('Catalogue ID is required'), { status: 400 });
        }

        const catalogue = await this.repo.getById(id);

        if (!catalogue) {
            throw Object.assign(new Error('Catalogue not found'), { status: 404 });
        }

        return catalogue;
    }

    async getAllCatalogues(): Promise<Array<Catalogue>> {
        return this.repo.getAll();
    }

    async createCatalogue(id?: string): Promise<Catalogue> {
        const catalogueId = id || this.idGenerator.generate();

        // Check if catalogue with this ID already exists
        const existing = await this.repo.getById(catalogueId);
        if (existing) {
            throw Object.assign(new Error('Catalogue with this ID already exists'), { status: 409 });
        }

        const newCatalogue: Catalogue = {
            _id: new ObjectId(catalogueId) as any,
            designs: [],
            materials: []
        };

        await this.repo.insert(newCatalogue);
        return newCatalogue;
    }

    async deleteCatalogue(id: string): Promise<void> {
        if (!id) {
            throw Object.assign(new Error('Catalogue ID is required'), { status: 400 });
        }

        const catalogue = await this.repo.getById(id);
        if (!catalogue) {
            throw Object.assign(new Error('Catalogue not found'), { status: 404 });
        }

        await this.repo.delete(id);
    }
}
