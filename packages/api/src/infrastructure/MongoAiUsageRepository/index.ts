import type { MongoDbConnection } from '@imapps/api-utils';
import type { AiUsageRecord } from '@jewellery-catalogue/types';

import { CollectionNames, type Collections } from '../../dependencies/types';
import type { AiUsageRepository } from '../../domain/AiUsageRepository';

const RETENTION_SECONDS = 90 * 24 * 60 * 60;

export const ensureAiUsageIndexes = async (db: MongoDbConnection<Collections>): Promise<void> => {
    const usage = db.getCollection(CollectionNames.AiUsage);
    await usage.createIndex({ userId: 1, at: -1 });
    await usage.createIndex({ at: 1 }, { expireAfterSeconds: RETENTION_SECONDS });
};

export class MongoAiUsageRepository implements AiUsageRepository {
    constructor(private readonly db: MongoDbConnection<Collections>) {}

    private collection() {
        return this.db.getCollection(CollectionNames.AiUsage);
    }

    // fallow-ignore-next-line unused-class-member
    async record(entry: AiUsageRecord): Promise<void> {
        await this.collection().insertOne({ ...entry });
    }

    // fallow-ignore-next-line unused-class-member
    async countSince(userId: string, since: Date): Promise<number> {
        return this.collection().countDocuments({ userId, at: { $gte: since } });
    }
}
