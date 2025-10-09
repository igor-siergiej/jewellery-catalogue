import type { MongoDbConnection } from '@imapps/api-utils';
import { type Material, MaterialType, METAL_TYPE, WIRE_TYPE } from '@jewellery-catalogue/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CollectionNames, type Collections } from '../../dependencies/types';
import { MongoMaterialRepository } from './index';

const mockMaterialsCollection = {
    findOne: vi.fn(),
    find: vi.fn(),
    insertOne: vi.fn(),
    findOneAndReplace: vi.fn(),
    deleteOne: vi.fn(),
};

const mockDb = {
    getCollection: vi.fn().mockReturnValue(mockMaterialsCollection),
} as unknown as MongoDbConnection<Collections>;

describe('MongoMaterialRepository', () => {
    let repository: MongoMaterialRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        repository = new MongoMaterialRepository(mockDb);
    });

    describe('constructor', () => {
        it('should initialize with correct collection name', () => {
            expect(repository.collectionName).toBe(CollectionNames.Materials);
        });
    });

    describe('usesObjectId', () => {
        it('should return false for materials', () => {
            const result = repository.usesObjectId();

            expect(result).toBe(false);
        });
    });

    describe('inherited CRUD operations', () => {
        const mockMaterial: Material = {
            id: 'material-123',
            userId: 'user-123',
            type: MaterialType.WIRE,
            name: 'Test Wire',
            brand: 'Test Brand',
            purchaseUrl: 'https://example.com',
            diameter: 1.5,
            wireType: WIRE_TYPE.FULL,
            metalType: METAL_TYPE.SILVER,
            length: 10,
            pricePerMeter: 2.5,
            dateAdded: new Date('2025-01-01'),
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
                toArray: vi.fn().mockResolvedValue(materials),
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
});
