import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UuidGenerator } from './index';

vi.mock('mongodb', () => ({
    ObjectId: vi.fn()
}));

describe('UuidGenerator', () => {
    let uuidGenerator: UuidGenerator;
    const mockObjectId = vi.mocked(ObjectId);

    beforeEach(() => {
        vi.clearAllMocks();
        uuidGenerator = new UuidGenerator();
    });

    it('should generate a UUID using MongoDB ObjectId', () => {
        const mockId = '507f1f77bcf86cd799439011';
        const mockObjectIdInstance = {
            toString: vi.fn().mockReturnValue(mockId)
        };

        mockObjectId.mockReturnValue(mockObjectIdInstance as any);

        const result = uuidGenerator.generate();

        expect(mockObjectId).toHaveBeenCalledOnce();
        expect(mockObjectIdInstance.toString).toHaveBeenCalledOnce();
        expect(result).toBe(mockId);
    });

    it('should generate different UUIDs on multiple calls', () => {
        const mockId1 = '507f1f77bcf86cd799439011';
        const mockId2 = '507f1f77bcf86cd799439012';

        const mockObjectIdInstance1 = {
            toString: vi.fn().mockReturnValue(mockId1)
        };
        const mockObjectIdInstance2 = {
            toString: vi.fn().mockReturnValue(mockId2)
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
            toString: vi.fn().mockReturnValue(mockId)
        };

        mockObjectId.mockReturnValue(mockObjectIdInstance as any);

        const result = uuidGenerator.generate();

        expect(typeof result).toBe('string');
    });
});