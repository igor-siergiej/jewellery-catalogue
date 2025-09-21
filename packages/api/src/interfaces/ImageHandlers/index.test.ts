import { Context } from 'koa';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as imageHandlers from './index';

const mockDependencyContainer = vi.hoisted(() => ({
    resolve: vi.fn()
}));

vi.mock('../../dependencies', () => ({
    dependencyContainer: mockDependencyContainer
}));

const mockImageService = {
    getImage: vi.fn(),
    uploadImage: vi.fn()
};

const createMockContext = (overrides: Partial<Context> = {}): Context => {
    const ctx = {
        params: {},
        request: { body: {} } as Context['request'],
        response: { status: 200 } as Context['response'],
        state: {},
        set: vi.fn(),
        status: 200,
        body: {},
        ...overrides
    } as Context;

    Object.defineProperty(ctx, 'status', {
        get: () => ctx.response.status,
        set: (value) => { ctx.response.status = value; },
        configurable: true,
        enumerable: true
    });

    Object.defineProperty(ctx, 'body', {
        get: () => ctx.response.body,
        set: (value) => { ctx.response.body = value; },
        configurable: true,
        enumerable: true
    });

    return ctx;
};

describe('ImageHandlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDependencyContainer.resolve.mockReturnValue(mockImageService);
    });

    describe('getImage', () => {
        it('should return image successfully', async () => {
            const imageName = 'test-image.jpg';
            const mockStream = {} as NodeJS.ReadableStream;
            const mockImageResponse = {
                stream: mockStream,
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=31536000, immutable'
            };

            const ctx = createMockContext({ params: { name: imageName } });
            mockImageService.getImage.mockResolvedValue(mockImageResponse);

            await imageHandlers.getImage(ctx);

            expect(mockImageService.getImage).toHaveBeenCalledWith(imageName);
            expect(ctx.set).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
            expect(ctx.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=31536000, immutable');
            expect(ctx.body).toBe(mockStream);
            expect(ctx.response.status).toBe(200);
        });

        it('should handle PNG images', async () => {
            const imageName = 'test-image.png';
            const mockStream = {} as NodeJS.ReadableStream;
            const mockImageResponse = {
                stream: mockStream,
                contentType: 'image/png',
                cacheControl: 'public, max-age=31536000, immutable'
            };

            const ctx = createMockContext({ params: { name: imageName } });
            mockImageService.getImage.mockResolvedValue(mockImageResponse);

            await imageHandlers.getImage(ctx);

            expect(ctx.set).toHaveBeenCalledWith('Content-Type', 'image/png');
            expect(ctx.body).toBe(mockStream);
        });

        it('should handle image not found with 404 status', async () => {
            const imageName = 'non-existent.jpg';
            const ctx = createMockContext({ params: { name: imageName } });

            const serviceError = Object.assign(new Error('Image not found'), { status: 404 });
            mockImageService.getImage.mockRejectedValue(serviceError);

            await imageHandlers.getImage(ctx);

            expect(mockImageService.getImage).toHaveBeenCalledWith(imageName);
            expect(ctx.response.status).toBe(404);
            expect(ctx.body).toEqual({ error: 'Image not found' });
            expect(ctx.set).not.toHaveBeenCalled();
        });

        it('should handle image not found with generic message', async () => {
            const imageName = 'missing.jpg';
            const ctx = createMockContext({ params: { name: imageName } });

            const serviceError = Object.assign(new Error('File does not exist'), { status: 404 });
            mockImageService.getImage.mockRejectedValue(serviceError);

            await imageHandlers.getImage(ctx);

            expect(ctx.response.status).toBe(404);
            expect(ctx.body).toEqual({ error: 'Image not found' });
        });

        it('should handle validation errors with 400 status', async () => {
            const imageName = '';
            const ctx = createMockContext({ params: { name: imageName } });

            const serviceError = Object.assign(new Error('Image name is required'), { status: 400 });
            mockImageService.getImage.mockRejectedValue(serviceError);

            await imageHandlers.getImage(ctx);

            expect(ctx.response.status).toBe(400);
            expect(ctx.body).toEqual({ error: 'Image name is required' });
        });

        it('should handle service errors without status', async () => {
            const imageName = 'error-image.jpg';
            const ctx = createMockContext({ params: { name: imageName } });

            mockImageService.getImage.mockRejectedValue(new Error('Storage service unavailable'));

            await imageHandlers.getImage(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Storage service unavailable' });
        });

        it('should handle unknown errors', async () => {
            const imageName = 'unknown-error.jpg';
            const ctx = createMockContext({ params: { name: imageName } });

            mockImageService.getImage.mockRejectedValue({});

            await imageHandlers.getImage(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Internal Server Error' });
        });

        it('should handle service errors with custom status codes', async () => {
            const imageName = 'forbidden.jpg';
            const ctx = createMockContext({ params: { name: imageName } });

            const serviceError = Object.assign(new Error('Access denied'), { status: 403 });
            mockImageService.getImage.mockRejectedValue(serviceError);

            await imageHandlers.getImage(ctx);

            expect(ctx.response.status).toBe(403);
            expect(ctx.body).toEqual({ error: 'Access denied' });
        });

        it('should handle null error objects', async () => {
            const imageName = 'null-error.jpg';
            const ctx = createMockContext({ params: { name: imageName } });

            // When error is null, accessing err.status throws an error
            mockImageService.getImage.mockRejectedValue(null);

            await expect(imageHandlers.getImage(ctx)).rejects.toThrow();
        });

        it('should handle error objects without message', async () => {
            const imageName = 'no-message.jpg';
            const ctx = createMockContext({ params: { name: imageName } });

            mockImageService.getImage.mockRejectedValue({ status: 500 });

            await imageHandlers.getImage(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Internal Server Error' });
        });

        it('should set correct headers for different content types', async () => {
            const testCases = [
                { name: 'image.webp', contentType: 'image/webp' },
                { name: 'image.gif', contentType: 'image/gif' },
                { name: 'image.bmp', contentType: 'image/bmp' },
                { name: 'image.svg', contentType: 'image/svg+xml' }
            ];

            for (const testCase of testCases) {
                const ctx = createMockContext({ params: { name: testCase.name } });
                const mockStream = {} as NodeJS.ReadableStream;
                const mockImageResponse = {
                    stream: mockStream,
                    contentType: testCase.contentType,
                    cacheControl: 'public, max-age=31536000, immutable'
                };

                mockImageService.getImage.mockResolvedValue(mockImageResponse);

                await imageHandlers.getImage(ctx);

                expect(ctx.set).toHaveBeenCalledWith('Content-Type', testCase.contentType);
                expect(ctx.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=31536000, immutable');

                vi.clearAllMocks();
                mockDependencyContainer.resolve.mockReturnValue(mockImageService);
            }
        });
    });

    describe('dependency resolution', () => {
        it('should resolve ImageService from dependency container', async () => {
            const ctx = createMockContext({ params: { name: 'test.jpg' } });
            const mockImageResponse = {
                stream: {} as NodeJS.ReadableStream,
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=31536000, immutable'
            };

            mockImageService.getImage.mockResolvedValue(mockImageResponse);

            await imageHandlers.getImage(ctx);

            expect(mockDependencyContainer.resolve).toHaveBeenCalledWith('ImageService');
        });
    });

    describe('edge cases', () => {
        it('should handle undefined image name', async () => {
            const ctx = createMockContext({ params: {} });

            const serviceError = Object.assign(new Error('Image name is required'), { status: 400 });
            mockImageService.getImage.mockRejectedValue(serviceError);

            await imageHandlers.getImage(ctx);

            expect(mockImageService.getImage).toHaveBeenCalledWith(undefined);
            expect(ctx.response.status).toBe(400);
        });

        it('should handle special characters in image names', async () => {
            const imageName = 'test-image@2x.jpg';
            const mockStream = {} as NodeJS.ReadableStream;
            const mockImageResponse = {
                stream: mockStream,
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=31536000, immutable'
            };

            const ctx = createMockContext({ params: { name: imageName } });
            mockImageService.getImage.mockResolvedValue(mockImageResponse);

            await imageHandlers.getImage(ctx);

            expect(mockImageService.getImage).toHaveBeenCalledWith(imageName);
            expect(ctx.body).toBe(mockStream);
        });

        it('should handle long image names', async () => {
            const imageName = 'a'.repeat(1000) + '.jpg';
            const mockStream = {} as NodeJS.ReadableStream;
            const mockImageResponse = {
                stream: mockStream,
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=31536000, immutable'
            };

            const ctx = createMockContext({ params: { name: imageName } });
            mockImageService.getImage.mockResolvedValue(mockImageResponse);

            await imageHandlers.getImage(ctx);

            expect(mockImageService.getImage).toHaveBeenCalledWith(imageName);
            expect(ctx.body).toBe(mockStream);
        });
    });
});
