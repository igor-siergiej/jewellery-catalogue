import { MongoDbConnection } from '@igor-siergiej/api-utils';
import { Material, MaterialType, METAL_TYPE, WIRE_TYPE } from '@jewellery-catalogue/types';
import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CollectionNames, Collections } from '../../dependencies/types';
import { MongoMaterialRepository } from './index';

const mockMaterialsCollection = {
    findOne: vi.fn(),
    find: vi.fn(),
    insertOne: vi.fn(),
    findOneAndReplace: vi.fn(),
    deleteOne: vi.fn()
};

const mockCataloguesCollection = {
    findOne: vi.fn()
};

const mockDb = {
    getCollection: vi.fn()
} as unknown as MongoDbConnection<Collections>;

describe('MongoMaterialRepository', () => {
    let repository: MongoMaterialRepository;

    beforeEach(() => {
        vi.clearAllMocks();

        (mockDb.getCollection as any).mockImplementation((collectionName: string) => {
            if (collectionName === CollectionNames.Materials) {
                return mockMaterialsCollection;
            }
            if (collectionName === CollectionNames.Catalogues) {
                return mockCataloguesCollection;
            }
            return {};
        });

        repository = new MongoMaterialRepository(mockDb);
    });

    describe('constructor', () => {
        it('should initialize with correct collection name', () => {
            expect(repository['collectionName']).toBe(CollectionNames.Materials);
        });
    });

    describe('usesObjectId', () => {
        it('should return false for materials', () => {
            const result = repository['usesObjectId']();

            expect(result).toBe(false);
        });
    });

    describe('inherited CRUD operations', () => {
        const mockMaterial: Material = {
            id: 'material-123',
            type: MaterialType.WIRE,
            name: 'Test Wire',
            brand: 'Test Brand',
            purchaseUrl: 'https://example.com',
            diameter: 1.5,
            wireType: WIRE_TYPE.FULL,
            metalType: METAL_TYPE.SILVER,
            length: 10,
            pricePerMeter: 2.5
        };

        it('should get material by id using string filter', async () => {
            mockMaterialsCollection.findOne.mockResolvedValue(mockMaterial);

            const result = await repository.getById('material-123');

            expect(mockMaterialsCollection.findOne).toHaveBeenCalledWith({ id: 'material-123' });
            expect(result).toEqual(mockMaterial);
        });

        it('should get all materials', async () => {
            const materials = [mockMaterial];
            const mockCursor = {
                toArray: vi.fn().mockResolvedValue(materials)
            };
            mockMaterialsCollection.find.mockReturnValue(mockCursor);

            const result = await repository.getAll();

            expect(mockMaterialsCollection.find).toHaveBeenCalledWith({});
            expect(result).toEqual(materials);
        });

        it('should insert material', async () => {
            mockMaterialsCollection.insertOne.mockResolvedValue({ insertedId: 'material-123' });

            await repository.insert(mockMaterial);

            expect(mockMaterialsCollection.insertOne).toHaveBeenCalledWith(mockMaterial);
        });

        it('should update material by id', async () => {
            const updatedMaterial = { ...mockMaterial, name: 'Updated Wire' };
            mockMaterialsCollection.findOneAndReplace.mockResolvedValue({ value: updatedMaterial });

            await repository.update('material-123', updatedMaterial);

            expect(mockMaterialsCollection.findOneAndReplace).toHaveBeenCalledWith(
                { id: 'material-123' },
                updatedMaterial
            );
        });

        it('should delete material by id', async () => {
            mockMaterialsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

            await repository.delete('material-123');

            expect(mockMaterialsCollection.deleteOne).toHaveBeenCalledWith({ id: 'material-123' });
        });
    });

    describe('getByCatalogueId', () => {
        it('should return materials from catalogue', async () => {
            const catalogueId = '507f1f77bcf86cd799439011';
            const materials: Array<Material> = [
                {
                    id: 'material-1',
                    type: MaterialType.BEAD,
                    name: 'Test Bead',
                    brand: 'Bead Brand',
                    purchaseUrl: 'https://beads.com',
                    diameter: 8,
                    colour: 'Blue',
                    quantity: 100,
                    pricePerBead: 0.1
                },
                {
                    id: 'material-2',
                    type: MaterialType.CHAIN,
                    name: 'Test Chain',
                    brand: 'Chain Brand',
                    purchaseUrl: 'https://chains.com',
                    metalType: METAL_TYPE.GOLD,
                    wireType: WIRE_TYPE.FILLED,
                    diameter: 2.0,
                    length: 5
                }
            ];

            const mockCatalogue = {
                _id: new ObjectId(catalogueId),
                title: 'Test Catalogue',
                materials
            };

            mockCataloguesCollection.findOne.mockResolvedValue(mockCatalogue);

            const result = await repository.getByCatalogueId(catalogueId);

            expect(mockDb.getCollection).toHaveBeenCalledWith(CollectionNames.Catalogues);
            expect(mockCataloguesCollection.findOne).toHaveBeenCalledWith({
                _id: new ObjectId(catalogueId)
            });
            expect(result).toEqual(materials);
        });

        it('should return empty array when catalogue has no materials', async () => {
            const catalogueId = '507f1f77bcf86cd799439012';
            const mockCatalogue = {
                _id: new ObjectId(catalogueId),
                title: 'Empty Catalogue'
                // no materials property
            };

            mockCataloguesCollection.findOne.mockResolvedValue(mockCatalogue);

            const result = await repository.getByCatalogueId(catalogueId);

            expect(result).toEqual([]);
        });

        it('should return empty array when catalogue materials is undefined', async () => {
            const catalogueId = '507f1f77bcf86cd799439013';
            const mockCatalogue = {
                _id: new ObjectId(catalogueId),
                title: 'Catalogue with undefined materials',
                materials: undefined
            };

            mockCataloguesCollection.findOne.mockResolvedValue(mockCatalogue);

            const result = await repository.getByCatalogueId(catalogueId);

            expect(result).toEqual([]);
        });

        it('should return empty array when catalogue does not exist', async () => {
            const catalogueId = '507f1f77bcf86cd799439014';

            mockCataloguesCollection.findOne.mockResolvedValue(null);

            const result = await repository.getByCatalogueId(catalogueId);

            expect(mockCataloguesCollection.findOne).toHaveBeenCalledWith({
                _id: new ObjectId(catalogueId)
            });
            expect(result).toEqual([]);
        });

        it('should propagate database errors', async () => {
            const catalogueId = '507f1f77bcf86cd799439015';
            const mockError = new Error('Database connection error');

            mockCataloguesCollection.findOne.mockRejectedValue(mockError);

            await expect(repository.getByCatalogueId(catalogueId)).rejects.toThrow('Database connection error');
        });

        it('should handle different material types in catalogue', async () => {
            const catalogueId = '507f1f77bcf86cd799439016';
            const materials: Array<Material> = [
                {
                    id: 'wire-1',
                    type: MaterialType.WIRE,
                    name: 'Silver Wire',
                    brand: 'Wire Co',
                    purchaseUrl: 'https://wire.com',
                    diameter: 1.0,
                    wireType: WIRE_TYPE.FULL,
                    metalType: METAL_TYPE.SILVER,
                    length: 20,
                    pricePerMeter: 1.5
                },
                {
                    id: 'bead-1',
                    type: MaterialType.BEAD,
                    name: 'Glass Beads',
                    brand: 'Bead Co',
                    purchaseUrl: 'https://bead.com',
                    diameter: 6,
                    colour: 'Green',
                    quantity: 50,
                    pricePerBead: 0.2
                },
                {
                    id: 'chain-1',
                    type: MaterialType.CHAIN,
                    name: 'Gold Chain',
                    brand: 'Chain Co',
                    purchaseUrl: 'https://chain.com',
                    metalType: METAL_TYPE.GOLD,
                    wireType: WIRE_TYPE.PLATED,
                    diameter: 1.5,
                    length: 10
                }
            ];

            const mockCatalogue = {
                _id: new ObjectId(catalogueId),
                title: 'Multi-type Catalogue',
                materials
            };

            mockCataloguesCollection.findOne.mockResolvedValue(mockCatalogue);

            const result = await repository.getByCatalogueId(catalogueId);

            expect(result).toEqual(materials);
            expect(result).toHaveLength(3);
            expect(result[0].type).toBe(MaterialType.WIRE);
            expect(result[1].type).toBe(MaterialType.BEAD);
            expect(result[2].type).toBe(MaterialType.CHAIN);
        });
    });
});
