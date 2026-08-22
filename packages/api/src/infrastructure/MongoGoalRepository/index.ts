import type { MongoDbConnection } from '@imapps/api-utils';
import type { Goal } from '@jewellery-catalogue/types';

import { CollectionNames, type Collections } from '../../dependencies/types';
import type { GoalRepository } from '../../domain/GoalRepository';
import { MongoRepository } from '../MongoRepository';

export class MongoGoalRepository extends MongoRepository<Goal> implements GoalRepository {
    constructor(db: MongoDbConnection<Collections>) {
        super(db, CollectionNames.Goals);
    }

    protected usesObjectId(): boolean {
        return false;
    }

    async getByUserId(userId: string): Promise<Array<Goal>> {
        return this.collection()
            .find({ userId }, { projection: { _id: 0 } })
            .toArray();
    }

    async getByIdAndUserId(id: string, userId: string): Promise<Goal | null> {
        return this.collection().findOne({ id, userId }, { projection: { _id: 0 } });
    }
}
