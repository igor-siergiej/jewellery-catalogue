import { MongoClient, Db, Collection } from 'mongodb';
import 'dotenv/config';
import { CollectionName, IDatabase } from './types';

export class Database implements IDatabase {
    private client: MongoClient;
    private databaseInstance: Db;

    constructor() {
        const connectionString = process.env.CONNECTION_URI;

        if (!connectionString) {
            throw new Error('Database connection string missing in environment variables');
        }

        this.client = new MongoClient(connectionString);
    };

    public connect = async () => {
        const databaseName = process.env.DATABASE_NAME;

        if (!databaseName) {
            throw new Error('Database name missing in environment variables');
        }

        if (!this?.client) {
            throw new Error('Database client does not exist');
        }

        try {
            await this.client.connect();

            this.databaseInstance = this.client.db(databaseName);
        } catch (e) {
            console.error(e);
        }
    };

    getCollection<T>(collectionName: CollectionName): Collection<T> {
        return this.databaseInstance.collection<T>(collectionName);
    };
}
