import type { MongoDbConnection } from '@imapps/api-utils';
import type { Design } from '@jewellery-catalogue/types';

import { CollectionNames, type Collections } from '../../dependencies/types';
import type { DesignRepository } from '../../domain/DesignRepository';
import { MongoRepository } from '../MongoRepository';

export class MongoDesignRepository extends MongoRepository<Design> implements DesignRepository {
    constructor(db: MongoDbConnection<Collections>) {
        super(db, CollectionNames.Designs);
    }

    protected usesObjectId(): boolean {
        return false;
    }

    private migrate(doc: any): Design {
        if (!doc.imageIds && doc.imageId) {
            doc.imageIds = [doc.imageId];
            delete doc.imageId;
        }
        return doc as Design;
    }

    async getByUserId(userId: string): Promise<Array<Design>> {
        const docs = await this.collection()
            .find({ userId }, { projection: { _id: 0 } })
            .toArray();
        return docs.map((d) => this.migrate(d));
    }

    async getByIdAndUserId(id: string, userId: string): Promise<Design | null> {
        const doc = await this.collection().findOne({ id, userId }, { projection: { _id: 0 } });
        return doc ? this.migrate(doc) : null;
    }

    async findByMaterialId(materialId: string): Promise<Array<Design>> {
        const docs = await this.collection()
            .find(
                {
                    $or: [{ 'materials.id': materialId }, { 'variationGroups.options.material.id': materialId }],
                },
                { projection: { _id: 0 } }
            )
            .toArray();
        return docs.map((d) => this.migrate(d));
    }
}
