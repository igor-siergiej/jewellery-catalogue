import { type FormMaterial, type Material, MaterialType, METAL_TYPE, WIRE_TYPE } from '@jewellery-catalogue/types';
import type { Context } from 'koa';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as materialHandlers from './index';

const mockDependencyContainer = vi.hoisted(() => ({
    resolve: vi.fn(),
}));

vi.mock('../../dependencies', () => ({
    dependencyContainer: mockDependencyContainer,
}));

const mockMaterialService = {
    getMaterialsByUserId: vi.fn(),
    getMaterial: vi.fn(),
    addMaterial: vi.fn(),
    updateMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
};

const createMockContext = (overrides: Partial<Context> = {}): Context => {
    const ctx = {
        params: {},
        request: { body: {} } as Context['request'],
        response: { status: 200 } as Context['response'],
        state: { userId: 'user-123' },
        set: vi.fn(),
        status: 200,
        body: {},
        ...overrides,
    } as Context;

    Object.defineProperty(ctx, 'status', {
        get: () => ctx.response.status,
        set: (value) => {
            ctx.response.status = value;
        },
        configurable: true,
        enumerable: true,
    });

    Object.defineProperty(ctx, 'body', {
        get: () => ctx.response.body,
        set: (value) => {
            ctx.response.body = value;
        },
        configurable: true,
        enumerable: true,
    });

    return ctx;
};

describe('MaterialHandlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDependencyContainer.resolve.mockReturnValue(mockMaterialService);
    });

    describe('getMaterials', () => {
        it('should return materials for valid user ID', async () => {
            const mockMaterials: Array<Material> = [
                {
                    id: 'material-1',
                    type: MaterialType.WIRE,
                    name: 'Silver Wire',
                    brand: 'Wire Co',
                    purchaseUrl: 'https://wire.com',
                    diameter: 1.0,
                    wireType: WIRE_TYPE.FULL,
                    metalType: METAL_TYPE.SILVER,
                    length: 10,
                    pricePerMeter: 2.0,
                },
            ];

            const ctx = createMockContext();

            mockMaterialService.getMaterialsByUserId.mockResolvedValue(mockMaterials);

            await materialHandlers.getMaterials(ctx);

            expect(mockMaterialService.getMaterialsByUserId).toHaveBeenCalledWith('user-123');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual(mockMaterials);
        });

        it('should handle service errors with status', async () => {
            const ctx = createMockContext();

            const serviceError = Object.assign(new Error('Service error'), { status: 500 });

            mockMaterialService.getMaterialsByUserId.mockRejectedValue(serviceError);

            await materialHandlers.getMaterials(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Service error' });
        });

        it('should handle service errors without status', async () => {
            const ctx = createMockContext();

            mockMaterialService.getMaterialsByUserId.mockRejectedValue(new Error('Database error'));

            await materialHandlers.getMaterials(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Database error' });
        });

        it('should handle unknown errors', async () => {
            const ctx = createMockContext();

            mockMaterialService.getMaterialsByUserId.mockRejectedValue({});

            await materialHandlers.getMaterials(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Internal Server Error' });
        });
    });

    describe('getMaterial', () => {
        it('should return material for valid ID with userId', async () => {
            const materialId = 'material-123';
            const mockMaterial: Material = {
                id: materialId,
                type: MaterialType.BEAD,
                name: 'Glass Beads',
                brand: 'Bead Co',
                purchaseUrl: 'https://bead.com',
                diameter: 8,
                colour: 'Blue',
                quantity: 100,
                pricePerBead: 0.15,
            };

            const ctx = createMockContext({ params: { id: materialId } });

            mockMaterialService.getMaterial.mockResolvedValue(mockMaterial);

            await materialHandlers.getMaterial(ctx);

            expect(mockMaterialService.getMaterial).toHaveBeenCalledWith(materialId, 'user-123');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual(mockMaterial);
        });

        it('should handle material not found', async () => {
            const materialId = 'non-existent';
            const ctx = createMockContext({ params: { id: materialId } });

            const serviceError = Object.assign(new Error('Material not found'), { status: 404 });

            mockMaterialService.getMaterial.mockRejectedValue(serviceError);

            await materialHandlers.getMaterial(ctx);

            expect(ctx.response.status).toBe(404);
            expect(ctx.body).toEqual({ error: 'Material not found' });
        });

        it('should handle service errors', async () => {
            const materialId = 'error-material';
            const ctx = createMockContext({ params: { id: materialId } });

            mockMaterialService.getMaterial.mockRejectedValue(new Error('Service unavailable'));

            await materialHandlers.getMaterial(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Service unavailable' });
        });
    });

    describe('addMaterial', () => {
        it('should add material successfully', async () => {
            const materialData: FormMaterial = {
                id: 'form-material-1',
                type: MaterialType.CHAIN,
                name: 'Gold Chain',
                brand: 'Chain Co',
                purchaseUrl: 'https://chain.com',
                metalType: METAL_TYPE.GOLD,
                wireType: WIRE_TYPE.FILLED,
                diameter: 2.0,
                length: 5,
                pricePerPack: 50.0,
                packs: 2,
            };

            const addedMaterial: Material = {
                id: 'material-new',
                type: MaterialType.CHAIN,
                name: 'Gold Chain',
                brand: 'Chain Co',
                purchaseUrl: 'https://chain.com',
                metalType: METAL_TYPE.GOLD,
                wireType: WIRE_TYPE.FILLED,
                diameter: 2.0,
                length: 5,
            };

            const ctx = createMockContext({
                request: { body: materialData } as any,
            });

            mockMaterialService.addMaterial.mockResolvedValue(addedMaterial);

            await materialHandlers.addMaterial(ctx);

            expect(mockMaterialService.addMaterial).toHaveBeenCalledWith(materialData, 'user-123');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual(addedMaterial);
        });

        it('should handle validation errors', async () => {
            const invalidMaterialData = { name: 'Invalid' };

            const ctx = createMockContext({
                request: { body: invalidMaterialData } as any,
            });

            const serviceError = Object.assign(new Error('Invalid material data'), { status: 400 });

            mockMaterialService.addMaterial.mockRejectedValue(serviceError);

            await materialHandlers.addMaterial(ctx);

            expect(ctx.response.status).toBe(400);
            expect(ctx.body).toEqual({ error: 'Invalid material data' });
        });

        it('should handle service errors', async () => {
            const materialData: FormMaterial = {
                id: 'material-1',
                type: MaterialType.WIRE,
                name: 'Test Wire',
                brand: 'Test',
                purchaseUrl: 'https://test.com',
                wireType: WIRE_TYPE.FULL,
                metalType: METAL_TYPE.COPPER,
                diameter: 1.0,
                length: 5,
                pricePerPack: 10.0,
                packs: 1,
            };

            const ctx = createMockContext({
                request: { body: materialData } as any,
            });

            const serviceError = Object.assign(new Error('Service error'), { status: 500 });

            mockMaterialService.addMaterial.mockRejectedValue(serviceError);

            await materialHandlers.addMaterial(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Service error' });
        });
    });

    describe('updateMaterial', () => {
        it('should update material successfully', async () => {
            const materialId = 'material-123';
            const updates = { name: 'Updated Material Name', pricePerMeter: 3.0 };
            const updatedMaterial: Material = {
                id: materialId,
                type: MaterialType.WIRE,
                name: 'Updated Material Name',
                brand: 'Wire Co',
                purchaseUrl: 'https://wire.com',
                diameter: 1.0,
                wireType: WIRE_TYPE.FULL,
                metalType: METAL_TYPE.SILVER,
                length: 10,
                pricePerMeter: 3.0,
            };

            const ctx = createMockContext({
                params: { id: materialId },
                request: { body: updates } as any,
            });

            mockMaterialService.updateMaterial.mockResolvedValue(updatedMaterial);

            await materialHandlers.updateMaterial(ctx);

            expect(mockMaterialService.updateMaterial).toHaveBeenCalledWith(materialId, updates, 'user-123');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual(updatedMaterial);
        });

        it('should handle material not found during update', async () => {
            const materialId = 'non-existent';
            const updates = { name: 'Updated Name' };

            const ctx = createMockContext({
                params: { id: materialId },
                request: { body: updates } as any,
            });

            const serviceError = Object.assign(new Error('Material not found'), { status: 404 });

            mockMaterialService.updateMaterial.mockRejectedValue(serviceError);

            await materialHandlers.updateMaterial(ctx);

            expect(ctx.response.status).toBe(404);
            expect(ctx.body).toEqual({ error: 'Material not found' });
        });

        it('should handle invalid update data', async () => {
            const materialId = 'material-123';
            const invalidUpdates = { invalidField: 'value' };

            const ctx = createMockContext({
                params: { id: materialId },
                request: { body: invalidUpdates } as any,
            });

            const serviceError = Object.assign(new Error('Invalid update data'), { status: 400 });

            mockMaterialService.updateMaterial.mockRejectedValue(serviceError);

            await materialHandlers.updateMaterial(ctx);

            expect(ctx.response.status).toBe(400);
            expect(ctx.body).toEqual({ error: 'Invalid update data' });
        });
    });

    describe('deleteMaterial', () => {
        it('should delete material successfully', async () => {
            const materialId = 'material-123';

            const ctx = createMockContext({ params: { id: materialId } });

            mockMaterialService.deleteMaterial.mockResolvedValue(undefined);

            await materialHandlers.deleteMaterial(ctx);

            expect(mockMaterialService.deleteMaterial).toHaveBeenCalledWith(materialId, 'user-123');
            expect(ctx.response.status).toBe(200);
            expect(ctx.body).toEqual({ message: 'Material deleted successfully' });
        });

        it('should handle material not found during delete', async () => {
            const materialId = 'non-existent';

            const ctx = createMockContext({ params: { id: materialId } });

            const serviceError = Object.assign(new Error('Material not found'), { status: 404 });

            mockMaterialService.deleteMaterial.mockRejectedValue(serviceError);

            await materialHandlers.deleteMaterial(ctx);

            expect(ctx.response.status).toBe(404);
            expect(ctx.body).toEqual({ error: 'Material not found' });
        });

        it('should handle delete service errors', async () => {
            const materialId = 'error-material';

            const ctx = createMockContext({ params: { id: materialId } });

            mockMaterialService.deleteMaterial.mockRejectedValue(new Error('Delete failed'));

            await materialHandlers.deleteMaterial(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Delete failed' });
        });
    });

    describe('dependency resolution', () => {
        it('should resolve MaterialService from dependency container', async () => {
            const ctx = createMockContext();

            mockMaterialService.getMaterialsByUserId.mockResolvedValue([]);

            await materialHandlers.getMaterials(ctx);

            expect(mockDependencyContainer.resolve).toHaveBeenCalledWith('MaterialService');
        });
    });

    describe('error handling edge cases', () => {
        it('should handle null error objects', async () => {
            const ctx = createMockContext({ params: { id: 'test' } });

            mockMaterialService.getMaterial.mockRejectedValue(null);

            await materialHandlers.getMaterial(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Internal Server Error' });
        });

        it('should handle error objects without message', async () => {
            const ctx = createMockContext({ params: { id: 'test' } });

            mockMaterialService.getMaterial.mockRejectedValue({ status: 403 });

            await materialHandlers.getMaterial(ctx);

            expect(ctx.response.status).toBe(403);
            expect(ctx.body).toEqual({ error: 'Internal Server Error' });
        });

        it('should handle string errors', async () => {
            const ctx = createMockContext({ params: { id: 'test' } });

            mockMaterialService.getMaterial.mockRejectedValue('String error');

            await materialHandlers.getMaterial(ctx);

            expect(ctx.response.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Internal Server Error' });
        });
    });
});
