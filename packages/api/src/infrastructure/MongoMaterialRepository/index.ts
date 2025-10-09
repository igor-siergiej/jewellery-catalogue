import type { MongoDbConnection } from '@imapps/api-utils';
import type { Material } from '@jewellery-catalogue/types';

import { CollectionNames, type Collections } from '../../dependencies/types';
import type { MaterialRepository } from '../../domain/MaterialRepository';
import { MongoRepository } from '../MongoRepository';

export class MongoMaterialRepository extends MongoRepository<Material> implements MaterialRepository {
    constructor(db: MongoDbConnection<Collections>) {
        super(db, CollectionNames.Materials);
    }

    protected usesObjectId(): boolean {
        return false; // Materials use string id, not ObjectId _id
    }

    async getByUserId(userId: string): Promise<Array<Material>> {
        return this.collection().find({ userId }).toArray();
    }

    async getByIdAndUserId(id: string, userId: string): Promise<Material | null> {
        return this.collection().findOne({ id, userId });
    }
}
