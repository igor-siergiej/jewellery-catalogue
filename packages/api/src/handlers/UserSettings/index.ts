import { APIError } from '@imapps/api-utils/hono';
import type { Context } from 'hono';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { UserSettingsService } from '../../domain/UserSettingsService';

type Ctx = Context<{ Variables: { userId: string } }>;

const getService = (): UserSettingsService => dependencyContainer.resolve(DependencyToken.UserSettingsService);

export const getUserSettings = async (c: Ctx) => c.json(await getService().get(c.get('userId')));

export const updateUserSettings = async (c: Ctx) => {
    const { hourlyWage, profitMargin, markupMultiplier, hourlyRate, etsyDescriptionTemplate, etsyTaxonomyMap } =
        (await c.req.json()) as {
            hourlyWage?: number;
            profitMargin?: number;
            markupMultiplier?: number;
            hourlyRate?: number;
            etsyDescriptionTemplate?: string;
            etsyTaxonomyMap?: Record<string, number>;
        };

    if (
        hourlyWage === undefined ||
        profitMargin === undefined ||
        markupMultiplier === undefined ||
        hourlyRate === undefined ||
        etsyDescriptionTemplate === undefined ||
        etsyTaxonomyMap === undefined
    ) {
        throw new APIError(
            'hourlyWage, profitMargin, markupMultiplier, hourlyRate, etsyDescriptionTemplate and etsyTaxonomyMap are required',
            400
        );
    }

    return c.json(
        await getService().upsert(c.get('userId'), {
            hourlyWage: Number(hourlyWage),
            profitMargin: Number(profitMargin),
            markupMultiplier: Number(markupMultiplier),
            hourlyRate: Number(hourlyRate),
            etsyDescriptionTemplate,
            etsyTaxonomyMap,
        })
    );
};

export const recalculatePrices = async (c: Ctx) => c.json(await getService().recalculatePrices(c.get('userId')));
