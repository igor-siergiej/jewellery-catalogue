import type { MongoDbConnection } from '@imapps/api-utils';
import type { Sale, SaleStatus } from '@jewellery-catalogue/types';

import { CollectionNames, type Collections } from '../../dependencies/types';
import type { SaleRepository } from '../../domain/SaleRepository';

const DUPLICATE_KEY_ERROR = 11000;

export class MongoSaleRepository implements SaleRepository {
    constructor(private readonly db: MongoDbConnection<Collections>) {}

    private collection() {
        return this.db.getCollection(CollectionNames.Sales);
    }

    async ensureIndexes(): Promise<void> {
        await this.collection().createIndex({ transactionId: 1 }, { unique: true });
        await this.collection().createIndex({ userId: 1, status: 1 });
    }

    async insertIfNew(sale: Sale): Promise<boolean> {
        try {
            await this.collection().insertOne({ ...sale });
            return true;
        } catch (error) {
            if ((error as { code?: number }).code === DUPLICATE_KEY_ERROR) return false;
            throw error;
        }
    }

    async getPendingByUserId(userId: string): Promise<Sale[]> {
        return this.collection()
            .find({ userId, status: 'pending' }, { projection: { _id: 0 } })
            .toArray();
    }

    async getUnmatchedByUserId(userId: string): Promise<Sale[]> {
        return this.collection()
            .find({ userId, status: 'unmatched' }, { projection: { _id: 0 } })
            .sort({ soldAt: -1 })
            .toArray();
    }

    async setStatus(transactionId: number, status: SaleStatus): Promise<void> {
        await this.collection().updateOne({ transactionId }, { $set: { status } });
    }
}
