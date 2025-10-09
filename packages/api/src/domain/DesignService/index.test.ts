import type { Design, RequiredMaterial, UploadDesign } from '@jewellery-catalogue/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DesignRepository } from '../DesignRepository';
import type { IdGenerator } from '../IdGenerator';
import type { ImageService } from '../ImageService';
import { DesignService } from './index';

const mockDesignRepo = {
    getById: vi.fn(),
    getByIdAndUserId: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
};

const mockImageService = {
    uploadImage: vi.fn(),
    getImage: vi.fn(),
    deleteImage: vi.fn(),
};

const mockIdGenerator = {
    generate: vi.fn(),
};

describe('DesignService', () => {
    let service: DesignService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new DesignService(
            mockDesignRepo as unknown as DesignRepository,
            mockImageService as unknown as ImageService,
            mockIdGenerator as unknown as IdGenerator
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
                imageId: 'image-123',
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
                imageId: 'image-123',
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

        beforeEach(() => {
            mockIdGenerator.generate.mockReturnValueOnce('design-id-123').mockReturnValueOnce('image-id-123');
        });

        it('should add design successfully', async () => {
            mockImageService.uploadImage.mockResolvedValue(undefined);
            mockDesignRepo.insert.mockResolvedValue(undefined);

            const result = await service.addDesign(mockDesignData, mockImageBuffer, mockContentType, userId);

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
                    imageId: 'image-id-123',
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

            const result = await service.addDesign(
                designDataWithStringMaterials,
                mockImageBuffer,
                mockContentType,
                userId
            );

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

            const result = await service.addDesign(
                designDataWithArrayMaterials,
                mockImageBuffer,
                mockContentType,
                userId
            );

            expect(result.materials).toEqual(materials);
        });

        it('should throw error for invalid materials JSON', async () => {
            const designDataWithInvalidMaterials = {
                ...mockDesignData,
                materials: 'invalid json',
            };

            await expect(
                service.addDesign(designDataWithInvalidMaterials, mockImageBuffer, mockContentType, userId)
            ).rejects.toMatchObject({
                message: 'Invalid materials format',
                status: 400,
            });

            expect(mockImageService.uploadImage).toHaveBeenCalled();
        });

        it('should propagate image service errors', async () => {
            mockImageService.uploadImage.mockRejectedValue(new Error('Upload failed'));

            await expect(service.addDesign(mockDesignData, mockImageBuffer, mockContentType, userId)).rejects.toThrow(
                'Upload failed'
            );

            expect(mockDesignRepo.insert).not.toHaveBeenCalled();
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
            imageId: 'image-123',
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
            imageId: 'image-123',
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
});
