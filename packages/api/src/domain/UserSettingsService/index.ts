import type { UserSettings } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { UserSettingsRepository } from '../UserSettingsRepository';

const DEFAULT_HOURLY_WAGE = 10;
const DEFAULT_PROFIT_MARGIN = 15;

function parseTimeToHours(timeRequired: string): number {
    const [hoursStr, minutesStr] = timeRequired.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
    return hours + minutes / 60;
}

function calcPrice(materialsCost: number, timeRequired: string, hourlyWage: number, profitMargin: number): number {
    const hours = parseTimeToHours(timeRequired);
    const labour = hours * hourlyWage;
    return parseFloat(((materialsCost + labour) * (1 + profitMargin / 100)).toFixed(2));
}

export class UserSettingsService {
    constructor(
        private readonly settingsRepo: UserSettingsRepository,
        private readonly designRepo: DesignRepository
    ) {}

    async get(userId: string): Promise<UserSettings> {
        const stored = await this.settingsRepo.getByUserId(userId);
        return stored ?? { userId, hourlyWage: DEFAULT_HOURLY_WAGE, profitMargin: DEFAULT_PROFIT_MARGIN };
    }

    async upsert(userId: string, updates: { hourlyWage: number; profitMargin: number }): Promise<UserSettings> {
        const settings: UserSettings = { userId, ...updates };
        await this.settingsRepo.upsert(settings);
        return settings;
    }

    async recalculatePricesForMaterial(
        materialId: string,
        userId: string
    ): Promise<{ updated: number; total: number }> {
        const settings = await this.get(userId);
        const designs = await this.designRepo.findByMaterialId(materialId);
        const userDesigns = designs.filter((d) => d.userId === userId);
        const total = userDesigns.length;
        let updated = 0;

        for (const design of userDesigns) {
            const price = calcPrice(
                design.totalMaterialCosts,
                design.timeRequired,
                settings.hourlyWage,
                settings.profitMargin
            );

            const variants = design.variants?.map((v) => ({
                ...v,
                price: calcPrice(v.totalMaterialCosts, design.timeRequired, settings.hourlyWage, settings.profitMargin),
            }));

            await this.designRepo.update(design.id, { ...design, price, variants });
            updated++;
        }

        return { updated, total };
    }

    async recalculatePrices(userId: string): Promise<{ updated: number; total: number }> {
        const settings = await this.get(userId);
        const designs = await this.designRepo.getByUserId(userId);
        const total = designs.length;
        let updated = 0;

        for (const design of designs) {
            const price = calcPrice(
                design.totalMaterialCosts,
                design.timeRequired,
                settings.hourlyWage,
                settings.profitMargin
            );

            const variants = design.variants?.map((v) => ({
                ...v,
                price: calcPrice(v.totalMaterialCosts, design.timeRequired, settings.hourlyWage, settings.profitMargin),
            }));

            await this.designRepo.update(design.id, { ...design, price, variants });
            updated++;
        }

        return { updated, total };
    }
}
