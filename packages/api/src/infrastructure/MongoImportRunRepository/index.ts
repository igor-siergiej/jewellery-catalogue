import type { MongoDbConnection } from '@imapps/api-utils';
import type { ImportRun } from '@jewellery-catalogue/types';

import { CollectionNames, type Collections } from '../../dependencies/types';
import type { ImportRunRepository } from '../../domain/ImportRunRepository';
import { MongoRepository } from '../MongoRepository';

export class MongoImportRunRepository extends MongoRepository<ImportRun> implements ImportRunRepository {
    constructor(db: MongoDbConnection<Collections>) {
        super(db, CollectionNames.ImportRuns);
    }

    protected usesObjectId(): boolean {
        return false;
    }

    async getByUserId(userId: string): Promise<Array<ImportRun>> {
        return this.collection()
            .find({ userId }, { projection: { _id: 0 } })
            .sort({ startedAt: -1 })
            .toArray() as unknown as Array<ImportRun>;
    }

    async getByIdAndUserId(id: string, userId: string): Promise<ImportRun | null> {
        return this.collection().findOne({ id, userId }, { projection: { _id: 0 } }) as unknown as ImportRun | null;
    }

    async getById(id: string): Promise<ImportRun | null> {
        return this.collection().findOne({ id }, { projection: { _id: 0 } }) as unknown as ImportRun | null;
    }

    async findRunning(userId: string): Promise<ImportRun | null> {
        return this.collection().findOne(
            { userId, status: 'running' },
            { projection: { _id: 0 } }
        ) as unknown as ImportRun | null;
    }

    async update(id: string, run: ImportRun): Promise<void> {
        await this.collection().findOneAndReplace({ id }, run);
    }

    async requestCancel(id: string): Promise<void> {
        await this.collection().updateOne({ id, status: 'running' }, { $set: { cancelRequested: true } });
    }
}
