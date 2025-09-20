import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDesignService = vi.hoisted(() => ({
    getDesignsByCatalogue: vi.fn(),
    getDesign: vi.fn(),
    addDesign: vi.fn(),
    updateDesign: vi.fn(),
    deleteDesign: vi.fn()
}));

const mockDependencyContainer = vi.hoisted(() => ({
    resolve: vi.fn()
}));

vi.mock('../../dependencies', () => ({
    dependencyContainer: mockDependencyContainer
}));

vi.mock('../../domain/DesignService', () => ({
    DesignService: vi.fn()
}));

vi.mock('fs', () => ({
    default: {
        readFileSync: vi.fn()
    }
}));

import fs from 'fs';
import * as designHandlers from './index';

const createMockContext = (overrides: any = {}) => ({
    params: {},
    request: {
        body: {},
        files: {}
    },
    body: undefined,
    status: 200,
    response: { status: 200 },
    ...overrides
});

describe('DesignHandlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDependencyContainer.resolve.mockReturnValue(mockDesignService);
    });

    describe('getDesigns', () => {
        it('should return designs for valid catalogue ID', async () => {
            const ctx = createMockContext({ params: { catalogueId: 'catalogue-123' } });
            const mockDesigns = [
                { id: 'design1', name: 'Design 1' },
                { id: 'design2', name: 'Design 2' }
            ];

            mockDesignService.getDesignsByCatalogue.mockResolvedValue(mockDesigns);

            await designHandlers.getDesigns(ctx);

            expect(mockDesignService.getDesignsByCatalogue).toHaveBeenCalledWith('catalogue-123');
            expect(ctx.body).toEqual(mockDesigns);
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({ params: { catalogueId: 'test' } });
            const error = Object.assign(new Error('Service error'), { status: 500 });

            mockDesignService.getDesignsByCatalogue.mockRejectedValue(error);

            await designHandlers.getDesigns(ctx);

            expect(ctx.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Service error' });
        });
    });

    describe('getDesign', () => {
        it('should return design for valid ID', async () => {
            const ctx = createMockContext({ params: { id: 'design-123' } });
            const mockDesign = { id: 'design-123', name: 'Test Design' };

            mockDesignService.getDesign.mockResolvedValue(mockDesign);

            await designHandlers.getDesign(ctx);

            expect(mockDesignService.getDesign).toHaveBeenCalledWith('design-123');
            expect(ctx.body).toEqual(mockDesign);
        });

        it('should handle design not found', async () => {
            const ctx = createMockContext({ params: { id: 'non-existent' } });
            const error = Object.assign(new Error('Design not found'), { status: 404 });

            mockDesignService.getDesign.mockRejectedValue(error);

            await designHandlers.getDesign(ctx);

            expect(ctx.status).toBe(404);
            expect(ctx.body).toEqual({ error: 'Design not found' });
        });
    });

    describe('addDesign', () => {
        const mockFile = {
            filepath: '/tmp/test-file',
            mimetype: 'image/jpeg'
        };

        it('should add design successfully with file', async () => {
            const ctx = createMockContext({
                params: { catalogueId: 'catalogue-123' },
                request: {
                    files: { file: mockFile },
                    body: {
                        name: 'New Design',
                        description: 'Test description',
                        timeRequired: '2 hours',
                        materials: JSON.stringify([{ id: 'mat1', quantity: 1 }]),
                        totalMaterialCosts: '100',
                        price: '200'
                    }
                }
            });

            const mockDesign = { id: 'design-new', name: 'New Design' };
            const mockBuffer = Buffer.from('file content');

            (fs.readFileSync as any).mockReturnValue(mockBuffer);
            mockDesignService.addDesign.mockResolvedValue(mockDesign);

            await designHandlers.addDesign(ctx);

            expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/test-file');
            expect(mockDesignService.addDesign).toHaveBeenCalledWith(
                'catalogue-123',
                expect.objectContaining({
                    name: 'New Design',
                    description: 'Test description',
                    timeRequired: '2 hours',
                    materials: JSON.stringify([{ id: 'mat1', quantity: 1 }]),
                    totalMaterialCosts: 100,
                    price: 200
                }),
                mockBuffer,
                'image/jpeg'
            );
            expect(ctx.status).toBe(200);
            expect(ctx.body).toEqual(mockDesign);
        });

        it('should return error when file is missing', async () => {
            const ctx = createMockContext({
                params: { catalogueId: 'catalogue-123' },
                request: {
                    files: {},
                    body: {}
                }
            });

            await designHandlers.addDesign(ctx);

            expect(ctx.status).toBe(400);
            expect(ctx.body).toEqual({ error: 'File is required' });
            expect(mockDesignService.addDesign).not.toHaveBeenCalled();
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({
                params: { catalogueId: 'catalogue-123' },
                request: {
                    files: { file: mockFile },
                    body: {
                        name: 'New Design',
                        description: 'Test description',
                        timeRequired: '2 hours',
                        materials: '[]',
                        totalMaterialCosts: '100',
                        price: '200'
                    }
                }
            });

            const mockBuffer = Buffer.from('file content');
            const error = Object.assign(new Error('Catalogue not found'), { status: 404 });

            (fs.readFileSync as any).mockReturnValue(mockBuffer);
            mockDesignService.addDesign.mockRejectedValue(error);

            await designHandlers.addDesign(ctx);

            expect(ctx.status).toBe(404);
            expect(ctx.body).toEqual({ error: 'Catalogue not found' });
        });
    });

    describe('updateDesign', () => {
        it('should update design successfully', async () => {
            const ctx = createMockContext({
                params: { id: 'design-123' },
                request: {
                    body: { name: 'Updated Design' }
                }
            });

            const mockUpdatedDesign = { id: 'design-123', name: 'Updated Design' };
            mockDesignService.updateDesign.mockResolvedValue(mockUpdatedDesign);

            await designHandlers.updateDesign(ctx);

            expect(mockDesignService.updateDesign).toHaveBeenCalledWith('design-123', { name: 'Updated Design' });
            expect(ctx.body).toEqual(mockUpdatedDesign);
        });

        it('should handle design not found during update', async () => {
            const ctx = createMockContext({
                params: { id: 'non-existent' },
                request: { body: {} }
            });

            const error = Object.assign(new Error('Design not found'), { status: 404 });
            mockDesignService.updateDesign.mockRejectedValue(error);

            await designHandlers.updateDesign(ctx);

            expect(ctx.status).toBe(404);
            expect(ctx.body).toEqual({ error: 'Design not found' });
        });
    });

    describe('deleteDesign', () => {
        it('should delete design successfully', async () => {
            const ctx = createMockContext({ params: { id: 'design-123' } });

            mockDesignService.deleteDesign.mockResolvedValue(undefined);

            await designHandlers.deleteDesign(ctx);

            expect(mockDesignService.deleteDesign).toHaveBeenCalledWith('design-123');
            expect(ctx.status).toBe(200);
            expect(ctx.body).toEqual({ message: 'Design deleted successfully' });
        });

        it('should handle design not found during delete', async () => {
            const ctx = createMockContext({ params: { id: 'non-existent' } });
            const error = Object.assign(new Error('Design not found'), { status: 404 });

            mockDesignService.deleteDesign.mockRejectedValue(error);

            await designHandlers.deleteDesign(ctx);

            expect(ctx.status).toBe(404);
            expect(ctx.body).toEqual({ error: 'Design not found' });
        });
    });

    describe('dependency resolution', () => {
        it('should resolve DesignService from dependency container', async () => {
            const ctx = createMockContext({ params: { id: 'test' } });
            mockDesignService.getDesign.mockResolvedValue({ id: 'test', name: 'Test Design' });

            await designHandlers.getDesign(ctx);

            expect(mockDependencyContainer.resolve).toHaveBeenCalledWith('DesignService');
        });
    });

    describe('error handling edge cases', () => {
        it('should handle null error objects', async () => {
            const ctx = createMockContext({ params: { id: 'test' } });
            mockDesignService.getDesign.mockRejectedValue(null);

            await designHandlers.getDesign(ctx);

            expect(ctx.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Internal Server Error' });
        });

        it('should handle error objects without message', async () => {
            const ctx = createMockContext({ params: { id: 'test' } });
            const error = { status: 400 };

            mockDesignService.getDesign.mockRejectedValue(error);

            await designHandlers.getDesign(ctx);

            expect(ctx.status).toBe(400);
            expect(ctx.body).toEqual({ error: 'Internal Server Error' });
        });
    });
});