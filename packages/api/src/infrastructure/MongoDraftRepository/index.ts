import type { MongoDbConnection } from '@imapps/api-utils';
import type { Draft } from '@jewellery-catalogue/types';

import { CollectionNames, type Collections } from '../../dependencies/types';
import type { DraftRepository } from '../../domain/DraftRepository';
import { MongoRepository } from '../MongoRepository';

export class MongoDraftRepository extends MongoRepository<Draft> implements DraftRepository {
    constructor(db: MongoDbConnection<Collections>) {
        super(db, CollectionNames.Drafts);
    }

    protected usesObjectId(): boolean {
        return false;
    }

    async getByUserId(userId: string): Promise<Array<Draft>> {
        return this.collection()
            .find({ userId }, { projection: { _id: 0 } })
            .toArray() as unknown as Array<Draft>;
    }

    async getByIdAndUserId(id: string, userId: string): Promise<Draft | null> {
        return this.collection().findOne({ id, userId }, { projection: { _id: 0 } }) as unknown as Draft | null;
    }

    async update(id: string, draft: Draft): Promise<void> {
        await this.collection().findOneAndReplace({ id }, draft);
    }

    async delete(id: string): Promise<void> {
        await this.collection().deleteOne({ id });
    }
}
