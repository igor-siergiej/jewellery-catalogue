import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { Logger } from '@imapps/api-utils';
import type { Design, EtsyConnection, Sale } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import { type EtsyClient, EtsyForbiddenError, type EtsyReceipt } from '../EtsyClient';
import type { EtsyConnectionRepository } from '../EtsyConnectionRepository';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import type { SaleRepository } from '../SaleRepository';
import { EtsyOrderSyncService } from './index';

const NOW_MS = 1_800_000_000_000;
const NOW_S = NOW_MS / 1000;

const mockConnectionRepo = { getAll: mock(), setOrdersSyncedThrough: mock(), markBroken: mock() };
const mockConnectionService = { getValidAccessToken: mock() };
const mockEtsyClient = { getShopReceipts: mock() };
const mockDesignRepo = { getByUserId: mock(), applyEtsySale: mock() };
const mockSaleRepo = {
    insertIfNew: mock(),
    getPendingByUserId: mock(),
    setStatus: mock(),
    getUnmatchedByUserId: mock(),
};
const mockLogger = { info: mock(), error: mock(), warn: mock() };

const makeConnection = (overrides: Partial<EtsyConnection> = {}): EtsyConnection => ({
    userId: 'user-1',
    shopId: 99,
    shopName: 'Shop',
    accessToken: 'at',
    accessTokenExpiresAt: NOW_MS + 3_600_000,
    refreshToken: 'rt',
    connectedAt: 0,
    ordersSyncedThrough: NOW_S - 900,
    ...overrides,
});

const linkedDesign = { id: 'design-1', userId: 'user-1', etsy: { listingId: 31 } } as unknown as Design;

const receipt: EtsyReceipt = {
    receiptId: 11,
    status: 'Paid',
    isPaid: true,
    createdAt: NOW_MS - 60_000,
    updatedAt: NOW_S - 60,
    transactions: [
        { transactionId: 21, listingId: 31, title: 'Ring', quantity: 2, price: 25, variations: [] },
        { transactionId: 22, listingId: 77, title: 'Unlinked', quantity: 1, price: 10, variations: [] },
    ],
};

const pendingSale = (overrides: Partial<Sale> = {}): Sale => ({
    userId: 'user-1',
    designId: 'design-1',
    variantId: null,
    listingId: 31,
    receiptId: 11,
    transactionId: 21,
    title: 'Ring',
    quantity: 2,
    price: 25,
    soldAt: NOW_MS,
    status: 'pending',
    ...overrides,
});

describe('EtsyOrderSyncService', () => {
    let service: EtsyOrderSyncService;

    beforeEach(() => {
        for (const m of [
            ...Object.values(mockConnectionRepo),
            ...Object.values(mockConnectionService),
            ...Object.values(mockEtsyClient),
            ...Object.values(mockDesignRepo),
            ...Object.values(mockSaleRepo),
            ...Object.values(mockLogger),
        ]) {
            m.mockReset();
        }

        service = new EtsyOrderSyncService(
            mockConnectionRepo as unknown as EtsyConnectionRepository,
            mockConnectionService as unknown as EtsyConnectionService,
            mockEtsyClient as unknown as EtsyClient,
            mockDesignRepo as unknown as DesignRepository,
            mockSaleRepo as unknown as SaleRepository,
            mockLogger as unknown as Logger,
            () => NOW_MS
        );

        mockConnectionService.getValidAccessToken.mockResolvedValue('at-token');
        mockEtsyClient.getShopReceipts.mockResolvedValue([receipt]);
        mockDesignRepo.getByUserId.mockResolvedValue([linkedDesign]);
        mockSaleRepo.insertIfNew.mockResolvedValue(true);
        mockSaleRepo.getPendingByUserId.mockResolvedValue([pendingSale()]);
        mockDesignRepo.applyEtsySale.mockResolvedValue('applied');
    });

    describe('syncConnection', () => {
        it('only sets the watermark on the first sync, so historic sales never touch stock', async () => {
            const result = await service.syncConnection(makeConnection({ ordersSyncedThrough: undefined }));

            expect(result).toEqual({ imported: 0, applied: 0, unmatched: 0 });
            expect(mockConnectionRepo.setOrdersSyncedThrough).toHaveBeenCalledWith('user-1', NOW_S);
            expect(mockEtsyClient.getShopReceipts).not.toHaveBeenCalled();
            expect(mockDesignRepo.applyEtsySale).not.toHaveBeenCalled();
        });

        it('fetches receipts from an hour before the watermark', async () => {
            await service.syncConnection(makeConnection());

            expect(mockEtsyClient.getShopReceipts).toHaveBeenCalledWith('at-token', 99, NOW_S - 900 - 3600);
        });

        it('stores matched and unmatched sales, applies pending ones and advances the watermark', async () => {
            const result = await service.syncConnection(makeConnection());

            const inserted = mockSaleRepo.insertIfNew.mock.calls.map(([sale]) => sale as Sale);
            expect(inserted.map((s) => [s.transactionId, s.status])).toEqual([
                [21, 'pending'],
                [22, 'unmatched'],
            ]);
            expect(mockDesignRepo.applyEtsySale).toHaveBeenCalledWith({
                designId: 'design-1',
                userId: 'user-1',
                variantId: null,
                transactionId: 21,
                quantity: 2,
            });
            expect(mockSaleRepo.setStatus).toHaveBeenCalledWith(21, 'applied');
            expect(mockConnectionRepo.setOrdersSyncedThrough).toHaveBeenCalledWith('user-1', NOW_S);
            expect(result).toEqual({ imported: 2, applied: 1, unmatched: 0 });
        });

        it('does not re-apply a sale already seen on an earlier poll', async () => {
            mockSaleRepo.insertIfNew.mockResolvedValue(false);
            mockSaleRepo.getPendingByUserId.mockResolvedValue([]);

            const result = await service.syncConnection(makeConnection());

            expect(result).toEqual({ imported: 0, applied: 0, unmatched: 0 });
            expect(mockDesignRepo.applyEtsySale).not.toHaveBeenCalled();
        });

        it('marks a pending sale applied when the design already recorded it (retry after a crash)', async () => {
            mockDesignRepo.applyEtsySale.mockResolvedValue('already_applied');

            await service.syncConnection(makeConnection());

            expect(mockSaleRepo.setStatus).toHaveBeenCalledWith(21, 'applied');
        });

        it('marks a pending sale unmatched when its design has been deleted', async () => {
            mockDesignRepo.applyEtsySale.mockResolvedValue('design_not_found');

            const result = await service.syncConnection(makeConnection());

            expect(mockSaleRepo.setStatus).toHaveBeenCalledWith(21, 'unmatched');
            expect(result.unmatched).toBe(1);
        });

        it('skips receipts that are unpaid or canceled', async () => {
            mockEtsyClient.getShopReceipts.mockResolvedValue([
                { ...receipt, isPaid: false, status: 'Open' },
                { ...receipt, status: 'Canceled' },
            ]);

            await service.syncConnection(makeConnection());

            expect(mockSaleRepo.insertIfNew).not.toHaveBeenCalled();
        });

        it('flags the connection broken and keeps the watermark when Etsy refuses the scope', async () => {
            const connection = makeConnection();
            mockEtsyClient.getShopReceipts.mockRejectedValue(new EtsyForbiddenError('forbidden'));

            await expect(service.syncConnection(connection)).rejects.toBeInstanceOf(EtsyForbiddenError);

            expect(mockConnectionRepo.markBroken).toHaveBeenCalledWith('user-1');
            expect(mockConnectionRepo.setOrdersSyncedThrough).not.toHaveBeenCalled();
        });
    });

    describe('syncAll', () => {
        it('skips broken connections and keeps going when one shop fails', async () => {
            mockConnectionRepo.getAll.mockResolvedValue([
                makeConnection({ userId: 'broken', broken: true }),
                makeConnection({ userId: 'failing' }),
                makeConnection({ userId: 'ok' }),
            ]);
            mockConnectionService.getValidAccessToken.mockImplementation(async (userId: string) => {
                if (userId === 'failing') throw new Error('boom');
                return 'at-token';
            });

            await service.syncAll();

            expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledTimes(2);
            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            expect(mockConnectionRepo.setOrdersSyncedThrough).toHaveBeenCalledWith('ok', NOW_S);
        });
    });
});
