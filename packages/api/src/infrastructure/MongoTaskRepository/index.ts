import type { MongoDbConnection } from '@imapps/api-utils';
import type { Task } from '@jewellery-catalogue/types';

import { CollectionNames, type Collections } from '../../dependencies/types';
import type { TaskRepository } from '../../domain/TaskRepository';
import { MongoRepository } from '../MongoRepository';

export class MongoTaskRepository extends MongoRepository<Task> implements TaskRepository {
    constructor(db: MongoDbConnection<Collections>) {
        super(db, CollectionNames.Tasks);
    }

    protected usesObjectId(): boolean {
        return false;
    }

    async getByUserId(userId: string): Promise<Array<Task>> {
        return this.collection()
            .find({ userId }, { projection: { _id: 0 } })
            .toArray();
    }

    async getByIdAndUserId(id: string, userId: string): Promise<Task | null> {
        return this.collection().findOne({ id, userId }, { projection: { _id: 0 } });
    }
}
