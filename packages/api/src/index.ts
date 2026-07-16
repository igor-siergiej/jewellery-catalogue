import 'dotenv/config';

import { createApp } from '@imapps/api-utils/hono';

import { config } from './config';
import { dependencyContainer, registerDepdendencies } from './dependencies';
import { DependencyToken } from './dependencies/types';
import { createRoutes } from './routes';

const port = config.get('port');

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8082',
    'http://192.168.68.54:8082',
    'https://jewellerycatalogue.imapps.co.uk',
];

export const onStartup = async () => {
    registerDepdendencies();

    const appLogger = dependencyContainer.resolve(DependencyToken.Logger);
    const database = dependencyContainer.resolve(DependencyToken.Database);
    const bucket = dependencyContainer.resolve(DependencyToken.Bucket);

    if (!appLogger) throw new Error('Logger dependency not resolved');
    if (!database) throw new Error('Could not connect to DB');

    try {
        appLogger.info('Starting API server - connecting to database and object store');
        await database.connect({
            connectionUri: config.get('connectionUri'),
            databaseName: config.get('databaseName'),
        });
        appLogger.info('Connected to database');

        await bucket.connect?.({
            endpoint: config.get('bucketEndpoint'),
            accessKey: config.get('bucketAccessKey'),
            secretKey: config.get('bucketSecretKey'),
            bucketName: config.get('bucketName'),
        });
        appLogger.info('Connected to object store');

        appLogger.info('Creating database indexes');
        const designsCollection = database.getCollection('designs' as any);
        const materialsCollection = database.getCollection('materials' as any);
        await designsCollection.createIndex({ userId: 1 });
        await designsCollection.createIndex({ id: 1, userId: 1 });
        await materialsCollection.createIndex({ userId: 1 });
        await materialsCollection.createIndex({ id: 1, userId: 1 });
        const draftsCollection = database.getCollection('drafts' as any);
        await draftsCollection.createIndex({ userId: 1 });
        await draftsCollection.createIndex({ id: 1, userId: 1 });
        appLogger.info('Database indexes created');

        const app = createApp({ logger: appLogger, allowedOrigins });
        app.route('/', createRoutes());

        Bun.serve({ port, fetch: app.fetch });
        appLogger.info(`Jewellery Catalogue Api server running on port ${port}`);
    } catch (error: unknown) {
        appLogger.error('Encountered an error on start up', {
            error: error instanceof Error ? error.message : error,
        });
        process.exit(1);
    }
};

onStartup();
