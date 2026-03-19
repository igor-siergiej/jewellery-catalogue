import { beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import type { MongoDbConnection } from '@imapps/api-utils';

import { CollectionNames, type Collections } from '../../dependencies/types';
import { MongoRepository } from './index';

const mockCollection = {
    findOne: mock(),
    find: mock(),
    insertOne: mock(),
    findOneAndReplace: mock(),
    deleteOne: mock(),
};

const mockDb = {
    getCollection: mock().mockReturnValue(mockCollection),
} as unknown as MongoDbConnection<Collections>;

interface TestEntity {
    id?: string;
    _id?: any;
    name: string;
    value: number;
}

describe('MongoRepository', () => {
    let repository: MongoRepository<TestEntity>;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new MongoRepository<TestEntity>(mockDb, CollectionNames.Materials);
    });

    describe('collection', () => {
        it('should get collection from database', () => {
            repository.collection();

            expect(mockDb.getCollection).toHaveBeenCalledWith(CollectionNames.Materials);
        });
    });

    describe('getMongoFilter', () => {
        it('should create string id filter for materials collection', () => {
            const testId = 'test-id-123';

            const filter = repository.getMongoFilter(testId);

            expect(filter).toEqual({ id: testId });
        });

        it('should create string id filter for designs collection', () => {
            const designRepository = new MongoRepository<TestEntity>(mockDb, CollectionNames.Designs);
            const testId = 'design-id-123';

            const filter = designRepository.getMongoFilter(testId);

            expect(filter).toEqual({ id: testId });
        });
    });

    describe('getById', () => {
        it('should find entity by string id', async () => {
            const testEntity = { id: 'test-123', name: 'Test Entity', value: 42 };

            mockCollection.findOne.mockResolvedValue(testEntity);

            const result = await repository.getById('test-123');

            expect(mockCollection.findOne).toHaveBeenCalledWith({ id: 'test-123' }, { projection: { _id: 0 } });
            expect(result).toEqual(testEntity);
        });

        it('should return null when entity not found', async () => {
            mockCollection.findOne.mockResolvedValue(null);

            const result = await repository.getById('non-existent');

            expect(result).toBeNull();
        });

        it('should propagate database errors', async () => {
            const mockError = new Error('Database connection error');

            mockCollection.findOne.mockRejectedValue(mockError);

            await expect(repository.getById('test-123')).rejects.toThrow('Database connection error');
        });
    });

    describe('getAll', () => {
        it('should return all entities from collection', async () => {
            const testEntities = [
                { id: 'test-1', name: 'Entity 1', value: 10 },
                { id: 'test-2', name: 'Entity 2', value: 20 },
            ];
            const mockCursor = {
                toArray: mock().mockResolvedValue(testEntities),
            };

            mockCollection.find.mockReturnValue(mockCursor);

            const result = await repository.getAll();

            expect(mockCollection.find).toHaveBeenCalledWith({}, { projection: { _id: 0 } });
            expect(mockCursor.toArray).toHaveBeenCalled();
            expect(result).toEqual(testEntities);
        });

        it('should return empty array when no entities exist', async () => {
            const mockCursor = {
                toArray: mock().mockResolvedValue([]),
            };

            mockCollection.find.mockReturnValue(mockCursor);

            const result = await repository.getAll();

            expect(result).toEqual([]);
        });

        it('should propagate database errors', async () => {
            const mockError = new Error('Database query error');
            const mockCursor = {
                toArray: mock().mockRejectedValue(mockError),
            };

            mockCollection.find.mockReturnValue(mockCursor);

            await expect(repository.getAll()).rejects.toThrow('Database query error');
        });
    });

    describe('insert', () => {
        it('should insert entity into collection', async () => {
            const testEntity = { id: 'new-entity', name: 'New Entity', value: 99 };

            mockCollection.insertOne.mockResolvedValue({ insertedId: 'new-id' });

            await repository.insert(testEntity);

            expect(mockCollection.insertOne).toHaveBeenCalledWith(testEntity);
        });

        it('should propagate database errors during insert', async () => {
            const testEntity = { id: 'error-entity', name: 'Error Entity', value: 0 };
            const mockError = new Error('Insert failed');

            mockCollection.insertOne.mockRejectedValue(mockError);

            await expect(repository.insert(testEntity)).rejects.toThrow('Insert failed');
        });
    });

    describe('update', () => {
        it('should update entity by string id', async () => {
            const testEntity = { id: 'update-test', name: 'Updated Entity', value: 200 };

            mockCollection.findOneAndReplace.mockResolvedValue({ value: testEntity });

            await repository.update('update-test', testEntity);

            expect(mockCollection.findOneAndReplace).toHaveBeenCalledWith({ id: 'update-test' }, testEntity);
        });

        it('should propagate database errors during update', async () => {
            const testEntity = { id: 'error-update', name: 'Error Update', value: 0 };
            const mockError = new Error('Update failed');

            mockCollection.findOneAndReplace.mockRejectedValue(mockError);

            await expect(repository.update('error-update', testEntity)).rejects.toThrow('Update failed');
        });
    });

    describe('delete', () => {
        it('should delete entity by string id', async () => {
            mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

            await repository.delete('delete-test');

            expect(mockCollection.deleteOne).toHaveBeenCalledWith({ id: 'delete-test' });
        });

        it('should propagate database errors during delete', async () => {
            const mockError = new Error('Delete failed');

            mockCollection.deleteOne.mockRejectedValue(mockError);

            await expect(repository.delete('error-delete')).rejects.toThrow('Delete failed');
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete CRUD operations for string id entities', async () => {
            const entity = { id: 'crud-test', name: 'CRUD Test', value: 123 };

            // Insert
            mockCollection.insertOne.mockResolvedValue({ insertedId: 'crud-test' });
            await repository.insert(entity);

            // Read
            mockCollection.findOne.mockResolvedValue(entity);
            const retrieved = await repository.getById('crud-test');

            expect(retrieved).toEqual(entity);

            // Update
            const updatedEntity = { ...entity, name: 'Updated CRUD Test', value: 456 };

            mockCollection.findOneAndReplace.mockResolvedValue({ value: updatedEntity });
            await repository.update('crud-test', updatedEntity);

            // Delete
            mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
            await repository.delete('crud-test');

            expect(mockCollection.insertOne).toHaveBeenCalledWith(entity);
            expect(mockCollection.findOne).toHaveBeenCalledWith({ id: 'crud-test' }, { projection: { _id: 0 } });
            expect(mockCollection.findOneAndReplace).toHaveBeenCalledWith({ id: 'crud-test' }, updatedEntity);
            expect(mockCollection.deleteOne).toHaveBeenCalledWith({ id: 'crud-test' });
        });
    });
});
