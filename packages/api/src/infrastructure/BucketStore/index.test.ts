import { ObjectStoreConnection } from '@igor-siergiej/api-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BucketStore } from './index';

const mockBucket = {
    statObject: vi.fn(),
    getObjectStream: vi.fn(),
    putObject: vi.fn()
};

describe('BucketStore', () => {
    let bucketStore: BucketStore;

    beforeEach(() => {
        vi.clearAllMocks();
        bucketStore = new BucketStore(mockBucket as unknown as ObjectStoreConnection);
    });

    describe('getHeadObject', () => {
        it('should return metadata when object exists', async () => {
            const mockStat = {
                metaData: {
                    'content-type': 'image/jpeg'
                }
            };

            mockBucket.statObject.mockResolvedValue(mockStat);

            const result = await bucketStore.getHeadObject('test-image.jpg');

            expect(mockBucket.statObject).toHaveBeenCalledWith('test-image.jpg');
            expect(result).toEqual({
                metaData: {
                    'content-type': 'image/jpeg'
                }
            });
        });

        it('should return metadata with partial content-type', async () => {
            const mockStat = {
                metaData: {
                    'content-type': 'image/png',
                    'other-property': 'value'
                }
            };

            mockBucket.statObject.mockResolvedValue(mockStat);

            const result = await bucketStore.getHeadObject('test-image.png');

            expect(result).toEqual({
                metaData: {
                    'content-type': 'image/png'
                }
            });
        });

        it('should return metadata with undefined content-type when not present', async () => {
            const mockStat = {
                metaData: {
                    'other-property': 'value'
                }
            };

            mockBucket.statObject.mockResolvedValue(mockStat);

            const result = await bucketStore.getHeadObject('test-file.txt');

            expect(result).toEqual({
                metaData: {
                    'content-type': undefined
                }
            });
        });

        it('should return metadata with undefined content-type when metaData is missing', async () => {
            const mockStat = {};

            mockBucket.statObject.mockResolvedValue(mockStat);

            const result = await bucketStore.getHeadObject('test-file.txt');

            expect(result).toEqual({
                metaData: {
                    'content-type': undefined
                }
            });
        });

        it('should return null when object does not exist', async () => {
            mockBucket.statObject.mockRejectedValue(new Error('Object not found'));

            const result = await bucketStore.getHeadObject('non-existent.jpg');

            expect(mockBucket.statObject).toHaveBeenCalledWith('non-existent.jpg');
            expect(result).toBeNull();
        });

        it('should return null when bucket operation throws any error', async () => {
            mockBucket.statObject.mockRejectedValue(new Error('Network error'));

            const result = await bucketStore.getHeadObject('error-file.jpg');

            expect(result).toBeNull();
        });
    });

    describe('getObjectStream', () => {
        it('should return object stream from bucket', async () => {
            const mockStream = {} as NodeJS.ReadableStream;
            mockBucket.getObjectStream.mockResolvedValue(mockStream);

            const result = await bucketStore.getObjectStream('test-file.pdf');

            expect(mockBucket.getObjectStream).toHaveBeenCalledWith('test-file.pdf');
            expect(result).toBe(mockStream);
        });

        it('should propagate errors from bucket getObjectStream', async () => {
            const mockError = new Error('Stream error');
            mockBucket.getObjectStream.mockRejectedValue(mockError);

            await expect(bucketStore.getObjectStream('error-file.pdf')).rejects.toThrow('Stream error');
            expect(mockBucket.getObjectStream).toHaveBeenCalledWith('error-file.pdf');
        });
    });

    describe('putObject', () => {
        it('should put object to bucket without options', async () => {
            const buffer = Buffer.from('test data');
            mockBucket.putObject.mockResolvedValue(undefined);

            await bucketStore.putObject('test-file.txt', buffer);

            expect(mockBucket.putObject).toHaveBeenCalledWith('test-file.txt', buffer, undefined);
        });

        it('should put object to bucket with content type options', async () => {
            const buffer = Buffer.from('image data');
            const options = { contentType: 'image/jpeg' };
            mockBucket.putObject.mockResolvedValue(undefined);

            await bucketStore.putObject('test-image.jpg', buffer, options);

            expect(mockBucket.putObject).toHaveBeenCalledWith('test-image.jpg', buffer, options);
        });

        it('should propagate errors from bucket putObject', async () => {
            const buffer = Buffer.from('test data');
            const mockError = new Error('Upload error');
            mockBucket.putObject.mockRejectedValue(mockError);

            await expect(bucketStore.putObject('error-file.txt', buffer)).rejects.toThrow('Upload error');
            expect(mockBucket.putObject).toHaveBeenCalledWith('error-file.txt', buffer, undefined);
        });

        it('should handle empty buffer', async () => {
            const buffer = Buffer.alloc(0);
            mockBucket.putObject.mockResolvedValue(undefined);

            await bucketStore.putObject('empty-file.txt', buffer);

            expect(mockBucket.putObject).toHaveBeenCalledWith('empty-file.txt', buffer, undefined);
        });
    });
});