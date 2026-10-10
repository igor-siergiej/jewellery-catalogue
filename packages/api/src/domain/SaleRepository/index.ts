import type { Sale, SaleStatus } from '@jewellery-catalogue/types';

export interface SaleRepository {
    ensureIndexes(): Promise<void>;
    // Returns false when a sale with the same transactionId already exists.
    insertIfNew(sale: Sale): Promise<boolean>;
    getPendingByUserId(userId: string): Promise<Sale[]>;
    getUnmatchedByUserId(userId: string): Promise<Sale[]>;
    setStatus(transactionId: number, status: SaleStatus): Promise<void>;
}
