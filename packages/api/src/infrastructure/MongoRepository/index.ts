import type { MongoDbConnection } from '@imapps/api-utils';

import type { Collections } from '../../dependencies/types';
import type { BaseRepository } from '../../domain/BaseRepository';

export class MongoRepository<T extends { id?: string; _id?: any }, TId = string> implements BaseRepository<T, TId> {
    constructor(
        protected readonly db: MongoDbConnection<Collections>,
        protected readonly collectionName: keyof Collections
    ) {}

    protected collection() {
        return this.db.getCollection(this.collectionName);
    }

    protected getMongoFilter(id: TId): any {
        return { id: id as string };
    }

    async getById(id: TId): Promise<T | null> {
        return this.collection().findOne(this.getMongoFilter(id), { projection: { _id: 0 } });
    }

    async getAll(): Promise<Array<T>> {
        return this.collection()
            .find({}, { projection: { _id: 0 } })
            .toArray();
    }

    async insert(entity: T): Promise<void> {
        await this.collection().insertOne(entity);
    }

    async update(id: TId, entity: T): Promise<void> {
        await this.collection().findOneAndReplace(this.getMongoFilter(id), entity);
    }

    async delete(id: TId): Promise<void> {
        await this.collection().deleteOne(this.getMongoFilter(id));
    }
}
