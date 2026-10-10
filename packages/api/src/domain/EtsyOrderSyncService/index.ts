import type { Logger } from '@imapps/api-utils';
import type { Design, EtsyConnection, Sale } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import { type EtsyClient, EtsyForbiddenError } from '../EtsyClient';
import type { EtsyConnectionRepository } from '../EtsyConnectionRepository';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import type { SaleRepository } from '../SaleRepository';
import { buildSale, isCountableReceipt } from './mappers';

// Re-read receipts modified shortly before the watermark; duplicates are dropped by transactionId.
const WATERMARK_OVERLAP_SECONDS = 60 * 60;

export interface OrderSyncResult {
    imported: number;
    applied: number;
    unmatched: number;
}

export class EtsyOrderSyncService {
    constructor(
        private readonly connectionRepo: EtsyConnectionRepository,
        private readonly connectionService: EtsyConnectionService,
        private readonly etsyClient: EtsyClient,
        private readonly designRepo: DesignRepository,
        private readonly saleRepo: SaleRepository,
        private readonly logger: Logger,
        private readonly now: () => number = Date.now
    ) {}

    async syncAll(): Promise<void> {
        const connections = await this.connectionRepo.getAll();

        for (const connection of connections) {
            if (connection.broken) continue;
            try {
                const result = await this.syncConnection(connection);
                this.logger.info('Synced Etsy orders', { userId: connection.userId, ...result });
            } catch (error) {
                this.logger.error('Failed to sync Etsy orders', {
                    userId: connection.userId,
                    error: error instanceof Error ? error.message : error,
                });
            }
        }
    }

    async syncConnection(connection: EtsyConnection): Promise<OrderSyncResult> {
        const startedAt = Math.floor(this.now() / 1000);

        // Stock was maintained by hand before syncing existed, so only sales from now on count.
        if (connection.ordersSyncedThrough === undefined) {
            await this.connectionRepo.setOrdersSyncedThrough(connection.userId, startedAt);
            return { imported: 0, applied: 0, unmatched: 0 };
        }

        const accessToken = await this.connectionService.getValidAccessToken(connection.userId);

        let receipts: Awaited<ReturnType<EtsyClient['getShopReceipts']>>;
        try {
            receipts = await this.etsyClient.getShopReceipts(
                accessToken,
                connection.shopId,
                connection.ordersSyncedThrough - WATERMARK_OVERLAP_SECONDS
            );
        } catch (error) {
            if (error instanceof EtsyForbiddenError) {
                // Surfaces the existing "reconnect" prompt in Settings so the user re-grants scopes. A targeted
                // update, because `connection` may hold tokens that getValidAccessToken has just refreshed.
                await this.connectionRepo.markBroken(connection.userId);
            }
            throw error;
        }

        const designs = await this.designRepo.getByUserId(connection.userId);
        const designsByListingId = new Map(
            designs
                .filter((d): d is Design & { etsy: NonNullable<Design['etsy']> } => !!d.etsy?.listingId)
                .map((d) => [d.etsy.listingId, d])
        );

        let imported = 0;
        for (const receipt of receipts.filter(isCountableReceipt)) {
            for (const transaction of receipt.transactions) {
                const sale = buildSale({ userId: connection.userId, receipt, transaction, designsByListingId });
                if (await this.saleRepo.insertIfNew(sale)) imported++;
            }
        }

        const { applied, unmatched } = await this.applyPendingSales(connection.userId);
        await this.connectionRepo.setOrdersSyncedThrough(connection.userId, startedAt);

        return { imported, applied, unmatched };
    }

    // Also retries sales left pending by an earlier run that stopped part-way.
    private async applyPendingSales(userId: string): Promise<{ applied: number; unmatched: number }> {
        let applied = 0;
        let unmatched = 0;

        for (const sale of await this.saleRepo.getPendingByUserId(userId)) {
            if (!sale.designId) continue;
            const result = await this.designRepo.applyEtsySale({
                designId: sale.designId,
                userId,
                variantId: sale.variantId,
                transactionId: sale.transactionId,
                quantity: sale.quantity,
            });

            if (result === 'design_not_found') {
                await this.saleRepo.setStatus(sale.transactionId, 'unmatched');
                unmatched++;
            } else {
                await this.saleRepo.setStatus(sale.transactionId, 'applied');
                applied++;
            }
        }

        return { applied, unmatched };
    }

    // fallow-ignore-next-line unused-class-member
    async listUnmatchedSales(userId: string): Promise<Sale[]> {
        return this.saleRepo.getUnmatchedByUserId(userId);
    }
}
