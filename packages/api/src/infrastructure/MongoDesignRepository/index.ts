import { MongoDbConnection } from '@imapps/api-utils';
import { Design } from '@jewellery-catalogue/types';

import { CollectionNames, Collections } from '../../dependencies/types';
import { DesignRepository } from '../../domain/DesignRepository';
import { MongoRepository } from '../MongoRepository';

export class MongoDesignRepository extends MongoRepository<Design> implements DesignRepository {
    constructor(db: MongoDbConnection<Collections>) {
        super(db, CollectionNames.Designs);
    }

    protected usesObjectId(): boolean {
        return false; // Designs use string id, not ObjectId _id
    }

    async getByUserId(userId: string): Promise<Array<Design>> {
        return this.collection().find({ userId }).toArray();
    }

    async getByIdAndUserId(id: string, userId: string): Promise<Design | null> {
        return this.collection().findOne({ id, userId });
    }

    async findByMaterialId(materialId: string): Promise<Array<Design>> {
        return this.collection().find({
            'materials.materialId': materialId
        }).toArray();
    }
}
