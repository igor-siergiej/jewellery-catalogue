import { beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import { Readable } from 'node:stream';
import type { Logger } from '@imapps/api-utils';
import { streamToBuffer } from '../../utils/streamToBuffer';
import { ImageService } from './index';
import type { ImageGenerator, ImageResizer, ImageStore } from './types';

const mockStore = {
    getHeadObject: mock(),
    getObjectStream: mock(),
    putObject: mock(),
};

const mockGenerator = {
    generateImage: mock(),
};

const mockLogger = {
    info: mock(),
    warn: mock(),
    error: mock(),
    debug: mock(),
};

describe('ImageService', () => {
    let service: ImageService;

    beforeEach(() => {
        jest.clearAllMocks();
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
                    'content-type': 'image/jpeg',
                },
            };

            mockStore.getHeadObject.mockResolvedValue(mockHead);
            mockStore.getObjectStream.mockResolvedValue(mockStream);

            const result = await service.getImage(imageName);

            expect(mockStore.getHeadObject).toHaveBeenCalledWith(imageName);
            expect(mockStore.getObjectStream).toHaveBeenCalledWith(imageName);
            expect(result).toEqual({
                stream: mockStream,
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=31536000, immutable',
            });
        });

        it('should use default content type when not provided in metadata', async () => {
            const imageName = 'test-image-no-type.jpg';
            const mockStream = {} as NodeJS.ReadableStream;
            const mockHead = {
                metaData: {},
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
                    'content-type': 'image/png',
                },
            };

            mockStore.getHeadObject.mockResolvedValue(mockHead);
            mockStore.getObjectStream.mockResolvedValue(mockStream);

            const result = await service.getImage(imageName);

            expect(result.contentType).toBe('image/png');
        });

        it('should throw error for empty image name', async () => {
            await expect(service.getImage('')).rejects.toMatchObject({
                message: 'Image name is required',
                status: 400,
            });

            expect(mockStore.getHeadObject).not.toHaveBeenCalled();
        });

        it('should throw error for null image name', async () => {
            await expect(service.getImage(null as any)).rejects.toMatchObject({
                message: 'Image name is required',
                status: 400,
            });
        });

        it('should handle store errors and log warning', async () => {
            const imageName = 'non-existent.jpg';
            const storeError = new Error('Object not found');

            mockStore.getHeadObject.mockRejectedValue(storeError);

            await expect(service.getImage(imageName)).rejects.toMatchObject({
                message: 'Image not found',
                status: 404,
            });

            expect(mockLogger.warn).toHaveBeenCalledWith('Image not found in store', { name: imageName });
            expect(mockStore.getObjectStream).not.toHaveBeenCalled();
        });

        it('should handle stream errors', async () => {
            const imageName = 'stream-error.jpg';
            const mockHead = {
                metaData: {
                    'content-type': 'image/jpeg',
                },
            };

            mockStore.getHeadObject.mockResolvedValue(mockHead);
            mockStore.getObjectStream.mockRejectedValue(new Error('Stream error'));

            await expect(service.getImage(imageName)).rejects.toMatchObject({
                message: 'Image not found',
                status: 404,
            });

            expect(mockLogger.warn).toHaveBeenCalledWith('Image not found in store', { name: imageName });
        });

        it('should work without logger', async () => {
            const serviceWithoutLogger = new ImageService(mockStore as unknown as ImageStore);
            const imageName = 'no-logger.jpg';

            mockStore.getHeadObject.mockRejectedValue(new Error('Not found'));

            await expect(serviceWithoutLogger.getImage(imageName)).rejects.toMatchObject({
                message: 'Image not found',
                status: 404,
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
                contentType,
            });
        });

        it('should throw error for empty image name', async () => {
            const imageBuffer = Buffer.from('image data');
            const contentType = 'image/jpeg';

            await expect(service.uploadImage('', imageBuffer, contentType)).rejects.toMatchObject({
                message: 'Image name and buffer are required',
                status: 400,
            });

            expect(mockStore.putObject).not.toHaveBeenCalled();
        });

        it('should throw error for null buffer', async () => {
            const imageName = 'test.jpg';
            const contentType = 'image/jpeg';

            await expect(service.uploadImage(imageName, null as any, contentType)).rejects.toMatchObject({
                message: 'Image name and buffer are required',
                status: 400,
            });

            expect(mockStore.putObject).not.toHaveBeenCalled();
        });

        it('should throw error for undefined buffer', async () => {
            const imageName = 'test.jpg';
            const contentType = 'image/jpeg';

            await expect(service.uploadImage(imageName, undefined as any, contentType)).rejects.toMatchObject({
                message: 'Image name and buffer are required',
                status: 400,
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
                status: 500,
            });

            expect(mockLogger.error).toHaveBeenCalledWith('Failed to upload image', {
                name: imageName,
                error: storeError,
            });
        });

        it('should work without logger during success', async () => {
            const _serviceWithoutLogger = new ImageService(mockStore as unknown as ImageStore);
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
                status: 500,
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
                contentType,
            });
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
                service.uploadImage(imageName2, imageBuffer, contentType),
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

describe('ImageService resizing', () => {
    const resizer = { toWebp: mock() };
    let service: ImageService;
    const stored = new Map<string, Buffer>();

    beforeEach(() => {
        jest.clearAllMocks();
        stored.clear();
        mockStore.putObject.mockImplementation(async (name: string, buffer: Buffer) => {
            stored.set(name, buffer);
        });
        mockStore.getHeadObject.mockImplementation(async (name: string) =>
            stored.has(name) ? { metaData: { 'content-type': 'image/jpeg' } } : null
        );
        mockStore.getObjectStream.mockImplementation(async (name: string) => {
            const buffer = stored.get(name);
            if (!buffer) throw new Error('NotFound');
            return Readable.from(buffer);
        });
        resizer.toWebp.mockImplementation(async (_buffer: Buffer, max: number) => Buffer.from(`webp-${max}`));
        service = new ImageService(
            mockStore as unknown as ImageStore,
            undefined,
            mockLogger as unknown as Logger,
            resizer as unknown as ImageResizer
        );
    });

    const read = async (stream: NodeJS.ReadableStream) => (await streamToBuffer(stream)).toString();

    it('stores the original plus a 400px thumbnail and a 1600px display WebP on upload', async () => {
        await service.uploadImage('img', Buffer.from('original'), 'image/jpeg');

        expect(stored.get('img')?.toString()).toBe('original');
        expect(stored.get('img__thumb.webp')?.toString()).toBe('webp-400');
        expect(stored.get('img__display.webp')?.toString()).toBe('webp-1600');
    });

    it('still stores the original when resizing fails on upload', async () => {
        resizer.toWebp.mockRejectedValue(new Error('unsupported image'));

        await service.uploadImage('img', Buffer.from('original'), 'image/heic');

        expect([...stored.keys()]).toEqual(['img']);
        expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('serves a stored size as WebP', async () => {
        stored.set('img', Buffer.from('original'));
        stored.set('img__thumb.webp', Buffer.from('stored-thumb'));

        const image = await service.getImage('img', 'thumb');

        expect(image.contentType).toBe('image/webp');
        expect(await read(image.stream)).toBe('stored-thumb');
        expect(resizer.toWebp).not.toHaveBeenCalled();
    });

    it('generates and stores a missing size on first request, for images uploaded before resizing', async () => {
        stored.set('img', Buffer.from('original'));

        const image = await service.getImage('img', 'display');

        expect(await read(image.stream)).toBe('webp-1600');
        expect(stored.get('img__display.webp')?.toString()).toBe('webp-1600');
    });

    it('falls back to the original when a size cannot be generated', async () => {
        stored.set('img', Buffer.from('original'));
        resizer.toWebp.mockRejectedValue(new Error('unsupported image'));

        const image = await service.getImage('img', 'thumb');

        expect(image.contentType).toBe('image/jpeg');
        expect(await read(image.stream)).toBe('original');
    });

    it('returns the untouched original when no size is requested', async () => {
        stored.set('img', Buffer.from('original'));

        expect(await read((await service.getImage('img')).stream)).toBe('original');
        expect(resizer.toWebp).not.toHaveBeenCalled();
    });

    it('404s for a missing image even when a size is requested', async () => {
        await expect(service.getImage('missing', 'thumb')).rejects.toMatchObject({ status: 404 });
    });
});
