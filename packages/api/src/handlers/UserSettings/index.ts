import type { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { UserSettingsService } from '../../domain/UserSettingsService';

const getService = (): UserSettingsService => dependencyContainer.resolve(DependencyToken.UserSettingsService);

export const getUserSettings = async (ctx: Context) => {
    const userId = ctx.state.userId;

    try {
        ctx.body = await getService().get(userId);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;
        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const updateUserSettings = async (ctx: Context) => {
    const userId = ctx.state.userId;
    const { hourlyWage, profitMargin } = ctx.request.body as { hourlyWage?: number; profitMargin?: number };

    if (hourlyWage === undefined || profitMargin === undefined) {
        ctx.status = 400;
        ctx.body = { error: 'hourlyWage and profitMargin are required' };
        return;
    }

    try {
        ctx.body = await getService().upsert(userId, {
            hourlyWage: Number(hourlyWage),
            profitMargin: Number(profitMargin),
        });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;
        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};

export const recalculatePrices = async (ctx: Context) => {
    const userId = ctx.state.userId;

    try {
        ctx.body = await getService().recalculatePrices(userId);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string } | null;
        ctx.status = err?.status ?? 500;
        ctx.body = { error: err?.message ?? 'Internal Server Error' };
    }
};
