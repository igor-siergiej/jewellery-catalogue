import type { MongoDbConnection } from '@imapps/api-utils';
import type { EtsyConnection } from '@jewellery-catalogue/types';

import { CollectionNames, type Collections } from '../../dependencies/types';
import type { EtsyConnectionRepository } from '../../domain/EtsyConnectionRepository';
import { MongoRepository } from '../MongoRepository';

export class MongoEtsyConnectionRepository extends MongoRepository<EtsyConnection> implements EtsyConnectionRepository {
    constructor(db: MongoDbConnection<Collections>) {
        super(db, CollectionNames.EtsyConnections);
    }

    async getByUserId(userId: string): Promise<EtsyConnection | null> {
        return this.collection().findOne({ userId }, { projection: { _id: 0 } });
    }

    async upsert(connection: EtsyConnection): Promise<void> {
        await this.collection().findOneAndReplace({ userId: connection.userId }, connection, {
            upsert: true,
        });
    }

    async deleteByUserId(userId: string): Promise<void> {
        await this.collection().deleteOne({ userId });
    }
}
