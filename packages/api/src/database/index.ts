import { MongoClient, Db, Collection, BSON } from 'mongodb';
import 'dotenv/config';
import { CollectionName, IDatabase } from './types';
import { DependencyContainer } from '../lib/dependencyContainer';
import { DependencyToken, ILogger } from '../lib/dependencyContainer/types';

export class Database implements IDatabase {
    private client: MongoClient;
    private databaseInstance: Db;
    private logger: ILogger;

    constructor() {
        const connectionString = process.env.API_CONNECTION_URI;

        if (!connectionString) {
            throw new Error('Database connection string missing in environment variables');
        }

        this.client = new MongoClient(connectionString);

        const logger = DependencyContainer.getInstance().resolve(DependencyToken.Logger);

        if (!logger) {
            throw new Error('Logger dependency not resolved');
        } else {
            this.logger = logger;
        }
    };

    public connect = async () => {
        const databaseName = process.env.API_DATABASE_NAME;

        if (!databaseName) {
            this.logger.error('Database name missing in environment variables');
        }

        if (!this?.client) {
            this.logger.error('Database client does not exist');
        }

        try {
            await this.client.connect();

            this.databaseInstance = this.client.db(databaseName);
        } catch (e) {
            this.logger.error('Failed to connect to database', { error: e });
        }
    };

    getCollection<T extends BSON.Document>(collectionName: CollectionName): Collection<T> {
        return this.databaseInstance.collection<T & BSON.Document>(collectionName);
    };
}
