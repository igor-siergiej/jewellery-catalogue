import { MongoClient, Db, Collection } from 'mongodb';
import { CollectionName, IDatabase } from './types';
import { DependencyContainer } from '../dependencyContainer';
import { DependencyToken } from '../dependencyContainer/types';
import { IConfig } from '../config/types';

export class Database implements IDatabase {
    private client: MongoClient;
    private databaseInstance: Db;

    constructor() {
        const config = DependencyContainer.getInstance().resolve(DependencyToken.Config) as IConfig;

        this.client = new MongoClient(config.connectionUri);
    };

    public connect = async () => {
        const { databaseName } = DependencyContainer.getInstance().resolve(DependencyToken.Config) as IConfig;

        try {
            await this.client.connect();

            this.databaseInstance = this.client.db(databaseName);
        } catch (e) {
            console.error(e);
        }
    };

    getCollection<T extends Document>(collectionName: CollectionName): Collection<T> {
        return this.databaseInstance.collection<T>(collectionName);
    };
}