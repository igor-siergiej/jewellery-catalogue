import { MongoDbConnection } from '@igor-siergiej/api-utils';
import { Material } from '@jewellery-catalogue/types';
import { ObjectId } from 'mongodb';

import { CollectionNames, Collections } from '../../dependencies/types';
import { MaterialRepository } from '../../domain/MaterialRepository';
import { MongoRepository } from '../MongoRepository';

export class MongoMaterialRepository extends MongoRepository<Material> implements MaterialRepository {
    constructor(db: MongoDbConnection<Collections>) {
        super(db, CollectionNames.Materials);
    }

    protected usesObjectId(): boolean {
        return false; // Materials use string id, not ObjectId _id
    }

    async getByCatalogueId(catalogueId: string): Promise<Array<Material>> {
        // For now, we'll need to get materials from the catalogue
        // In a more normalized approach, we could store catalogueId in materials
        const catalogueCollection = this.db.getCollection(CollectionNames.Catalogues);
        const catalogue = await catalogueCollection.findOne({ _id: new ObjectId(catalogueId) });
        return catalogue?.materials || [];
    }
}
