import { MongoDbConnection } from '@imapps/api-utils';
import { MongoClient } from 'mongodb';

import { CollectionNames, type Collections } from '../dependencies/types';

const URI = 'mongodb://localhost:27018/test';
const DB = 'integration-test';

export interface TestContext {
    mongoDb: MongoDbConnection<Collections>;
    clearCollections(): Promise<void>;
    close(): Promise<void>;
}

export async function createTestContext(): Promise<TestContext> {
    const mongoDb = new MongoDbConnection<Collections>();
    await mongoDb.connect({ connectionUri: URI, databaseName: DB });

    const client = new MongoClient(URI);
    await client.connect();
    const db = client.db(DB);

    return {
        mongoDb,
        async clearCollections() {
            await Promise.all(Object.values(CollectionNames).map((name) => db.collection(name).deleteMany({})));
        },
        async close() {
            await client.close();
        },
    };
}
