import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as catalogueHandlers from './index';

const mockCatalogueService = vi.hoisted(() => ({
    getCatalogue: vi.fn(),
    createCatalogue: vi.fn(),
    getAllCatalogues: vi.fn(),
    deleteCatalogue: vi.fn()
}));

const mockDependencyContainer = vi.hoisted(() => ({
    resolve: vi.fn()
}));

vi.mock('../../dependencies', () => ({
    dependencyContainer: mockDependencyContainer
}));

vi.mock('../../domain/CatalogueService', () => ({
    CatalogueService: vi.fn()
}));

const createMockContext = (overrides: any = {}) => ({
    params: {},
    request: { body: {} },
    body: undefined,
    status: 200,
    response: { status: 200 },
    ...overrides
});

describe('CatalogueHandlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDependencyContainer.resolve.mockReturnValue(mockCatalogueService);
    });

    describe('getCatalogue', () => {
        it('should return catalogue for valid ID', async () => {
            const ctx = createMockContext({ params: { id: 'catalogue-123' } });
            const mockCatalogue = {
                _id: 'catalogue-123',
                designs: [{ id: 'design1' }],
                materials: [{ id: 'material1' }]
            };

            mockCatalogueService.getCatalogue.mockResolvedValue(mockCatalogue);

            await catalogueHandlers.getCatalogue(ctx);

            expect(mockCatalogueService.getCatalogue).toHaveBeenCalledWith('catalogue-123');
            expect(ctx.body).toEqual({
                id: 'catalogue-123',
                designs: [{ id: 'design1' }],
                materials: [{ id: 'material1' }]
            });
        });

        it('should handle catalogue not found', async () => {
            const ctx = createMockContext({ params: { id: 'non-existent' } });
            const error = Object.assign(new Error('Catalogue not found'), { status: 404 });

            mockCatalogueService.getCatalogue.mockRejectedValue(error);

            await catalogueHandlers.getCatalogue(ctx);

            expect(ctx.status).toBe(404);
            expect(ctx.body).toEqual({ error: 'Catalogue not found' });
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext({ params: { id: 'test' } });
            const error = Object.assign(new Error('Service error'), { status: 500 });

            mockCatalogueService.getCatalogue.mockRejectedValue(error);

            await catalogueHandlers.getCatalogue(ctx);

            expect(ctx.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Service error' });
        });

        it('should handle null error objects', async () => {
            const ctx = createMockContext({ params: { id: 'test' } });
            mockCatalogueService.getCatalogue.mockRejectedValue(null);

            await catalogueHandlers.getCatalogue(ctx);

            expect(ctx.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Internal Server Error' });
        });
    });

    describe('addCatalogue', () => {
        it('should create catalogue successfully', async () => {
            const ctx = createMockContext({ request: { body: { id: 'new-catalogue' } } });
            const mockCatalogue = {
                _id: 'new-catalogue',
                designs: [],
                materials: []
            };

            mockCatalogueService.createCatalogue.mockResolvedValue(mockCatalogue);

            await catalogueHandlers.addCatalogue(ctx);

            expect(mockCatalogueService.createCatalogue).toHaveBeenCalledWith('new-catalogue');
            expect(ctx.status).toBe(201);
            expect(ctx.body).toEqual({
                id: 'new-catalogue',
                designs: [],
                materials: []
            });
        });

        it('should handle creation errors', async () => {
            const ctx = createMockContext({ request: { body: { id: 'duplicate' } } });
            const error = Object.assign(new Error('Catalogue already exists'), { status: 409 });

            mockCatalogueService.createCatalogue.mockRejectedValue(error);

            await catalogueHandlers.addCatalogue(ctx);

            expect(ctx.status).toBe(409);
            expect(ctx.body).toEqual({ error: 'Catalogue already exists' });
        });
    });

    describe('getAllCatalogues', () => {
        it('should return all catalogues', async () => {
            const ctx = createMockContext();
            const mockCatalogues = [
                { _id: 'cat1', designs: [], materials: [] },
                { _id: 'cat2', designs: [{ id: 'design1' }], materials: [{ id: 'mat1' }] }
            ];

            mockCatalogueService.getAllCatalogues.mockResolvedValue(mockCatalogues);

            await catalogueHandlers.getAllCatalogues(ctx);

            expect(ctx.body).toEqual([
                { id: 'cat1', designs: [], materials: [] },
                { id: 'cat2', designs: [{ id: 'design1' }], materials: [{ id: 'mat1' }] }
            ]);
        });

        it('should handle service errors', async () => {
            const ctx = createMockContext();
            const error = Object.assign(new Error('Database error'), { status: 500 });

            mockCatalogueService.getAllCatalogues.mockRejectedValue(error);

            await catalogueHandlers.getAllCatalogues(ctx);

            expect(ctx.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Database error' });
        });
    });

    describe('deleteCatalogue', () => {
        it('should delete catalogue successfully', async () => {
            const ctx = createMockContext({ params: { id: 'catalogue-123' } });

            mockCatalogueService.deleteCatalogue.mockResolvedValue(undefined);

            await catalogueHandlers.deleteCatalogue(ctx);

            expect(mockCatalogueService.deleteCatalogue).toHaveBeenCalledWith('catalogue-123');
            expect(ctx.status).toBe(200);
            expect(ctx.body).toEqual({ message: 'Catalogue deleted successfully' });
        });

        it('should handle catalogue not found during delete', async () => {
            const ctx = createMockContext({ params: { id: 'non-existent' } });
            const error = Object.assign(new Error('Catalogue not found'), { status: 404 });

            mockCatalogueService.deleteCatalogue.mockRejectedValue(error);

            await catalogueHandlers.deleteCatalogue(ctx);

            expect(ctx.status).toBe(404);
            expect(ctx.body).toEqual({ error: 'Catalogue not found' });
        });
    });

    describe('dependency resolution', () => {
        it('should resolve CatalogueService from dependency container', async () => {
            const ctx = createMockContext({ params: { id: 'test' } });
            mockCatalogueService.getCatalogue.mockResolvedValue({ _id: 'test', designs: [], materials: [] });

            await catalogueHandlers.getCatalogue(ctx);

            expect(mockDependencyContainer.resolve).toHaveBeenCalledWith('CatalogueService');
        });
    });

    describe('error handling edge cases', () => {
        it('should handle error objects without message', async () => {
            const ctx = createMockContext({ params: { id: 'test' } });
            const error = { status: 400 };

            mockCatalogueService.getCatalogue.mockRejectedValue(error);

            await catalogueHandlers.getCatalogue(ctx);

            expect(ctx.status).toBe(400);
            expect(ctx.body).toEqual({ error: 'Internal Server Error' });
        });

        it('should handle string errors', async () => {
            const ctx = createMockContext({ params: { id: 'test' } });

            mockCatalogueService.getCatalogue.mockRejectedValue('String error');

            await catalogueHandlers.getCatalogue(ctx);

            expect(ctx.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Internal Server Error' });
        });
    });
});
