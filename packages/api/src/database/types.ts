import { Collection } from 'mongodb/mongodb';

export enum CollectionName {
    Catalogues = 'catalogues'
}

export interface IDatabase {
    connect: () => Promise<void>;
    getCollection<T>(collectionName: CollectionName): Collection<T>;
}
