import { Catalogue, Design, RequiredMaterial, UploadDesign } from '@jewellery-catalogue/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogueRepository } from '../CatalogueRepository';
import { DesignRepository } from '../DesignRepository';
import { IdGenerator } from '../IdGenerator';
import { ImageService } from '../ImageService';
import { DesignService } from './index';

const mockDesignRepo = {
    getByCatalogueId: vi.fn(),
    getById: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn()
};

const mockCatalogueRepo = {
    getById: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn()
};

const mockImageService = {
    uploadImage: vi.fn(),
    getImage: vi.fn(),
    deleteImage: vi.fn()
};

const mockIdGenerator = {
    generate: vi.fn()
};

describe('DesignService', () => {
    let service: DesignService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new DesignService(
            mockDesignRepo as unknown as DesignRepository,
            mockCatalogueRepo as unknown as CatalogueRepository,
            mockImageService as unknown as ImageService,
            mockIdGenerator as unknown as IdGenerator
        );
    });

    describe('getDesignsByCatalogue', () => {
        it('should return designs for valid catalogue ID', async () => {
            const catalogueId = 'catalogue-123';
            const mockDesigns: Design[] = [
                {
                    id: 'design-1',
                    name: 'Ring Design',
                    description: 'Simple ring',
                    timeRequired: 30,
                    totalMaterialCosts: 15.50,
                    price: 25.00,
                    imageId: 'image-1',
                    materials: []
                }
            ];

            mockDesignRepo.getByCatalogueId.mockResolvedValue(mockDesigns);

            const result = await service.getDesignsByCatalogue(catalogueId);

            expect(mockDesignRepo.getByCatalogueId).toHaveBeenCalledWith(catalogueId);
            expect(result).toEqual(mockDesigns);
        });

        it('should throw error for empty catalogue ID', async () => {
            await expect(service.getDesignsByCatalogue('')).rejects.toMatchObject({
                message: 'Catalogue ID is required',
                status: 400
            });

            expect(mockDesignRepo.getByCatalogueId).not.toHaveBeenCalled();
        });

        it('should throw error for null catalogue ID', async () => {
            await expect(service.getDesignsByCatalogue(null as any)).rejects.toMatchObject({
                message: 'Catalogue ID is required',
                status: 400
            });
        });

        it('should propagate repository errors', async () => {
            const catalogueId = 'catalogue-123';
            const repoError = new Error('Database connection failed');
            mockDesignRepo.getByCatalogueId.mockRejectedValue(repoError);

            await expect(service.getDesignsByCatalogue(catalogueId)).rejects.toThrow('Database connection failed');
        });
    });

    describe('getDesign', () => {
        it('should return design for valid ID', async () => {
            const designId = 'design-123';
            const mockDesign: Design = {
                id: designId,
                name: 'Test Design',
                description: 'Test description',
                timeRequired: 45,
                totalMaterialCosts: 20.00,
                price: 35.00,
                imageId: 'image-123',
                materials: []
            };

            mockDesignRepo.getById.mockResolvedValue(mockDesign);

            const result = await service.getDesign(designId);

            expect(mockDesignRepo.getById).toHaveBeenCalledWith(designId);
            expect(result).toEqual(mockDesign);
        });

        it('should throw error for empty design ID', async () => {
            await expect(service.getDesign('')).rejects.toMatchObject({
                message: 'Design ID is required',
                status: 400
            });

            expect(mockDesignRepo.getById).not.toHaveBeenCalled();
        });

        it('should throw error when design not found', async () => {
            const designId = 'non-existent';
            mockDesignRepo.getById.mockResolvedValue(null);

            await expect(service.getDesign(designId)).rejects.toMatchObject({
                message: 'Design not found',
                status: 404
            });

            expect(mockDesignRepo.getById).toHaveBeenCalledWith(designId);
        });
    });

    describe('addDesign', () => {
        const catalogueId = 'catalogue-123';
        const mockCatalogue: Catalogue = {
            _id: catalogueId as any,
            title: 'Test Catalogue',
            description: 'Test description',
            dateCreated: new Date(),
            author: 'Test Author',
            isPublic: true,
            designs: [],
            materials: []
        };

        const mockDesignData: UploadDesign = {
            name: 'New Design',
            description: 'New design description',
            timeRequired: 60,
            totalMaterialCosts: 30.00,
            price: 50.00,
            materials: []
        };

        const mockImageBuffer = Buffer.from('image data');
        const mockContentType = 'image/jpeg';

        beforeEach(() => {
            mockIdGenerator.generate
                .mockReturnValueOnce('design-id-123')
                .mockReturnValueOnce('image-id-123');
        });

        it('should add design successfully', async () => {
            mockCatalogueRepo.getById.mockResolvedValue(mockCatalogue);
            mockImageService.uploadImage.mockResolvedValue(undefined);
            mockDesignRepo.insert.mockResolvedValue(undefined);
            mockCatalogueRepo.update.mockResolvedValue(undefined);

            const result = await service.addDesign(catalogueId, mockDesignData, mockImageBuffer, mockContentType);

            expect(mockCatalogueRepo.getById).toHaveBeenCalledWith(catalogueId);
            expect(mockImageService.uploadImage).toHaveBeenCalledWith('image-id-123', mockImageBuffer, mockContentType);
            expect(mockDesignRepo.insert).toHaveBeenCalledWith({
                id: 'design-id-123',
                name: 'New Design',
                description: 'New design description',
                timeRequired: 60,
                totalMaterialCosts: 30.00,
                price: 50.00,
                imageId: 'image-id-123',
                materials: []
            });
            expect(mockCatalogueRepo.update).toHaveBeenCalledWith(catalogueId, {
                ...mockCatalogue,
                designs: [result]
            });
            expect(result.id).toBe('design-id-123');
        });

        it('should throw error for empty catalogue ID', async () => {
            await expect(service.addDesign('', mockDesignData, mockImageBuffer, mockContentType))
                .rejects.toMatchObject({
                    message: 'Catalogue ID is required',
                    status: 400
                });

            expect(mockCatalogueRepo.getById).not.toHaveBeenCalled();
        });

        it('should throw error when catalogue not found', async () => {
            mockCatalogueRepo.getById.mockResolvedValue(null);

            await expect(service.addDesign(catalogueId, mockDesignData, mockImageBuffer, mockContentType))
                .rejects.toMatchObject({
                    message: 'Catalogue not found',
                    status: 404
                });

            expect(mockImageService.uploadImage).not.toHaveBeenCalled();
        });

        it('should parse materials from string', async () => {
            const materials: RequiredMaterial[] = [
                { materialId: 'material-1', quantity: 2 },
                { materialId: 'material-2', quantity: 1 }
            ];

            const designDataWithStringMaterials = {
                ...mockDesignData,
                materials: JSON.stringify(materials)
            };

            mockCatalogueRepo.getById.mockResolvedValue(mockCatalogue);
            mockImageService.uploadImage.mockResolvedValue(undefined);
            mockDesignRepo.insert.mockResolvedValue(undefined);
            mockCatalogueRepo.update.mockResolvedValue(undefined);

            const result = await service.addDesign(catalogueId, designDataWithStringMaterials, mockImageBuffer, mockContentType);

            expect(result.materials).toEqual(materials);
        });

        it('should handle materials as array directly', async () => {
            const materials: RequiredMaterial[] = [
                { materialId: 'material-3', quantity: 3 }
            ];

            const designDataWithArrayMaterials = {
                ...mockDesignData,
                materials
            };

            mockCatalogueRepo.getById.mockResolvedValue(mockCatalogue);
            mockImageService.uploadImage.mockResolvedValue(undefined);
            mockDesignRepo.insert.mockResolvedValue(undefined);
            mockCatalogueRepo.update.mockResolvedValue(undefined);

            const result = await service.addDesign(catalogueId, designDataWithArrayMaterials, mockImageBuffer, mockContentType);

            expect(result.materials).toEqual(materials);
        });

        it('should throw error for invalid materials JSON', async () => {
            const designDataWithInvalidMaterials = {
                ...mockDesignData,
                materials: 'invalid json'
            };

            mockCatalogueRepo.getById.mockResolvedValue(mockCatalogue);

            await expect(service.addDesign(catalogueId, designDataWithInvalidMaterials, mockImageBuffer, mockContentType))
                .rejects.toMatchObject({
                    message: 'Invalid materials format',
                    status: 400
                });

            expect(mockImageService.uploadImage).toHaveBeenCalled();
        });

        it('should propagate image service errors', async () => {
            mockCatalogueRepo.getById.mockResolvedValue(mockCatalogue);
            mockImageService.uploadImage.mockRejectedValue(new Error('Upload failed'));

            await expect(service.addDesign(catalogueId, mockDesignData, mockImageBuffer, mockContentType))
                .rejects.toThrow('Upload failed');

            expect(mockDesignRepo.insert).not.toHaveBeenCalled();
        });
    });

    describe('updateDesign', () => {
        const designId = 'design-123';
        const existingDesign: Design = {
            id: designId,
            name: 'Existing Design',
            description: 'Existing description',
            timeRequired: 30,
            totalMaterialCosts: 15.00,
            price: 25.00,
            imageId: 'image-123',
            materials: []
        };

        it('should update design successfully', async () => {
            const updates = { name: 'Updated Design', price: 30.00 };
            const expectedUpdated = { ...existingDesign, ...updates };

            mockDesignRepo.getById.mockResolvedValue(existingDesign);
            mockDesignRepo.update.mockResolvedValue(undefined);

            const result = await service.updateDesign(designId, updates);

            expect(mockDesignRepo.getById).toHaveBeenCalledWith(designId);
            expect(mockDesignRepo.update).toHaveBeenCalledWith(designId, expectedUpdated);
            expect(result).toEqual(expectedUpdated);
        });

        it('should throw error for empty design ID', async () => {
            await expect(service.updateDesign('', { name: 'Updated' }))
                .rejects.toMatchObject({
                    message: 'Design ID is required',
                    status: 400
                });

            expect(mockDesignRepo.getById).not.toHaveBeenCalled();
        });

        it('should throw error when design not found', async () => {
            mockDesignRepo.getById.mockResolvedValue(null);

            await expect(service.updateDesign(designId, { name: 'Updated' }))
                .rejects.toMatchObject({
                    message: 'Design not found',
                    status: 404
                });

            expect(mockDesignRepo.update).not.toHaveBeenCalled();
        });

        it('should handle partial updates', async () => {
            const updates = { description: 'Updated description only' };
            const expectedUpdated = { ...existingDesign, ...updates };

            mockDesignRepo.getById.mockResolvedValue(existingDesign);
            mockDesignRepo.update.mockResolvedValue(undefined);

            const result = await service.updateDesign(designId, updates);

            expect(result).toEqual(expectedUpdated);
            expect(result.name).toBe(existingDesign.name); // unchanged
            expect(result.description).toBe(updates.description); // updated
        });
    });

    describe('deleteDesign', () => {
        const designId = 'design-123';
        const existingDesign: Design = {
            id: designId,
            name: 'Design to Delete',
            description: 'Will be deleted',
            timeRequired: 30,
            totalMaterialCosts: 15.00,
            price: 25.00,
            imageId: 'image-123',
            materials: []
        };

        it('should delete design successfully', async () => {
            mockDesignRepo.getById.mockResolvedValue(existingDesign);
            mockDesignRepo.delete.mockResolvedValue(undefined);

            await service.deleteDesign(designId);

            expect(mockDesignRepo.getById).toHaveBeenCalledWith(designId);
            expect(mockDesignRepo.delete).toHaveBeenCalledWith(designId);
        });

        it('should throw error for empty design ID', async () => {
            await expect(service.deleteDesign(''))
                .rejects.toMatchObject({
                    message: 'Design ID is required',
                    status: 400
                });

            expect(mockDesignRepo.getById).not.toHaveBeenCalled();
        });

        it('should throw error when design not found', async () => {
            mockDesignRepo.getById.mockResolvedValue(null);

            await expect(service.deleteDesign(designId))
                .rejects.toMatchObject({
                    message: 'Design not found',
                    status: 404
                });

            expect(mockDesignRepo.delete).not.toHaveBeenCalled();
        });

        it('should propagate repository delete errors', async () => {
            mockDesignRepo.getById.mockResolvedValue(existingDesign);
            mockDesignRepo.delete.mockRejectedValue(new Error('Delete failed'));

            await expect(service.deleteDesign(designId)).rejects.toThrow('Delete failed');

            expect(mockDesignRepo.delete).toHaveBeenCalledWith(designId);
        });
    });

    describe('error handling and edge cases', () => {
        it('should handle undefined values gracefully', async () => {
            await expect(service.getDesignsByCatalogue(undefined as any))
                .rejects.toMatchObject({ message: 'Catalogue ID is required', status: 400 });

            await expect(service.getDesign(undefined as any))
                .rejects.toMatchObject({ message: 'Design ID is required', status: 400 });

            await expect(service.updateDesign(undefined as any, {}))
                .rejects.toMatchObject({ message: 'Design ID is required', status: 400 });

            await expect(service.deleteDesign(undefined as any))
                .rejects.toMatchObject({ message: 'Design ID is required', status: 400 });
        });

        it('should handle repository connection failures', async () => {
            const connectionError = new Error('Database unavailable');

            mockDesignRepo.getByCatalogueId.mockRejectedValue(connectionError);
            await expect(service.getDesignsByCatalogue('catalogue-1')).rejects.toThrow('Database unavailable');

            mockDesignRepo.getById.mockRejectedValue(connectionError);
            await expect(service.getDesign('design-1')).rejects.toThrow('Database unavailable');

            mockDesignRepo.getById.mockRejectedValue(connectionError);
            await expect(service.updateDesign('design-1', {})).rejects.toThrow('Database unavailable');

            mockDesignRepo.getById.mockRejectedValue(connectionError);
            await expect(service.deleteDesign('design-1')).rejects.toThrow('Database unavailable');
        });
    });
});