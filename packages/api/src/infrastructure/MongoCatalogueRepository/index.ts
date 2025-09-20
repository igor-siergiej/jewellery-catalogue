import { MongoDbConnection } from '@igor-siergiej/api-utils';
import { Catalogue } from '@jewellery-catalogue/types';

import { CollectionNames, Collections } from '../../dependencies/types';
import { CatalogueRepository } from '../../domain/CatalogueRepository';
import { MongoRepository } from '../MongoRepository';

export class MongoCatalogueRepository extends MongoRepository<Catalogue> implements CatalogueRepository {
    constructor(db: MongoDbConnection<Collections>) {
        super(db, CollectionNames.Catalogues);
    }
}
