import type { SalesReport } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { SaleRepository } from '../SaleRepository';
import type { UserSettingsService } from '../UserSettingsService';
import { calculateSalesReport } from './calculateSalesReport';

export class SalesReportService {
    constructor(
        private readonly saleRepo: SaleRepository,
        private readonly designRepo: DesignRepository,
        private readonly userSettingsService: UserSettingsService
    ) {}

    // fallow-ignore-next-line unused-class-member
    async getReport(userId: string, range: { from: number | null; to: number | null }): Promise<SalesReport> {
        const [sales, hasAnySales, designs, settings] = await Promise.all([
            this.saleRepo.getByUserIdSoldBetween(userId, range.from, range.to),
            this.saleRepo.hasAnyForUser(userId),
            this.designRepo.getByUserId(userId),
            this.userSettingsService.get(userId),
        ]);

        return {
            hasAnySales,
            from: range.from,
            to: range.to,
            ...calculateSalesReport({ sales, designs, hourlyRate: settings.hourlyRate }),
        };
    }
}
