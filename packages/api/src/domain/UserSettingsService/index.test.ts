import { beforeEach, describe, expect, it, jest, mock } from 'bun:test';

import type { DesignRepository } from '../DesignRepository';
import type { UserSettingsRepository } from '../UserSettingsRepository';
import { UserSettingsService } from './index';

const mockSettingsRepo = {
    getByUserId: mock(),
    upsert: mock(),
};

const mockDesignRepo = {
    getById: mock(),
    getByIdAndUserId: mock(),
    getByUserId: mock(),
    findByMaterialId: mock(),
    insert: mock(),
    update: mock(),
    delete: mock(),
    getAll: mock(),
};

describe('UserSettingsService', () => {
    let service: UserSettingsService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new UserSettingsService(
            mockSettingsRepo as unknown as UserSettingsRepository,
            mockDesignRepo as unknown as DesignRepository
        );
    });

    describe('get', () => {
        it('returns default hourlyWage and profitMargin when no settings stored', async () => {
            mockSettingsRepo.getByUserId.mockResolvedValue(null);

            const result = await service.get('user-1');

            expect(result.hourlyWage).toBe(10);
            expect(result.profitMargin).toBe(15);
        });

        it('returns markupMultiplier 2.5 and hourlyRate 0 defaults when no settings stored', async () => {
            mockSettingsRepo.getByUserId.mockResolvedValue(null);

            const result = await service.get('user-1');

            expect(result.markupMultiplier).toBe(2.5);
            expect(result.hourlyRate).toBe(0);
        });

        it('returns stored markupMultiplier and hourlyRate when present', async () => {
            mockSettingsRepo.getByUserId.mockResolvedValue({
                userId: 'user-1',
                hourlyWage: 10,
                profitMargin: 15,
                markupMultiplier: 3,
                hourlyRate: 5,
            });

            const result = await service.get('user-1');

            expect(result.markupMultiplier).toBe(3);
            expect(result.hourlyRate).toBe(5);
        });
    });

    describe('get — etsy fields', () => {
        it('returns empty-string template and empty taxonomy map defaults when no settings stored', async () => {
            mockSettingsRepo.getByUserId.mockResolvedValue(null);

            const result = await service.get('user-1');

            expect(result.etsyDescriptionTemplate).toBe('');
            expect(result.etsyTaxonomyMap).toEqual({});
        });

        it('returns stored etsyDescriptionTemplate and etsyTaxonomyMap when present', async () => {
            mockSettingsRepo.getByUserId.mockResolvedValue({
                userId: 'user-1',
                hourlyWage: 10,
                profitMargin: 15,
                markupMultiplier: 2.5,
                hourlyRate: 0,
                etsyDescriptionTemplate: '{description}\n\nMaterials: {materials}',
                etsyTaxonomyMap: { RING: 1234 },
            });

            const result = await service.get('user-1');

            expect(result.etsyDescriptionTemplate).toBe('{description}\n\nMaterials: {materials}');
            expect(result.etsyTaxonomyMap).toEqual({ RING: 1234 });
        });

        it('backfills defaults for a stored document that predates this migration (missing the new fields entirely)', async () => {
            mockSettingsRepo.getByUserId.mockResolvedValue({
                userId: 'user-1',
                hourlyWage: 10,
                profitMargin: 15,
                // no markupMultiplier/hourlyRate/etsyDescriptionTemplate/etsyTaxonomyMap — simulates a
                // pre-sub-project-2 document that Mongo happily stored without the newer required fields
            } as any);

            const result = await service.get('user-1');

            expect(result.markupMultiplier).toBe(2.5);
            expect(result.hourlyRate).toBe(0);
            expect(result.etsyDescriptionTemplate).toBe('');
            expect(result.etsyTaxonomyMap).toEqual({});
            expect(result.hourlyWage).toBe(10);
            expect(result.profitMargin).toBe(15);
        });
    });

    describe('upsert — price suggestion fields', () => {
        it('persists markupMultiplier and hourlyRate alongside the existing fields', async () => {
            const result = await service.upsert('user-1', {
                hourlyWage: 12,
                profitMargin: 20,
                markupMultiplier: 2,
                hourlyRate: 8,
            });

            expect(result).toEqual({
                userId: 'user-1',
                hourlyWage: 12,
                profitMargin: 20,
                markupMultiplier: 2,
                hourlyRate: 8,
            });
            expect(mockSettingsRepo.upsert).toHaveBeenCalledWith(result);
        });
    });

    describe('upsert — etsy fields', () => {
        it('persists etsyDescriptionTemplate and etsyTaxonomyMap alongside the existing fields', async () => {
            const result = await service.upsert('user-1', {
                hourlyWage: 12,
                profitMargin: 20,
                markupMultiplier: 2,
                hourlyRate: 8,
                etsyDescriptionTemplate: 'Handmade: {description}',
                etsyTaxonomyMap: { EARRINGS: 5678 },
            });

            expect(result).toEqual({
                userId: 'user-1',
                hourlyWage: 12,
                profitMargin: 20,
                markupMultiplier: 2,
                hourlyRate: 8,
                etsyDescriptionTemplate: 'Handmade: {description}',
                etsyTaxonomyMap: { EARRINGS: 5678 },
            });
            expect(mockSettingsRepo.upsert).toHaveBeenCalledWith(result);
        });
    });
});
