import { Collection } from 'mongodb';

export enum CollectionName {
    Sessions = 'sessions',
    Users = 'users'
}

export interface IDatabase {
    connect: () => Promise<void>;
    getCollection<T extends Document>(collectionName: CollectionName): Collection<T>;
}