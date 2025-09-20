import { MongoDbConnection } from '@igor-siergiej/api-utils';
import { Catalogue } from '@jewellery-catalogue/types';
import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CollectionNames, Collections } from '../../dependencies/types';
import { MongoCatalogueRepository } from './index';

const mockCataloguesCollection = {
    findOne: vi.fn(),
    find: vi.fn(),
    insertOne: vi.fn(),
    findOneAndReplace: vi.fn(),
    deleteOne: vi.fn()
};

const mockDb = {
    getCollection: vi.fn().mockReturnValue(mockCataloguesCollection)
} as unknown as MongoDbConnection<Collections>;

describe('MongoCatalogueRepository', () => {
    let repository: MongoCatalogueRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        repository = new MongoCatalogueRepository(mockDb);
    });

    describe('constructor', () => {
        it('should initialize with correct collection name', () => {
            expect(repository['collectionName']).toBe(CollectionNames.Catalogues);
        });
    });

    describe('usesObjectId inheritance', () => {
        it('should use ObjectId for catalogues collection', () => {
            const result = repository['usesObjectId']();

            expect(result).toBe(true);
        });
    });

    describe('inherited CRUD operations with ObjectId', () => {
        const catalogueId = '507f1f77bcf86cd799439011';
        const mockCatalogue: Catalogue = {
            _id: new ObjectId(catalogueId),
            title: 'Test Catalogue',
            description: 'A test catalogue',
            dateCreated: new Date('2023-01-01'),
            author: 'Test Author',
            isPublic: true,
            designs: [],
            materials: []
        };

        it('should get catalogue by ObjectId', async () => {
            mockCataloguesCollection.findOne.mockResolvedValue(mockCatalogue);

            const result = await repository.getById(catalogueId);

            expect(mockCataloguesCollection.findOne).toHaveBeenCalledWith({
                _id: new ObjectId(catalogueId)
            });
            expect(result).toEqual(mockCatalogue);
        });

        it('should return null when catalogue not found', async () => {
            mockCataloguesCollection.findOne.mockResolvedValue(null);

            const result = await repository.getById('507f1f77bcf86cd799439999');

            expect(result).toBeNull();
        });

        it('should get all catalogues', async () => {
            const catalogues = [mockCatalogue];
            const mockCursor = {
                toArray: vi.fn().mockResolvedValue(catalogues)
            };
            mockCataloguesCollection.find.mockReturnValue(mockCursor);

            const result = await repository.getAll();

            expect(mockCataloguesCollection.find).toHaveBeenCalledWith({});
            expect(result).toEqual(catalogues);
        });

        it('should insert catalogue', async () => {
            mockCataloguesCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId(catalogueId) });

            await repository.insert(mockCatalogue);

            expect(mockCataloguesCollection.insertOne).toHaveBeenCalledWith(mockCatalogue);
        });

        it('should update catalogue by ObjectId', async () => {
            const updatedCatalogue = { ...mockCatalogue, title: 'Updated Catalogue' };
            mockCataloguesCollection.findOneAndReplace.mockResolvedValue({ value: updatedCatalogue });

            await repository.update(catalogueId, updatedCatalogue);

            expect(mockCataloguesCollection.findOneAndReplace).toHaveBeenCalledWith(
                { _id: new ObjectId(catalogueId) },
                updatedCatalogue
            );
        });

        it('should delete catalogue by ObjectId', async () => {
            mockCataloguesCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

            await repository.delete(catalogueId);

            expect(mockCataloguesCollection.deleteOne).toHaveBeenCalledWith({
                _id: new ObjectId(catalogueId)
            });
        });
    });

    describe('collection usage', () => {
        it('should get catalogues collection from database', () => {
            repository['collection']();

            expect(mockDb.getCollection).toHaveBeenCalledWith(CollectionNames.Catalogues);
        });
    });

    describe('error handling', () => {
        it('should propagate database errors during getById', async () => {
            const mockError = new Error('Database connection error');
            mockCataloguesCollection.findOne.mockRejectedValue(mockError);

            await expect(repository.getById('507f1f77bcf86cd799439011')).rejects.toThrow('Database connection error');
        });

        it('should propagate database errors during getAll', async () => {
            const mockError = new Error('Database query error');
            const mockCursor = {
                toArray: vi.fn().mockRejectedValue(mockError)
            };
            mockCataloguesCollection.find.mockReturnValue(mockCursor);

            await expect(repository.getAll()).rejects.toThrow('Database query error');
        });

        it('should propagate database errors during insert', async () => {
            const mockCatalogue: Catalogue = {
                title: 'Error Catalogue',
                description: 'Will cause error',
                dateCreated: new Date(),
                author: 'Error Author',
                isPublic: false,
                designs: [],
                materials: []
            };
            const mockError = new Error('Insert failed');
            mockCataloguesCollection.insertOne.mockRejectedValue(mockError);

            await expect(repository.insert(mockCatalogue)).rejects.toThrow('Insert failed');
        });

        it('should propagate database errors during update', async () => {
            const mockCatalogue: Catalogue = {
                _id: new ObjectId(),
                title: 'Error Update',
                description: 'Will cause error',
                dateCreated: new Date(),
                author: 'Error Author',
                isPublic: false,
                designs: [],
                materials: []
            };
            const mockError = new Error('Update failed');
            mockCataloguesCollection.findOneAndReplace.mockRejectedValue(mockError);

            await expect(repository.update('507f1f77bcf86cd799439011', mockCatalogue)).rejects.toThrow('Update failed');
        });

        it('should propagate database errors during delete', async () => {
            const mockError = new Error('Delete failed');
            mockCataloguesCollection.deleteOne.mockRejectedValue(mockError);

            await expect(repository.delete('507f1f77bcf86cd799439011')).rejects.toThrow('Delete failed');
        });
    });

    describe('complex catalogue data', () => {
        it('should handle catalogue with nested designs and materials', async () => {
            const complexCatalogue: Catalogue = {
                _id: new ObjectId('507f1f77bcf86cd799439020'),
                title: 'Complex Catalogue',
                description: 'Contains designs and materials',
                dateCreated: new Date('2023-03-01'),
                author: 'Complex Author',
                isPublic: true,
                designs: [
                    {
                        id: 'design-1',
                        title: 'Ring Design',
                        description: 'Simple ring',
                        dateCreated: new Date('2023-03-01'),
                        author: 'Designer',
                        instructions: ['Shape wire into circle'],
                        tags: ['ring'],
                        materials: ['wire-1'],
                        images: ['ring.jpg']
                    }
                ],
                materials: [
                    {
                        id: 'wire-1',
                        type: 'WIRE' as any,
                        name: 'Silver Wire',
                        brand: 'Wire Co',
                        purchaseUrl: 'https://wire.com',
                        diameter: 1.0,
                        wireType: 'FULL' as any,
                        metalType: 'SILVER' as any,
                        length: 10,
                        pricePerMeter: 2.0
                    }
                ]
            };

            mockCataloguesCollection.findOne.mockResolvedValue(complexCatalogue);

            const result = await repository.getById('507f1f77bcf86cd799439020');

            expect(result).toEqual(complexCatalogue);
            expect(result?.designs).toHaveLength(1);
            expect(result?.materials).toHaveLength(1);
        });

        it('should handle empty catalogue with no designs or materials', async () => {
            const emptyCatalogue: Catalogue = {
                _id: new ObjectId('507f1f77bcf86cd799439021'),
                title: 'Empty Catalogue',
                description: 'No content yet',
                dateCreated: new Date('2023-03-02'),
                author: 'Empty Author',
                isPublic: false,
                designs: [],
                materials: []
            };

            mockCataloguesCollection.insertOne.mockResolvedValue({ insertedId: emptyCatalogue._id });

            await repository.insert(emptyCatalogue);

            expect(mockCataloguesCollection.insertOne).toHaveBeenCalledWith(emptyCatalogue);
        });
    });
});