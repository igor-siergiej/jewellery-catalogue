import { beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import type { Chain, Design, RequiredMaterial, UploadDesign, Wire } from '@jewellery-catalogue/types';
import { MaterialType, METAL_TYPE, WIRE_TYPE } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { IdGenerator } from '../IdGenerator';
import type { ImageService } from '../ImageService';
import type { MaterialRepository } from '../MaterialRepository';
import { DesignService } from './index';

const mockDesignRepo = {
    getById: mock(),
    getByIdAndUserId: mock(),
    insert: mock(),
    update: mock(),
    delete: mock(),
    getAll: mock(),
};

const mockImageService = {
    uploadImage: mock(),
    getImage: mock(),
    deleteImage: mock(),
};

const mockIdGenerator = {
    generate: mock(),
};

const mockMaterialRepo = {
    getById: mock(),
    getByIdAndUserId: mock(),
    getByUserId: mock(),
    getAll: mock(),
    insert: mock(),
    update: mock(),
    delete: mock(),
};

describe('DesignService', () => {
    let service: DesignService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new DesignService(
            mockDesignRepo as unknown as DesignRepository,
            mockImageService as unknown as ImageService,
            mockIdGenerator as unknown as IdGenerator,
            mockMaterialRepo as unknown as MaterialRepository
        );
    });

    describe('getDesign', () => {
        it('should return design for valid ID', async () => {
            const designId = 'design-123';
            const userId = 'user-123';
            const mockDesign: Design = {
                id: designId,
                userId,
                name: 'Test Design',
                description: 'Test description',
                timeRequired: '45',
                totalMaterialCosts: 20.0,
                price: 35.0,
                imageIds: ['image-123'],
                materials: [],
                dateAdded: new Date('2025-01-01'),
            };

            mockDesignRepo.getByIdAndUserId.mockResolvedValue(mockDesign);

            const result = await service.getDesign(designId, userId);

            expect(mockDesignRepo.getByIdAndUserId).toHaveBeenCalledWith(designId, userId);
            expect(result).toEqual(mockDesign);
        });

        it('should throw error when user does not own the design', async () => {
            const designId = 'design-123';
            const userId = 'user-123';
            const wrongUserId = 'wrong-user';
            const _mockDesign: Design = {
                id: designId,
                name: 'Test Design',
                description: 'Test description',
                timeRequired: '45',
                userId: wrongUserId,
                totalMaterialCosts: 20.0,
                price: 35.0,
                imageIds: ['image-123'],
                materials: [],
                dateAdded: new Date('2025-01-01'),
            };

            mockDesignRepo.getByIdAndUserId.mockResolvedValue(null);

            await expect(service.getDesign(designId, userId)).rejects.toMatchObject({
                message: 'Design not found',
                status: 404,
            });
        });

        it('should throw error for empty design ID', async () => {
            await expect(service.getDesign('', 'user-123')).rejects.toMatchObject({
                message: 'Design ID is required',
                status: 400,
            });

            expect(mockDesignRepo.getByIdAndUserId).not.toHaveBeenCalled();
        });

        it('should throw error when design not found', async () => {
            const designId = 'non-existent';
            const userId = 'user-123';

            mockDesignRepo.getByIdAndUserId.mockResolvedValue(null);

            await expect(service.getDesign(designId, userId)).rejects.toMatchObject({
                message: 'Design not found',
                status: 404,
            });

            expect(mockDesignRepo.getByIdAndUserId).toHaveBeenCalledWith(designId, userId);
        });
    });

    describe('addDesign', () => {
        const userId = 'user-123';

        const mockDesignData: UploadDesign = {
            name: 'New Design',
            description: 'New design description',
            timeRequired: '6',
            totalMaterialCosts: 30.0,
            price: 50.0,
            materials: [],
        };

        const mockImageBuffer = Buffer.from('image data');
        const mockContentType = 'image/jpeg';
        const mockImageBuffers = [{ buffer: mockImageBuffer, contentType: mockContentType }];

        beforeEach(() => {
            mockIdGenerator.generate.mockReturnValueOnce('design-id-123').mockReturnValueOnce('image-id-123');
        });

        it('should add design successfully', async () => {
            mockImageService.uploadImage.mockResolvedValue(undefined);
            mockDesignRepo.insert.mockResolvedValue(undefined);

            const result = await service.addDesign(mockDesignData, mockImageBuffers, [], [], [], userId);

            expect(mockImageService.uploadImage).toHaveBeenCalledWith('image-id-123', mockImageBuffer, mockContentType);
            expect(mockDesignRepo.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'design-id-123',
                    userId,
                    name: 'New Design',
                    description: 'New design description',
                    timeRequired: '6',
                    totalMaterialCosts: 30.0,
                    price: 50.0,
                    imageIds: ['image-id-123'],
                    materials: [],
                    dateAdded: expect.any(Date),
                })
            );
            expect(result.id).toBe('design-id-123');
            expect(result.dateAdded).toBeInstanceOf(Date);
        });

        it('should parse materials from string', async () => {
            const materials: Array<RequiredMaterial> = [
                { materialId: 'material-1', quantity: 2 },
                { materialId: 'material-2', quantity: 1 },
            ];

            const designDataWithStringMaterials = {
                ...mockDesignData,
                materials: JSON.stringify(materials),
            };

            mockImageService.uploadImage.mockResolvedValue(undefined);
            mockDesignRepo.insert.mockResolvedValue(undefined);

            const result = await service.addDesign(designDataWithStringMaterials, mockImageBuffers, [], [], [], userId);

            expect(result.materials).toEqual(materials);
        });

        it('should handle materials as array directly', async () => {
            const materials: Array<RequiredMaterial> = [{ materialId: 'material-3', quantity: 3 }];

            const designDataWithArrayMaterials = {
                ...mockDesignData,
                materials,
            };

            mockImageService.uploadImage.mockResolvedValue(undefined);
            mockDesignRepo.insert.mockResolvedValue(undefined);

            const result = await service.addDesign(designDataWithArrayMaterials, mockImageBuffers, [], [], [], userId);

            expect(result.materials).toEqual(materials);
        });

        it('should throw error for invalid materials JSON', async () => {
            const designDataWithInvalidMaterials = {
                ...mockDesignData,
                materials: 'invalid json',
            };

            await expect(
                service.addDesign(designDataWithInvalidMaterials, mockImageBuffers, [], [], [], userId)
            ).rejects.toMatchObject({
                message: 'Invalid materials format',
                status: 400,
            });

            expect(mockImageService.uploadImage).toHaveBeenCalled();
        });

        it('should propagate image service errors', async () => {
            mockImageService.uploadImage.mockRejectedValue(new Error('Upload failed'));

            await expect(service.addDesign(mockDesignData, mockImageBuffers, [], [], [], userId)).rejects.toThrow(
                'Upload failed'
            );

            expect(mockDesignRepo.insert).not.toHaveBeenCalled();
        });
    });

    describe('addDesign — maker docs', () => {
        it('uploads diagram images separately from product images and stores both id lists plus makingNotes', async () => {
            mockIdGenerator.generate
                .mockReturnValueOnce('design-1')
                .mockReturnValueOnce('product-img-1')
                .mockReturnValueOnce('diagram-img-1');
            mockImageService.uploadImage.mockResolvedValue(undefined);

            const designData = {
                name: 'Test',
                description: 'desc',
                timeRequired: '01:00',
                materials: JSON.stringify([]),
                totalMaterialCosts: 10,
                price: 20,
                image: undefined,
                makingNotes: 'Solder the clasp before adding the chain.',
            } as any;

            const result = await service.addDesign(
                designData,
                [{ buffer: Buffer.from('product'), contentType: 'image/png' }],
                [],
                [{ buffer: Buffer.from('diagram'), contentType: 'image/png' }],
                [],
                'user-1'
            );

            expect(result.imageIds).toEqual(['product-img-1']);
            expect(result.diagramImageIds).toEqual(['diagram-img-1']);
            expect(result.makingNotes).toBe('Solder the clasp before adding the chain.');
            expect(mockImageService.uploadImage).toHaveBeenCalledTimes(2);
        });

        it('defaults makingNotes to empty string and diagramImageIds to empty array when omitted', async () => {
            mockIdGenerator.generate.mockReturnValueOnce('design-2');

            const designData = {
                name: 'Test',
                description: 'desc',
                timeRequired: '01:00',
                materials: JSON.stringify([]),
                totalMaterialCosts: 10,
                price: 20,
                image: undefined,
            } as any;

            const result = await service.addDesign(designData, [], [], [], [], 'user-1');

            expect(result.diagramImageIds).toEqual([]);
            expect(result.makingNotes).toBe('');
        });
    });

    describe('updateDesign', () => {
        const designId = 'design-123';
        const userId = 'user-123';
        const existingDesign: Design = {
            id: designId,
            userId,
            name: 'Existing Design',
            description: 'Existing description',
            timeRequired: '30',
            totalMaterialCosts: 15.0,
            price: 25.0,
            imageIds: ['image-123'],
            materials: [],
            dateAdded: new Date('2025-01-01'),
        };

        it('should update design successfully', async () => {
            const updates = { name: 'Updated Design', price: 30.0 };
            const expectedUpdated = { ...existingDesign, ...updates };

            mockDesignRepo.getByIdAndUserId.mockResolvedValue(existingDesign);
            mockDesignRepo.update.mockResolvedValue(undefined);

            const result = await service.updateDesign(designId, updates, userId);

            expect(mockDesignRepo.getByIdAndUserId).toHaveBeenCalledWith(designId, userId);
            expect(mockDesignRepo.update).toHaveBeenCalledWith(designId, expectedUpdated);
            expect(result).toEqual(expectedUpdated);
        });

        it('should throw error for empty design ID', async () => {
            await expect(service.updateDesign('', { name: 'Updated' }, userId)).rejects.toMatchObject({
                message: 'Design ID is required',
                status: 400,
            });

            expect(mockDesignRepo.getByIdAndUserId).not.toHaveBeenCalled();
        });

        it('should throw error when design not found', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(null);

            await expect(service.updateDesign(designId, { name: 'Updated' }, userId)).rejects.toMatchObject({
                message: 'Design not found',
                status: 404,
            });

            expect(mockDesignRepo.update).not.toHaveBeenCalled();
        });

        it('should handle partial updates', async () => {
            const updates = { description: 'Updated description only' };
            const expectedUpdated = { ...existingDesign, ...updates };

            mockDesignRepo.getByIdAndUserId.mockResolvedValue(existingDesign);
            mockDesignRepo.update.mockResolvedValue(undefined);

            const result = await service.updateDesign(designId, updates, userId);

            expect(result).toEqual(expectedUpdated);
            expect(result.name).toBe(existingDesign.name); // unchanged
            expect(result.description).toBe(updates.description); // updated
        });
    });

    describe('deleteDesign', () => {
        const designId = 'design-123';
        const userId = 'user-123';
        const existingDesign: Design = {
            id: designId,
            userId: 'user-123',
            name: 'Design to Delete',
            description: 'Will be deleted',
            timeRequired: '30',
            totalMaterialCosts: 15.0,
            price: 25.0,
            imageIds: ['image-123'],
            materials: [],
            dateAdded: new Date('2025-01-01'),
        };

        it('should delete design successfully with userId', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(existingDesign);
            mockDesignRepo.delete.mockResolvedValue(undefined);

            await service.deleteDesign(designId, userId);

            expect(mockDesignRepo.getByIdAndUserId).toHaveBeenCalledWith(designId, userId);
            expect(mockDesignRepo.delete).toHaveBeenCalledWith(designId);
        });

        it('should delete design successfully', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(existingDesign);
            mockDesignRepo.delete.mockResolvedValue(undefined);

            await service.deleteDesign(designId, userId);

            expect(mockDesignRepo.getByIdAndUserId).toHaveBeenCalledWith(designId, userId);
            expect(mockDesignRepo.delete).toHaveBeenCalledWith(designId);
        });

        it('should throw error for empty design ID', async () => {
            await expect(service.deleteDesign('', userId)).rejects.toMatchObject({
                message: 'Design ID is required',
                status: 400,
            });

            expect(mockDesignRepo.getByIdAndUserId).not.toHaveBeenCalled();
        });

        it('should throw error when design not found', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(null);

            await expect(service.deleteDesign(designId, userId)).rejects.toMatchObject({
                message: 'Design not found',
                status: 404,
            });

            expect(mockDesignRepo.delete).not.toHaveBeenCalled();
        });

        it('should propagate repository delete errors', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(existingDesign);
            mockDesignRepo.delete.mockRejectedValue(new Error('Delete failed'));

            await expect(service.deleteDesign(designId, userId)).rejects.toThrow('Delete failed');

            expect(mockDesignRepo.delete).toHaveBeenCalledWith(designId);
        });
    });

    describe('error handling and edge cases', () => {
        it('should handle undefined values gracefully', async () => {
            await expect(service.getDesign(undefined as any, 'user-123')).rejects.toMatchObject({
                message: 'Design ID is required',
                status: 400,
            });

            await expect(service.updateDesign(undefined as any, {}, 'user-123')).rejects.toMatchObject({
                message: 'Design ID is required',
                status: 400,
            });

            await expect(service.deleteDesign(undefined as any, 'user-123')).rejects.toMatchObject({
                message: 'Design ID is required',
                status: 400,
            });
        });

        it('should handle repository connection failures', async () => {
            const connectionError = new Error('Database unavailable');

            mockDesignRepo.getByIdAndUserId.mockRejectedValue(connectionError);
            await expect(service.getDesign('design-1', 'user-123')).rejects.toThrow('Database unavailable');

            mockDesignRepo.getByIdAndUserId.mockRejectedValue(connectionError);
            await expect(service.updateDesign('design-1', {}, 'user-123')).rejects.toThrow('Database unavailable');

            mockDesignRepo.getByIdAndUserId.mockRejectedValue(connectionError);
            await expect(service.deleteDesign('design-1', 'user-123')).rejects.toThrow('Database unavailable');
        });
    });

    describe('produceDesigns', () => {
        const designId = 'design-123';
        const userId = 'user-123';

        const wireMaterial: Wire = {
            id: 'wire-mat-1',
            userId,
            name: 'Gold Wire',
            brand: 'WireCo',
            purchaseUrl: 'https://example.com/wire',
            type: MaterialType.WIRE,
            dateAdded: new Date('2025-01-01').toISOString(),
            diameter: 0.8,
            wireType: WIRE_TYPE.FULL,
            metalType: METAL_TYPE.GOLD,
            lengthPerPack: 5,
            pricePerPack: 10,
            totalLength: 5,
            pricePerMeter: 2,
        };

        const chainMaterial: Chain = {
            id: 'chain-mat-1',
            userId,
            name: 'Silver Chain',
            brand: 'ChainCo',
            purchaseUrl: 'https://example.com/chain',
            type: MaterialType.CHAIN,
            dateAdded: new Date('2025-01-01').toISOString(),
            diameter: 1.0,
            wireType: WIRE_TYPE.FILLED,
            metalType: METAL_TYPE.SILVER,
            lengthPerPack: 5,
            pricePerPack: 8,
            totalLength: 5,
            pricePerMeter: 1.6,
        };

        const makeDesign = (material: RequiredMaterial): Design => ({
            id: designId,
            userId,
            name: 'Test Design',
            description: 'desc',
            timeRequired: '30',
            totalMaterialCosts: 5,
            price: 20,
            imageIds: ['img-1'],
            materials: [material],
            dateAdded: new Date('2025-01-01'),
            totalQuantity: 0,
        });

        it('should deduct 0.2m from wire stock when required length is 20cm', async () => {
            const requiredWire = { ...wireMaterial, requiredLength: 20 };
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign(requiredWire as unknown as RequiredMaterial));
            mockMaterialRepo.getByIdAndUserId.mockResolvedValue(wireMaterial);
            mockMaterialRepo.update.mockResolvedValue(undefined);
            mockDesignRepo.update.mockResolvedValue(undefined);

            await service.produceDesigns(designId, 1, userId);

            expect(mockMaterialRepo.update).toHaveBeenCalledWith(
                wireMaterial.id,
                expect.objectContaining({ totalLength: 4.8 })
            );
        });

        it('should apply quantity multiplier after cm-to-m conversion for wire', async () => {
            // 20 cm × 3 = 60 cm = 0.6 m → 5 - 0.6 = 4.4 m remaining
            const requiredWire = { ...wireMaterial, requiredLength: 20 };
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign(requiredWire as unknown as RequiredMaterial));
            mockMaterialRepo.getByIdAndUserId.mockResolvedValue(wireMaterial);
            mockMaterialRepo.update.mockResolvedValue(undefined);
            mockDesignRepo.update.mockResolvedValue(undefined);

            await service.produceDesigns(designId, 3, userId);

            expect(mockMaterialRepo.update).toHaveBeenCalledWith(
                wireMaterial.id,
                expect.objectContaining({ totalLength: 4.4 })
            );
        });

        it('should deduct 0.2m from chain stock when required length is 20cm', async () => {
            const requiredChain = { ...chainMaterial, requiredLength: 20 };
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign(requiredChain as unknown as RequiredMaterial));
            mockMaterialRepo.getByIdAndUserId.mockResolvedValue(chainMaterial);
            mockMaterialRepo.update.mockResolvedValue(undefined);
            mockDesignRepo.update.mockResolvedValue(undefined);

            await service.produceDesigns(designId, 1, userId);

            expect(mockMaterialRepo.update).toHaveBeenCalledWith(
                chainMaterial.id,
                expect.objectContaining({ totalLength: 4.8 })
            );
        });

        it('should not throw when required length in metres is within stock', async () => {
            // 300 cm = 3 m, stock = 5 m → should succeed
            const requiredWire = { ...wireMaterial, requiredLength: 300 };
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign(requiredWire as unknown as RequiredMaterial));
            mockMaterialRepo.getByIdAndUserId.mockResolvedValue(wireMaterial);
            mockMaterialRepo.update.mockResolvedValue(undefined);
            mockDesignRepo.update.mockResolvedValue(undefined);

            await expect(service.produceDesigns(designId, 1, userId)).resolves.toBeDefined();
        });

        it('should throw insufficient stock when required length in metres exceeds stock', async () => {
            // 600 cm = 6 m, stock = 5 m → should throw
            const requiredWire = { ...wireMaterial, requiredLength: 600 };
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign(requiredWire as unknown as RequiredMaterial));
            mockMaterialRepo.getByIdAndUserId.mockResolvedValue(wireMaterial);

            await expect(service.produceDesigns(designId, 1, userId)).rejects.toMatchObject({
                message: expect.stringContaining('Insufficient stock'),
                status: 400,
            });
        });
    });
});
