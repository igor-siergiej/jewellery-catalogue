import { beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import type { MongoDbConnection } from '@imapps/api-utils';
import type { Design } from '@jewellery-catalogue/types';

import { CollectionNames, type Collections } from '../../dependencies/types';
import { MongoDesignRepository } from './index';

const mockDesignsCollection = {
    findOne: mock(),
    find: mock(),
    insertOne: mock(),
    findOneAndReplace: mock(),
    deleteOne: mock(),
};

const mockDb = {
    getCollection: mock().mockReturnValue(mockDesignsCollection),
} as unknown as MongoDbConnection<Collections>;

describe('MongoDesignRepository', () => {
    let repository: MongoDesignRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new MongoDesignRepository(mockDb);
    });

    describe('constructor', () => {
        it('should initialize with correct collection name', () => {
            expect(repository.collectionName).toBe(CollectionNames.Designs);
        });
    });

    describe('inherited CRUD operations', () => {
        const mockDesign: Design = {
            id: 'design-123',
            userId: 'user-123',
            name: 'Test Design',
            description: 'A test design',
            timeRequired: '45',
            totalMaterialCosts: 20.0,
            price: 35.0,
            imageId: 'image-123',
            materials: [],
            dateAdded: new Date('2025-01-01'),
        };

        it('should get design by id using string filter', async () => {
            mockDesignsCollection.findOne.mockResolvedValue(mockDesign);

            const result = await repository.getById('design-123');

            expect(mockDesignsCollection.findOne).toHaveBeenCalledWith(
                { id: 'design-123' },
                { projection: { _id: 0 } }
            );
            expect(result).toEqual(mockDesign);
        });

        it('should get all designs', async () => {
            const designs = [mockDesign];
            const mockCursor = {
                toArray: mock().mockResolvedValue(designs),
            };

            mockDesignsCollection.find.mockReturnValue(mockCursor);

            const result = await repository.getAll();

            expect(mockDesignsCollection.find).toHaveBeenCalledWith({}, { projection: { _id: 0 } });
            expect(result).toEqual(designs);
        });

        it('should insert design', async () => {
            mockDesignsCollection.insertOne.mockResolvedValue({ insertedId: 'design-123' });

            await repository.insert(mockDesign);

            expect(mockDesignsCollection.insertOne).toHaveBeenCalledWith(mockDesign);
        });

        it('should update design by id', async () => {
            const updatedDesign = { ...mockDesign, name: 'Updated Design' };

            mockDesignsCollection.findOneAndReplace.mockResolvedValue({ value: updatedDesign });

            await repository.update('design-123', updatedDesign);

            expect(mockDesignsCollection.findOneAndReplace).toHaveBeenCalledWith({ id: 'design-123' }, updatedDesign);
        });

        it('should delete design by id', async () => {
            mockDesignsCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

            await repository.delete('design-123');

            expect(mockDesignsCollection.deleteOne).toHaveBeenCalledWith({ id: 'design-123' });
        });
    });
});
