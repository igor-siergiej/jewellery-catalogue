import { beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import { ObjectId } from 'mongodb';

import { UuidGenerator } from './index';

mock.module('mongodb', () => ({
    ObjectId: mock(),
}));

describe('UuidGenerator', () => {
    let uuidGenerator: UuidGenerator;
    const mockObjectId = ObjectId as ReturnType<typeof mock>;

    beforeEach(() => {
        jest.clearAllMocks();
        uuidGenerator = new UuidGenerator();
    });

    it('should generate a UUID using MongoDB ObjectId', () => {
        const mockId = '507f1f77bcf86cd799439011';
        const mockObjectIdInstance = {
            toString: mock().mockReturnValue(mockId),
        };

        mockObjectId.mockReturnValue(mockObjectIdInstance as any);

        const result = uuidGenerator.generate();

        expect(mockObjectId).toHaveBeenCalledTimes(1);
        expect(mockObjectIdInstance.toString).toHaveBeenCalledTimes(1);
        expect(result).toBe(mockId);
    });

    it('should generate different UUIDs on multiple calls', () => {
        const mockId1 = '507f1f77bcf86cd799439011';
        const mockId2 = '507f1f77bcf86cd799439012';

        const mockObjectIdInstance1 = {
            toString: mock().mockReturnValue(mockId1),
        };
        const mockObjectIdInstance2 = {
            toString: mock().mockReturnValue(mockId2),
        };

        mockObjectId
            .mockReturnValueOnce(mockObjectIdInstance1 as any)
            .mockReturnValueOnce(mockObjectIdInstance2 as any);

        const result1 = uuidGenerator.generate();
        const result2 = uuidGenerator.generate();

        expect(result1).toBe(mockId1);
        expect(result2).toBe(mockId2);
        expect(result1).not.toBe(result2);
        expect(mockObjectId).toHaveBeenCalledTimes(2);
    });

    it('should return string type', () => {
        const mockId = '507f1f77bcf86cd799439013';
        const mockObjectIdInstance = {
            toString: mock().mockReturnValue(mockId),
        };

        mockObjectId.mockReturnValue(mockObjectIdInstance as any);

        const result = uuidGenerator.generate();

        expect(typeof result).toBe('string');
    });
});
