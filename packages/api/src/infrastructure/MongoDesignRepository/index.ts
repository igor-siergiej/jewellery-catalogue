import { MongoDbConnection } from '@igor-siergiej/api-utils';
import { Design } from '@jewellery-catalogue/types';
import { ObjectId } from 'mongodb';

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

    async getByCatalogueId(catalogueId: string): Promise<Array<Design>> {
        // For now, we'll need to get designs from the catalogue
        // In a more normalized approach, we could store catalogueId in designs
        const catalogueCollection = this.db.getCollection(CollectionNames.Catalogues);
        const catalogue = await catalogueCollection.findOne({ _id: new ObjectId(catalogueId) });
        return catalogue?.designs || [];
    }
}
