import { APIError } from '@imapps/api-utils/hono';
import type { Context } from 'hono';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { UserSettingsService } from '../../domain/UserSettingsService';

type Ctx = Context<{ Variables: { userId: string } }>;

const getService = (): UserSettingsService => dependencyContainer.resolve(DependencyToken.UserSettingsService);

export const getUserSettings = async (c: Ctx) => c.json(await getService().get(c.get('userId')));

export const updateUserSettings = async (c: Ctx) => {
    const { hourlyWage, profitMargin } = (await c.req.json()) as {
        hourlyWage?: number;
        profitMargin?: number;
    };

    if (hourlyWage === undefined || profitMargin === undefined) {
        throw new APIError('hourlyWage and profitMargin are required', 400);
    }

    return c.json(
        await getService().upsert(c.get('userId'), {
            hourlyWage: Number(hourlyWage),
            profitMargin: Number(profitMargin),
        })
    );
};

export const recalculatePrices = async (c: Ctx) => c.json(await getService().recalculatePrices(c.get('userId')));
