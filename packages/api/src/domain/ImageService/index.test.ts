import { Logger } from '@igor-siergiej/api-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageService } from './index';
import { ImageGenerator, ImageStore } from './types';

const mockStore = {
    getHeadObject: vi.fn(),
    getObjectStream: vi.fn(),
    putObject: vi.fn()
};

const mockGenerator = {
    generateImage: vi.fn()
};

const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
};

describe('ImageService', () => {
    let service: ImageService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ImageService(
            mockStore as unknown as ImageStore,
            mockGenerator as unknown as ImageGenerator,
            mockLogger as unknown as Logger
        );
    });

    describe('constructor', () => {
        it('should create service with store only', () => {
            const minimalService = new ImageService(mockStore as unknown as ImageStore);
            expect(minimalService).toBeInstanceOf(ImageService);
        });

        it('should create service with all dependencies', () => {
            expect(service).toBeInstanceOf(ImageService);
        });
    });

    describe('getImage', () => {
        it('should return image with correct content type and cache control', async () => {
            const imageName = 'test-image.jpg';
            const mockStream = {} as NodeJS.ReadableStream;
            const mockHead = {
                metaData: {
                    'content-type': 'image/jpeg'
                }
            };

            mockStore.getHeadObject.mockResolvedValue(mockHead);
            mockStore.getObjectStream.mockResolvedValue(mockStream);

            const result = await service.getImage(imageName);

            expect(mockStore.getHeadObject).toHaveBeenCalledWith(imageName);
            expect(mockStore.getObjectStream).toHaveBeenCalledWith(imageName);
            expect(result).toEqual({
                stream: mockStream,
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=31536000, immutable'
            });
        });

        it('should use default content type when not provided in metadata', async () => {
            const imageName = 'test-image-no-type.jpg';
            const mockStream = {} as NodeJS.ReadableStream;
            const mockHead = {
                metaData: {}
            };

            mockStore.getHeadObject.mockResolvedValue(mockHead);
            mockStore.getObjectStream.mockResolvedValue(mockStream);

            const result = await service.getImage(imageName);

            expect(result.contentType).toBe('image/jpeg');
        });

        it('should use default content type when metadata is null', async () => {
            const imageName = 'test-image-null-meta.jpg';
            const mockStream = {} as NodeJS.ReadableStream;
            const mockHead = null;

            mockStore.getHeadObject.mockResolvedValue(mockHead);
            mockStore.getObjectStream.mockResolvedValue(mockStream);

            const result = await service.getImage(imageName);

            expect(result.contentType).toBe('image/jpeg');
        });

        it('should handle different content types', async () => {
            const imageName = 'test-image.png';
            const mockStream = {} as NodeJS.ReadableStream;
            const mockHead = {
                metaData: {
                    'content-type': 'image/png'
                }
            };

            mockStore.getHeadObject.mockResolvedValue(mockHead);
            mockStore.getObjectStream.mockResolvedValue(mockStream);

            const result = await service.getImage(imageName);

            expect(result.contentType).toBe('image/png');
        });

        it('should throw error for empty image name', async () => {
            await expect(service.getImage('')).rejects.toMatchObject({
                message: 'Image name is required',
                status: 400
            });

            expect(mockStore.getHeadObject).not.toHaveBeenCalled();
        });

        it('should throw error for null image name', async () => {
            await expect(service.getImage(null as any)).rejects.toMatchObject({
                message: 'Image name is required',
                status: 400
            });
        });

        it('should handle store errors and log warning', async () => {
            const imageName = 'non-existent.jpg';
            const storeError = new Error('Object not found');

            mockStore.getHeadObject.mockRejectedValue(storeError);

            await expect(service.getImage(imageName)).rejects.toMatchObject({
                message: 'Image not found',
                status: 404
            });

            expect(mockLogger.warn).toHaveBeenCalledWith('Image not found in store', { name: imageName });
            expect(mockStore.getObjectStream).not.toHaveBeenCalled();
        });

        it('should handle stream errors', async () => {
            const imageName = 'stream-error.jpg';
            const mockHead = {
                metaData: {
                    'content-type': 'image/jpeg'
                }
            };

            mockStore.getHeadObject.mockResolvedValue(mockHead);
            mockStore.getObjectStream.mockRejectedValue(new Error('Stream error'));

            await expect(service.getImage(imageName)).rejects.toMatchObject({
                message: 'Image not found',
                status: 404
            });

            expect(mockLogger.warn).toHaveBeenCalledWith('Image not found in store', { name: imageName });
        });

        it('should work without logger', async () => {
            const serviceWithoutLogger = new ImageService(mockStore as unknown as ImageStore);
            const imageName = 'no-logger.jpg';

            mockStore.getHeadObject.mockRejectedValue(new Error('Not found'));

            await expect(serviceWithoutLogger.getImage(imageName)).rejects.toMatchObject({
                message: 'Image not found',
                status: 404
            });

            // Should not throw error when logger is undefined
        });
    });

    describe('uploadImage', () => {
        it('should upload image successfully', async () => {
            const imageName = 'upload-test.jpg';
            const imageBuffer = Buffer.from('image data');
            const contentType = 'image/jpeg';

            mockStore.putObject.mockResolvedValue(undefined);

            await service.uploadImage(imageName, imageBuffer, contentType);

            expect(mockStore.putObject).toHaveBeenCalledWith(imageName, imageBuffer, { contentType });
            expect(mockLogger.info).toHaveBeenCalledWith('Image uploaded successfully', {
                name: imageName,
                contentType
            });
        });

        it('should throw error for empty image name', async () => {
            const imageBuffer = Buffer.from('image data');
            const contentType = 'image/jpeg';

            await expect(service.uploadImage('', imageBuffer, contentType)).rejects.toMatchObject({
                message: 'Image name and buffer are required',
                status: 400
            });

            expect(mockStore.putObject).not.toHaveBeenCalled();
        });

        it('should throw error for null buffer', async () => {
            const imageName = 'test.jpg';
            const contentType = 'image/jpeg';

            await expect(service.uploadImage(imageName, null as any, contentType)).rejects.toMatchObject({
                message: 'Image name and buffer are required',
                status: 400
            });

            expect(mockStore.putObject).not.toHaveBeenCalled();
        });

        it('should throw error for undefined buffer', async () => {
            const imageName = 'test.jpg';
            const contentType = 'image/jpeg';

            await expect(service.uploadImage(imageName, undefined as any, contentType)).rejects.toMatchObject({
                message: 'Image name and buffer are required',
                status: 400
            });
        });

        it('should handle empty buffer', async () => {
            const imageName = 'empty.jpg';
            const imageBuffer = Buffer.alloc(0);
            const contentType = 'image/jpeg';

            mockStore.putObject.mockResolvedValue(undefined);

            await service.uploadImage(imageName, imageBuffer, contentType);

            expect(mockStore.putObject).toHaveBeenCalledWith(imageName, imageBuffer, { contentType });
        });

        it('should handle store upload errors', async () => {
            const imageName = 'error-upload.jpg';
            const imageBuffer = Buffer.from('image data');
            const contentType = 'image/jpeg';
            const storeError = new Error('Storage full');

            mockStore.putObject.mockRejectedValue(storeError);

            await expect(service.uploadImage(imageName, imageBuffer, contentType)).rejects.toMatchObject({
                message: 'Failed to upload image',
                status: 500
            });

            expect(mockLogger.error).toHaveBeenCalledWith('Failed to upload image', {
                name: imageName,
                error: storeError
            });
        });

        it('should work without logger during success', async () => {
            const serviceWithoutLogger = new ImageService(mockStore as unknown as ImageStore);
            const imageName = 'no-logger-success.jpg';
            const imageBuffer = Buffer.from('image data');
            const contentType = 'image/jpeg';

            mockStore.putObject.mockResolvedValue(undefined);

            await service.uploadImage(imageName, imageBuffer, contentType);

            expect(mockStore.putObject).toHaveBeenCalledWith(imageName, imageBuffer, { contentType });
            // Should not throw error when logger is undefined
        });

        it('should work without logger during error', async () => {
            const serviceWithoutLogger = new ImageService(mockStore as unknown as ImageStore);
            const imageName = 'no-logger-error.jpg';
            const imageBuffer = Buffer.from('image data');
            const contentType = 'image/jpeg';

            mockStore.putObject.mockRejectedValue(new Error('Storage error'));

            await expect(serviceWithoutLogger.uploadImage(imageName, imageBuffer, contentType)).rejects.toMatchObject({
                message: 'Failed to upload image',
                status: 500
            });
            // Should not throw error when logger is undefined
        });

        it('should handle different content types', async () => {
            const imageName = 'test.png';
            const imageBuffer = Buffer.from('png data');
            const contentType = 'image/png';

            mockStore.putObject.mockResolvedValue(undefined);

            await service.uploadImage(imageName, imageBuffer, contentType);

            expect(mockStore.putObject).toHaveBeenCalledWith(imageName, imageBuffer, { contentType });
            expect(mockLogger.info).toHaveBeenCalledWith('Image uploaded successfully', {
                name: imageName,
                contentType
            });
        });

        it('should handle large buffers', async () => {
            const imageName = 'large-image.jpg';
            const imageBuffer = Buffer.alloc(1024 * 1024, 0); // 1MB buffer
            const contentType = 'image/jpeg';

            mockStore.putObject.mockResolvedValue(undefined);

            await service.uploadImage(imageName, imageBuffer, contentType);

            expect(mockStore.putObject).toHaveBeenCalledWith(imageName, imageBuffer, { contentType });
        });
    });

    describe('edge cases and error scenarios', () => {
        it('should handle concurrent operations', async () => {
            const imageName1 = 'concurrent1.jpg';
            const imageName2 = 'concurrent2.jpg';
            const imageBuffer = Buffer.from('data');
            const contentType = 'image/jpeg';

            mockStore.putObject.mockResolvedValue(undefined);

            const promises = [
                service.uploadImage(imageName1, imageBuffer, contentType),
                service.uploadImage(imageName2, imageBuffer, contentType)
            ];

            await Promise.all(promises);

            expect(mockStore.putObject).toHaveBeenCalledTimes(2);
        });

        it('should handle special characters in image names', async () => {
            const imageName = 'test-image@2x.jpg';
            const imageBuffer = Buffer.from('image data');
            const contentType = 'image/jpeg';

            mockStore.putObject.mockResolvedValue(undefined);

            await service.uploadImage(imageName, imageBuffer, contentType);

            expect(mockStore.putObject).toHaveBeenCalledWith(imageName, imageBuffer, { contentType });
        });
    });
});
