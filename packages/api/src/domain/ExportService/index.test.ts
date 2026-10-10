import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { MaterialType } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { DraftRepository } from '../DraftRepository';
import type { GoalRepository } from '../GoalRepository';
import type { MaterialRepository } from '../MaterialRepository';
import type { SaleRepository } from '../SaleRepository';
import type { TaskRepository } from '../TaskRepository';
import type { UserSettingsService } from '../UserSettingsService';
import { ExportService } from './index';

const repo = () => ({ getByUserId: mock(async () => [] as unknown[]) });
const designRepo = repo();
const materialRepo = repo();
const draftRepo = repo();
const goalRepo = repo();
const taskRepo = repo();
const saleRepo = { getByUserIdSoldBetween: mock(async () => [] as unknown[]) };
const settings = { get: mock(async () => ({ userId: 'user-1', hourlyRate: 10 })) };

const lines = (csv: string) => csv.replace(/^﻿/, '').trimEnd().split('\r\n');

describe('ExportService', () => {
    let service: ExportService;

    beforeEach(() => {
        for (const r of [designRepo, materialRepo, draftRepo, goalRepo, taskRepo]) {
            r.getByUserId.mockReset().mockResolvedValue([]);
        }
        saleRepo.getByUserIdSoldBetween.mockReset().mockResolvedValue([]);
        service = new ExportService(
            designRepo as unknown as DesignRepository,
            materialRepo as unknown as MaterialRepository,
            draftRepo as unknown as DraftRepository,
            goalRepo as unknown as GoalRepository,
            taskRepo as unknown as TaskRepository,
            saleRepo as unknown as SaleRepository,
            settings as unknown as UserSettingsService
        );
    });

    it('exports materials with stock in their own unit and a per-unit cost', async () => {
        materialRepo.getByUserId.mockResolvedValue([
            {
                name: 'Silver wire',
                brand: 'Acme',
                type: MaterialType.WIRE,
                totalLength: 2.5,
                lengthPerPack: 5,
                pricePerPack: 8,
                purchaseUrl: 'https://shop/wire',
            },
            {
                name: 'Opal, 4mm',
                brand: 'Acme',
                type: MaterialType.BEAD,
                materialCode: 'OP4',
                totalQuantity: 40,
                quantityPerPack: 100,
                pricePerPack: 3,
                lowStockThreshold: 10,
                purchaseUrl: '',
            },
        ]);

        const csv = await service.materialsCsv('user-1');

        expect(materialRepo.getByUserId).toHaveBeenCalledWith('user-1');
        expect(lines(csv)).toEqual([
            'Name,Brand,Type,Code,Stock,Unit,Pack size,Price per pack,Unit cost,Low stock threshold,Purchase URL',
            'Silver wire,Acme,WIRE,,2.5,m,5,8,1.6,,https://shop/wire',
            '"Opal, 4mm",Acme,BEAD,OP4,40,pcs,100,3,0.03,10,',
        ]);
    });

    it('exports one row per design, or per variant, with the Etsy link', async () => {
        designRepo.getByUserId.mockResolvedValue([
            {
                name: 'Ring',
                price: 30,
                totalMaterialCosts: 8,
                totalQuantity: 2,
                designType: 'RING',
                etsy: { listingId: 111, state: 'active' },
            },
            {
                name: 'Pendant',
                price: 0,
                totalMaterialCosts: 0,
                totalQuantity: 3,
                lowStockThreshold: 1,
                catalogueOnly: true,
                variants: [
                    { name: 'Gold', price: 40, totalMaterialCosts: 12, totalQuantity: 1 },
                    { name: 'Silver', price: 35, totalMaterialCosts: 9, totalQuantity: 2, lowStockThreshold: 5 },
                ],
            },
        ]);

        expect(lines(await service.designsCsv('user-1'))).toEqual([
            'Design,Variant,Price,Material cost,Stock,Low stock threshold,Type,Etsy listing ID,Etsy URL,Etsy state,Catalogue only',
            'Ring,,30,8,2,,RING,111,https://www.etsy.com/listing/111,active,false',
            'Pendant,Gold,40,12,1,1,,,,,true',
            'Pendant,Silver,35,9,2,5,,,,,true',
        ]);
    });

    it("backs up all of the user's data, scoped to them, without Etsy credentials", async () => {
        designRepo.getByUserId.mockResolvedValue([{ id: 'd1' }]);
        saleRepo.getByUserIdSoldBetween.mockResolvedValue([{ transactionId: 1 }]);

        const backup = await service.backup('user-1');

        for (const r of [designRepo, materialRepo, draftRepo, goalRepo, taskRepo]) {
            expect(r.getByUserId).toHaveBeenCalledWith('user-1');
        }
        expect(saleRepo.getByUserIdSoldBetween).toHaveBeenCalledWith('user-1', null, null);
        expect(Object.keys(backup).sort()).toEqual(
            ['designs', 'drafts', 'exportedAt', 'goals', 'materials', 'sales', 'settings', 'tasks', 'version'].sort()
        );
        expect(backup.designs).toEqual([{ id: 'd1' }]);
        expect(JSON.stringify(backup)).not.toMatch(/accessToken|refreshToken/);
    });
});
