import { type FormGoal, formGoalSchema, type Goal, type GoalSource, type UpdateGoal } from '@jewellery-catalogue/types';

import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionRepository } from '../EtsyConnectionRepository';
import type { GoalRepository } from '../GoalRepository';
import type { IdGenerator } from '../IdGenerator';

export class GoalService {
    constructor(
        private readonly goalRepo: GoalRepository,
        private readonly idGenerator: IdGenerator,
        private readonly etsyClient: EtsyClient,
        private readonly etsyConnectionRepo: EtsyConnectionRepository
    ) {}

    async getGoalsByUserId(userId: string): Promise<Array<Goal>> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }
        return this.goalRepo.getByUserId(userId);
    }

    async addGoal(goalData: FormGoal, userId: string): Promise<Goal> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const result = formGoalSchema.safeParse(goalData);
        if (!result.success) {
            throw Object.assign(new Error('Invalid goal data'), { status: 400 });
        }

        const now = new Date();
        const currentValue =
            result.data.source === 'manual'
                ? (result.data.currentValue ?? 0)
                : await this.fetchEtsyValue(result.data.source, userId);

        const goal: Goal = {
            id: this.idGenerator.generate(),
            userId,
            title: result.data.title,
            targetValue: result.data.targetValue,
            currentValue,
            unit: result.data.unit,
            source: result.data.source,
            createdAt: now,
            updatedAt: now,
        };

        await this.goalRepo.insert(goal);

        return goal;
    }

    async updateGoal(id: string, updates: UpdateGoal, userId: string): Promise<Goal> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const existing = await this.goalRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Goal not found'), { status: 404 });
        }

        const updated: Goal = { ...existing, ...updates, updatedAt: new Date() };

        await this.goalRepo.update(id, updated);

        return updated;
    }

    async syncFromEtsy(id: string, userId: string): Promise<Goal> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const existing = await this.goalRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Goal not found'), { status: 404 });
        }

        if (existing.source === 'manual') {
            throw Object.assign(new Error('Goal is not linked to Etsy'), { status: 400 });
        }

        const currentValue = await this.fetchEtsyValue(existing.source, userId);
        const updated: Goal = { ...existing, currentValue, updatedAt: new Date() };

        await this.goalRepo.update(id, updated);

        return updated;
    }

    async deleteGoal(id: string, userId: string): Promise<void> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const existing = await this.goalRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Goal not found'), { status: 404 });
        }

        await this.goalRepo.delete(id);
    }

    private async fetchEtsyValue(source: GoalSource, userId: string): Promise<number> {
        const connection = await this.etsyConnectionRepo.getByUserId(userId);

        if (!connection) {
            throw Object.assign(new Error('Etsy is not connected'), { status: 400 });
        }

        const shop = await this.etsyClient.getShop(connection.shopId);

        return source === 'etsy_active_listings' ? shop.listingActiveCount : shop.transactionSoldCount;
    }
}
