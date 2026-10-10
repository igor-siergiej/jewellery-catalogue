import type { Design, Material, MaterialType } from '@jewellery-catalogue/types';
import { toCsv } from '../../utils/csv';
import { packSizeOf, stockOnHand, stockUnitOf } from '../../utils/material-conversion';
import type { DesignRepository } from '../DesignRepository';
import type { DraftRepository } from '../DraftRepository';
import type { GoalRepository } from '../GoalRepository';
import type { MaterialRepository } from '../MaterialRepository';
import type { SaleRepository } from '../SaleRepository';
import type { TaskRepository } from '../TaskRepository';
import type { UserSettingsService } from '../UserSettingsService';

const BACKUP_VERSION = 1;

const unitCost = (m: Material): number | null => {
    const packSize = packSizeOf(m);
    return packSize > 0 ? Math.round((m.pricePerPack / packSize) * 10000) / 10000 : null;
};

const etsyUrl = (design: Design) => (design.etsy ? `https://www.etsy.com/listing/${design.etsy.listingId}` : '');

// Every export reads through userId-scoped repositories, so a user only ever gets their own data.
export class ExportService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly materialRepo: MaterialRepository,
        private readonly draftRepo: DraftRepository,
        private readonly goalRepo: GoalRepository,
        private readonly taskRepo: TaskRepository,
        private readonly saleRepo: SaleRepository,
        private readonly userSettingsService: UserSettingsService
    ) {}

    // fallow-ignore-next-line unused-class-member
    async materialsCsv(userId: string): Promise<string> {
        const materials = await this.materialRepo.getByUserId(userId);
        return toCsv(
            [
                'Name',
                'Brand',
                'Type',
                'Code',
                'Stock',
                'Unit',
                'Pack size',
                'Price per pack',
                'Unit cost',
                'Low stock threshold',
                'Purchase URL',
            ],
            materials.map((m) => [
                m.name,
                m.brand,
                m.type,
                m.materialCode,
                stockOnHand(m),
                stockUnitOf(m.type as MaterialType),
                packSizeOf(m),
                m.pricePerPack,
                unitCost(m),
                m.lowStockThreshold,
                m.purchaseUrl,
            ])
        );
    }

    // One row per design, or per variant for designs with variants.
    // fallow-ignore-next-line unused-class-member
    async designsCsv(userId: string): Promise<string> {
        const designs = await this.designRepo.getByUserId(userId);
        const rows = designs.flatMap((d) => {
            const shared = [d.designType, d.etsy?.listingId, etsyUrl(d), d.etsy?.state, d.catalogueOnly ?? false];
            if (!d.variants || d.variants.length === 0) {
                return [[d.name, '', d.price, d.totalMaterialCosts, d.totalQuantity, d.lowStockThreshold, ...shared]];
            }
            return d.variants.map((v) => [
                d.name,
                v.name,
                v.price,
                v.totalMaterialCosts,
                v.totalQuantity,
                v.lowStockThreshold ?? d.lowStockThreshold,
                ...shared,
            ]);
        });

        return toCsv(
            [
                'Design',
                'Variant',
                'Price',
                'Material cost',
                'Stock',
                'Low stock threshold',
                'Type',
                'Etsy listing ID',
                'Etsy URL',
                'Etsy state',
                'Catalogue only',
            ],
            rows
        );
    }

    // Etsy OAuth tokens are deliberately left out: a backup file should never carry credentials.
    // fallow-ignore-next-line unused-class-member
    async backup(userId: string) {
        const [designs, materials, drafts, goals, tasks, sales, settings] = await Promise.all([
            this.designRepo.getByUserId(userId),
            this.materialRepo.getByUserId(userId),
            this.draftRepo.getByUserId(userId),
            this.goalRepo.getByUserId(userId),
            this.taskRepo.getByUserId(userId),
            this.saleRepo.getByUserIdSoldBetween(userId, null, null),
            this.userSettingsService.get(userId),
        ]);

        return {
            version: BACKUP_VERSION,
            exportedAt: new Date().toISOString(),
            settings,
            designs,
            materials,
            drafts,
            goals,
            tasks,
            sales,
        };
    }
}
