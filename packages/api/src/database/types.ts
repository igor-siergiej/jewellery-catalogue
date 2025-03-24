import { Collection } from 'mongodb/mongodb';

export enum CollectionName {
    Designs = 'designs',
    Materials = 'materials'
}

export interface IDatabase {
    connect: () => Promise<void>;
    getCollection<T>(collectionName: CollectionName): Collection<T>;
}
