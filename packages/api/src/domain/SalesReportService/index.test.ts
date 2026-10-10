import { beforeEach, describe, expect, it, mock } from 'bun:test';

import type { DesignRepository } from '../DesignRepository';
import type { SaleRepository } from '../SaleRepository';
import type { UserSettingsService } from '../UserSettingsService';
import { SalesReportService } from './index';

const mockSaleRepo = { getByUserIdSoldBetween: mock(), hasAnyForUser: mock() };
const mockDesignRepo = { getByUserId: mock() };
const mockUserSettingsService = { get: mock() };

describe('SalesReportService', () => {
    let service: SalesReportService;

    beforeEach(() => {
        for (const m of [
            ...Object.values(mockSaleRepo),
            ...Object.values(mockDesignRepo),
            ...Object.values(mockUserSettingsService),
        ]) {
            m.mockReset();
        }
        service = new SalesReportService(
            mockSaleRepo as unknown as SaleRepository,
            mockDesignRepo as unknown as DesignRepository,
            mockUserSettingsService as unknown as UserSettingsService
        );
        mockSaleRepo.getByUserIdSoldBetween.mockResolvedValue([]);
        mockSaleRepo.hasAnyForUser.mockResolvedValue(true);
        mockDesignRepo.getByUserId.mockResolvedValue([]);
        mockUserSettingsService.get.mockResolvedValue({ hourlyRate: 12 });
    });

    it("queries the user's sales for the range and echoes the range back", async () => {
        const report = await service.getReport('user-1', { from: 100, to: 200 });

        expect(mockSaleRepo.getByUserIdSoldBetween).toHaveBeenCalledWith('user-1', 100, 200);
        expect(report).toMatchObject({ hasAnySales: true, from: 100, to: 200, designs: [] });
    });

    it('reports hasAnySales false for a user with no recorded sales', async () => {
        mockSaleRepo.hasAnyForUser.mockResolvedValue(false);

        const report = await service.getReport('user-1', { from: null, to: null });

        expect(report.hasAnySales).toBe(false);
    });
});
