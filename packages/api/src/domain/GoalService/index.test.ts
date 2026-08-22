import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { EtsyConnection, FormGoal, Goal } from '@jewellery-catalogue/types';

import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionRepository } from '../EtsyConnectionRepository';
import type { GoalRepository } from '../GoalRepository';
import type { IdGenerator } from '../IdGenerator';
import { GoalService } from './index';

const mockGoalRepo: GoalRepository = {
    getById: mock(),
    getByIdAndUserId: mock(),
    getByUserId: mock(),
    getAll: mock(),
    insert: mock(),
    update: mock(),
    delete: mock(),
};

const mockIdGenerator: IdGenerator = { generate: mock() };

const mockEtsyClient = { getShop: mock() } as unknown as EtsyClient;

const mockEtsyConnectionRepo = {
    getByUserId: mock(),
} as unknown as EtsyConnectionRepository;

const connection: EtsyConnection = {
    userId: 'user-1',
    shopId: 47408839,
    shopName: "Jane's Studio",
    accessToken: 'tok',
    accessTokenExpiresAt: Date.now() + 100_000,
    refreshToken: 'refresh',
    connectedAt: Date.now(),
};

const formGoal: FormGoal = { title: 'Add 50 more listings', targetValue: 50, currentValue: 0, source: 'manual' };

describe('GoalService', () => {
    let service: GoalService;

    beforeEach(() => {
        mock.restore();
        // Reset each mock to clear any residual state
        (mockGoalRepo.getById as ReturnType<typeof mock>).mockClear?.();
        (mockGoalRepo.getByIdAndUserId as ReturnType<typeof mock>).mockClear?.();
        (mockGoalRepo.getByUserId as ReturnType<typeof mock>).mockClear?.();
        (mockGoalRepo.getAll as ReturnType<typeof mock>).mockClear?.();
        (mockGoalRepo.insert as ReturnType<typeof mock>).mockClear?.();
        (mockGoalRepo.update as ReturnType<typeof mock>).mockClear?.();
        (mockGoalRepo.delete as ReturnType<typeof mock>).mockClear?.();
        (mockIdGenerator.generate as ReturnType<typeof mock>).mockClear?.();
        (mockEtsyClient.getShop as ReturnType<typeof mock>).mockClear?.();
        (mockEtsyConnectionRepo.getByUserId as ReturnType<typeof mock>).mockClear?.();
        service = new GoalService(mockGoalRepo, mockIdGenerator, mockEtsyClient, mockEtsyConnectionRepo);
    });

    it('getGoalsByUserId throws 400 when userId is missing', async () => {
        await expect(service.getGoalsByUserId('')).rejects.toMatchObject({ status: 400 });
    });

    it('getGoalsByUserId returns the goals from the repository', async () => {
        const goals: Array<Goal> = [
            {
                id: 'goal-1',
                userId: 'user-1',
                title: 'Add 50 more listings',
                targetValue: 50,
                currentValue: 0,
                source: 'manual',
                createdAt: new Date('2026-08-01T00:00:00.000Z'),
                updatedAt: new Date('2026-08-01T00:00:00.000Z'),
            },
        ];
        (mockGoalRepo.getByUserId as ReturnType<typeof mock>).mockResolvedValue(goals);

        const result = await service.getGoalsByUserId('user-1');

        expect(result).toEqual(goals);
        expect(mockGoalRepo.getByUserId).toHaveBeenCalledWith('user-1');
    });

    it('addGoal throws 400 when userId is missing', async () => {
        await expect(service.addGoal(formGoal, '')).rejects.toMatchObject({ status: 400 });
    });

    it('addGoal throws 400 when targetValue is not positive', async () => {
        await expect(service.addGoal({ ...formGoal, targetValue: 0 }, 'user-1')).rejects.toMatchObject({
            status: 400,
        });
    });

    it('addGoal inserts a manual goal with generated id and given currentValue', async () => {
        (mockIdGenerator.generate as ReturnType<typeof mock>).mockReturnValue('goal-1');

        const result = await service.addGoal(formGoal, 'user-1');

        expect(result).toMatchObject({
            id: 'goal-1',
            userId: 'user-1',
            targetValue: 50,
            currentValue: 0,
            source: 'manual',
        });
        expect(mockGoalRepo.insert).toHaveBeenCalledWith(result);
        expect(mockEtsyClient.getShop).not.toHaveBeenCalled();
    });

    it('addGoal fetches currentValue from Etsy when source is etsy_active_listings', async () => {
        (mockIdGenerator.generate as ReturnType<typeof mock>).mockReturnValue('goal-2');
        (mockEtsyConnectionRepo.getByUserId as ReturnType<typeof mock>).mockResolvedValue(connection);
        (mockEtsyClient.getShop as ReturnType<typeof mock>).mockResolvedValue({
            shopId: 47408839,
            shopName: "Jane's Studio",
            listingActiveCount: 20,
            transactionSoldCount: 238,
        });

        const result = await service.addGoal(
            { title: 'Add 50 more listings', targetValue: 50, source: 'etsy_active_listings' } as FormGoal,
            'user-1'
        );

        expect(mockEtsyClient.getShop).toHaveBeenCalledWith(47408839);
        expect(result.currentValue).toBe(20);
    });

    it('addGoal throws 400 when Etsy-sourced and Etsy is not connected', async () => {
        (mockEtsyConnectionRepo.getByUserId as ReturnType<typeof mock>).mockResolvedValue(null);

        await expect(
            service.addGoal(
                { title: 'Reach 500 sales', targetValue: 500, source: 'etsy_sales_count' } as FormGoal,
                'user-1'
            )
        ).rejects.toMatchObject({ status: 400 });
    });

    it('updateGoal throws 404 when goal does not exist', async () => {
        (mockGoalRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(null);

        await expect(service.updateGoal('goal-1', { currentValue: 20 }, 'user-1')).rejects.toMatchObject({
            status: 404,
        });
    });

    it('updateGoal throws 400 when update data is invalid', async () => {
        await expect(service.updateGoal('goal-1', { targetValue: -5 } as never, 'user-1')).rejects.toMatchObject({
            status: 400,
        });
    });

    it('updateGoal strips userId, id, and createdAt from the update payload', async () => {
        const existing: Goal = {
            id: 'goal-1',
            userId: 'user-1',
            title: 'Add 50 more listings',
            targetValue: 50,
            currentValue: 0,
            source: 'manual',
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        (mockGoalRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);

        const result = await service.updateGoal(
            'goal-1',
            {
                currentValue: 20,
                userId: 'attacker-user-id',
                id: 'attacker-chosen-id',
                createdAt: new Date('2020-01-01T00:00:00.000Z'),
            } as never,
            'user-1'
        );

        expect(result.userId).toBe('user-1');
        expect(result.id).toBe('goal-1');
        expect(result.createdAt).toEqual(existing.createdAt);
        expect(result.currentValue).toBe(20);
    });

    it('updateGoal merges currentValue and bumps updatedAt', async () => {
        const existing: Goal = {
            id: 'goal-1',
            userId: 'user-1',
            title: 'Add 50 more listings',
            targetValue: 50,
            currentValue: 0,
            source: 'manual',
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        (mockGoalRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);

        const result = await service.updateGoal('goal-1', { currentValue: 20 }, 'user-1');

        expect(result.currentValue).toBe(20);
        expect(mockGoalRepo.update).toHaveBeenCalledWith('goal-1', result);
    });

    it('deleteGoal throws 404 when goal does not exist', async () => {
        (mockGoalRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(null);

        await expect(service.deleteGoal('goal-1', 'user-1')).rejects.toMatchObject({ status: 404 });
    });

    it('syncFromEtsy throws 400 for a manual goal', async () => {
        const existing: Goal = {
            id: 'goal-1',
            userId: 'user-1',
            title: 'Add 50 more listings',
            targetValue: 50,
            currentValue: 10,
            source: 'manual',
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        (mockGoalRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);

        await expect(service.syncFromEtsy('goal-1', 'user-1')).rejects.toMatchObject({ status: 400 });
    });

    it('syncFromEtsy re-fetches transaction_sold_count for an etsy_sales_count goal', async () => {
        const existing: Goal = {
            id: 'goal-1',
            userId: 'user-1',
            title: 'Reach 500 sales',
            targetValue: 500,
            currentValue: 200,
            source: 'etsy_sales_count',
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        };
        (mockGoalRepo.getByIdAndUserId as ReturnType<typeof mock>).mockResolvedValue(existing);
        (mockEtsyConnectionRepo.getByUserId as ReturnType<typeof mock>).mockResolvedValue(connection);
        (mockEtsyClient.getShop as ReturnType<typeof mock>).mockResolvedValue({
            shopId: 47408839,
            shopName: "Jane's Studio",
            listingActiveCount: 20,
            transactionSoldCount: 238,
        });

        const result = await service.syncFromEtsy('goal-1', 'user-1');

        expect(result.currentValue).toBe(238);
        expect(mockGoalRepo.update).toHaveBeenCalledWith('goal-1', result);
    });
});
