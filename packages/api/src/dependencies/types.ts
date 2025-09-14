import { Logger, MongoDbConnection, ObjectStoreConnection } from '@igor-siergiej/api-utils';
import { Catalogue } from '@jewellery-catalogue/types';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Collections = {
    [CollectionNames.Catalogues]: Catalogue;
};

export enum DependencyToken {
    Database = 'Database',
    Logger = 'Logger',
    Bucket = 'Bucket'
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Dependencies = {
    [DependencyToken.Database]: MongoDbConnection<Collections>;
    [DependencyToken.Logger]: Logger;
    [DependencyToken.Bucket]: ObjectStoreConnection;
};

export enum CollectionNames {
    Catalogues = 'catalogues'
}

