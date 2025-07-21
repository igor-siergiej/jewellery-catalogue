import { BSON, Collection } from 'mongodb/mongodb';

export enum CollectionName {
    Catalogues = 'catalogues'
}

export interface IDatabase {
    connect: () => Promise<void>;
    getCollection<T extends BSON.Document>(collectionName: CollectionName): Collection<T>;
}
