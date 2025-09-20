import { MongoDbConnection } from '@igor-siergiej/api-utils';
import { ObjectId } from 'mongodb';

import { Collections } from '../../dependencies/types';
import { BaseRepository } from '../../domain/BaseRepository';

export class MongoRepository<T extends { id?: string; _id?: any }, TId = string> implements BaseRepository<T, TId> {
    constructor(
        protected readonly db: MongoDbConnection<Collections>,
        protected readonly collectionName: keyof Collections
    ) {}

    protected collection() {
        return this.db.getCollection(this.collectionName);
    }

    protected getMongoFilter(id: TId): any {
        // For entities with ObjectId _id (like Catalogue)
        if (this.usesObjectId()) {
            return { _id: new ObjectId(id as string) };
        }
        // For entities with string id (like Design, Material)
        return { id: id as string };
    }

    protected usesObjectId(): boolean {
        // Override this in subclasses if needed
        return this.collectionName === 'catalogues';
    }

    async getById(id: TId): Promise<T | null> {
        return this.collection().findOne(this.getMongoFilter(id));
    }

    async getAll(): Promise<Array<T>> {
        return this.collection().find({}).toArray();
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
