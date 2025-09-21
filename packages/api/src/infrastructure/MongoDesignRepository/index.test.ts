import { MongoDbConnection } from '@igor-siergiej/api-utils';
import { Design } from '@jewellery-catalogue/types';
import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CollectionNames, Collections } from '../../dependencies/types';
import { MongoDesignRepository } from './index';

const mockDesignsCollection = {
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

describe('MongoDesignRepository', () => {
    let repository: MongoDesignRepository;

    beforeEach(() => {
        vi.clearAllMocks();

        (mockDb.getCollection as any).mockImplementation((collectionName: string) => {
            if (collectionName === CollectionNames.Designs) {
                return mockDesignsCollection;
            }
            if (collectionName === CollectionNames.Catalogues) {
                return mockCataloguesCollection;
            }
            return {};
        });

        repository = new MongoDesignRepository(mockDb);
    });

    describe('constructor', () => {
        it('should initialize with correct collection name', () => {
            expect(repository['collectionName']).toBe(CollectionNames.Designs);
        });
    });

    describe('usesObjectId', () => {
        it('should return false for designs', () => {
            const result = repository['usesObjectId']();

            expect(result).toBe(false);
        });
    });

    describe('inherited CRUD operations', () => {
        const mockDesign: Design = {
            id: 'design-123',
            title: 'Test Design',
            description: 'A test design',
            dateCreated: new Date('2023-01-01'),
            author: 'Test Author',
            instructions: ['Step 1', 'Step 2'],
            tags: ['test', 'design'],
            materials: ['material-1', 'material-2'],
            images: ['image-1.jpg', 'image-2.jpg']
        };

        it('should get design by id using string filter', async () => {
            mockDesignsCollection.findOne.mockResolvedValue(mockDesign);

            const result = await repository.getById('design-123');

            expect(mockDesignsCollection.findOne).toHaveBeenCalledWith({ id: 'design-123' });
            expect(result).toEqual(mockDesign);
        });

        it('should get all designs', async () => {
            const designs = [mockDesign];
            const mockCursor = {
                toArray: vi.fn().mockResolvedValue(designs)
            };
            mockDesignsCollection.find.mockReturnValue(mockCursor);

            const result = await repository.getAll();

            expect(mockDesignsCollection.find).toHaveBeenCalledWith({});
            expect(result).toEqual(designs);
        });

        it('should insert design', async () => {
            mockDesignsCollection.insertOne.mockResolvedValue({ insertedId: 'design-123' });

            await repository.insert(mockDesign);

            expect(mockDesignsCollection.insertOne).toHaveBeenCalledWith(mockDesign);
        });

        it('should update design by id', async () => {
            const updatedDesign = { ...mockDesign, title: 'Updated Design' };
            mockDesignsCollection.findOneAndReplace.mockResolvedValue({ value: updatedDesign });

            await repository.update('design-123', updatedDesign);

            expect(mockDesignsCollection.findOneAndReplace).toHaveBeenCalledWith(
                { id: 'design-123' },
                updatedDesign
            );
        });

        it('should delete design by id', async () => {
            mockDesignsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

            await repository.delete('design-123');

            expect(mockDesignsCollection.deleteOne).toHaveBeenCalledWith({ id: 'design-123' });
        });
    });

    describe('getByCatalogueId', () => {
        it('should return designs from catalogue', async () => {
            const catalogueId = '507f1f77bcf86cd799439011';
            const designs: Array<Design> = [
                {
                    id: 'design-1',
                    title: 'Earrings Design',
                    description: 'Simple earrings',
                    dateCreated: new Date('2023-01-01'),
                    author: 'Designer 1',
                    instructions: ['Cut wire', 'Bend into shape'],
                    tags: ['earrings', 'simple'],
                    materials: ['wire-1', 'bead-1'],
                    images: ['earrings.jpg']
                },
                {
                    id: 'design-2',
                    title: 'Necklace Design',
                    description: 'Elegant necklace',
                    dateCreated: new Date('2023-01-02'),
                    author: 'Designer 2',
                    instructions: ['String beads', 'Add clasp'],
                    tags: ['necklace', 'elegant'],
                    materials: ['chain-1', 'bead-2'],
                    images: ['necklace.jpg']
                }
            ];

            const mockCatalogue = {
                _id: new ObjectId(catalogueId),
                title: 'Test Catalogue',
                designs
            };

            mockCataloguesCollection.findOne.mockResolvedValue(mockCatalogue);

            const result = await repository.getByCatalogueId(catalogueId);

            expect(mockDb.getCollection).toHaveBeenCalledWith(CollectionNames.Catalogues);
            expect(mockCataloguesCollection.findOne).toHaveBeenCalledWith({
                _id: new ObjectId(catalogueId)
            });
            expect(result).toEqual(designs);
        });

        it('should return empty array when catalogue has no designs', async () => {
            const catalogueId = '507f1f77bcf86cd799439012';
            const mockCatalogue = {
                _id: new ObjectId(catalogueId),
                title: 'Empty Catalogue'
                // no designs property
            };

            mockCataloguesCollection.findOne.mockResolvedValue(mockCatalogue);

            const result = await repository.getByCatalogueId(catalogueId);

            expect(result).toEqual([]);
        });

        it('should return empty array when catalogue designs is undefined', async () => {
            const catalogueId = '507f1f77bcf86cd799439013';
            const mockCatalogue = {
                _id: new ObjectId(catalogueId),
                title: 'Catalogue with undefined designs',
                designs: undefined
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

        it('should handle designs with different structures', async () => {
            const catalogueId = '507f1f77bcf86cd799439016';
            const designs: Array<Design> = [
                {
                    id: 'minimal-design',
                    title: 'Minimal Design',
                    description: '',
                    dateCreated: new Date('2023-02-01'),
                    author: 'Minimalist',
                    instructions: [],
                    tags: [],
                    materials: [],
                    images: []
                },
                {
                    id: 'complex-design',
                    title: 'Complex Multi-step Design',
                    description: 'A very detailed design with many steps',
                    dateCreated: new Date('2023-02-15'),
                    author: 'Expert Designer',
                    instructions: [
                        'Prepare all materials',
                        'Cut wire to length',
                        'Create loops',
                        'Attach beads',
                        'Connect components',
                        'Final assembly',
                        'Quality check'
                    ],
                    tags: ['complex', 'advanced', 'jewelry', 'tutorial'],
                    materials: ['wire-1', 'wire-2', 'bead-1', 'bead-2', 'chain-1'],
                    images: ['step1.jpg', 'step2.jpg', 'step3.jpg', 'final.jpg']
                }
            ];

            const mockCatalogue = {
                _id: new ObjectId(catalogueId),
                title: 'Varied Designs Catalogue',
                designs
            };

            mockCataloguesCollection.findOne.mockResolvedValue(mockCatalogue);

            const result = await repository.getByCatalogueId(catalogueId);

            expect(result).toEqual(designs);
            expect(result).toHaveLength(2);
            expect(result[0].instructions).toHaveLength(0);
            expect(result[1].instructions).toHaveLength(7);
        });
    });
});
