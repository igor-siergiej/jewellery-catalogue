import 'dotenv/config';

import cors from '@koa/cors';
import Koa, { Context, Next } from 'koa';
import koaBody from 'koa-body';

import { config } from './config';
import { dependencyContainer, registerDepdendencies } from './dependencies';
import { DependencyToken } from './dependencies/types';
import routes from './routes';
import { HttpErrorCode } from './types';

const port = config.get('port');

const allowedOrigins = [
    'http://localhost:3000', // Development
    'http://localhost:8082', // Staging (localhost)
    'http://192.168.68.54:8082', // Staging (IP)
    'https://jewellerycatalogue.imapps.co.uk' // Production
];

const customLogger = async (ctx: Context, next: Next) => {
    const start = Date.now();
    const appLogger = dependencyContainer.resolve(DependencyToken.Logger);

    if (appLogger) {
        appLogger.info(`Incoming request: ${ctx.method} ${ctx.url}`, {
            method: ctx.method,
            url: ctx.url,
            userAgent: ctx.get('user-agent') || 'unknown'
        });
    }

    await next();

    const responseTime = Date.now() - start;

    if (appLogger) {
        appLogger.info(`${ctx.method} ${ctx.url} - ${ctx.status} ${responseTime}ms`);
    }
};

const corsOptions = {
    origin: (ctx: Context) => {
        const origin = ctx.get('origin');
        if (allowedOrigins.includes(origin)) {
            return origin;
        }
        return '*';
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
};

const bodyOptions = {
    json: true,
    text: true,
    multipart: true,
    formidable: {
        keepExtensions: true,
    },
};

export const onStartup = async () => {
    try {
        const app = new Koa();
        app.use(cors(corsOptions));

        registerDepdendencies();

        app.use(customLogger);

        app.use(koaBody(bodyOptions));
        app.use(async (ctx, next) => {
            try {
                await next();
            } catch (err) {
                ctx.status = err.status || HttpErrorCode.InternalServerError;
                ctx.body = {
                    success: false,
                    message: err.message || 'Internal Server Error'
                };
                ctx.app.emit('error', err, ctx);
            }
        });

        app.on('error', (err, ctx) => {
            const appLogger = dependencyContainer.resolve(DependencyToken.Logger);

            if (appLogger) {
                appLogger.error('Server Error', {
                    message: err.message,
                    stack: err.stack,
                    path: ctx.request.path,
                    method: ctx.request.method,
                    status: ctx.status
                });
            }
        });

        const appLogger = dependencyContainer.resolve(DependencyToken.Logger);
        const database = dependencyContainer.resolve(DependencyToken.Database);
        const bucket = dependencyContainer.resolve(DependencyToken.Bucket);

        if (!appLogger) {
            throw new Error('Logger dependency not resolved');
        }

        if (!database) {
            throw new Error('Could not connect to DB');
        }

        appLogger.info('Starting API server - connecting to database and object store');
        await database.connect({
            connectionUri: config.get('connectionUri'),
            databaseName: config.get('databaseName')
        });
        appLogger.info('Connected to database');

        await bucket.connect?.({
            endpoint: config.get('bucketEndpoint'),
            accessKey: config.get('bucketAccessKey'),
            secretKey: config.get('bucketSecretKey'),
            bucketName: config.get('bucketName')
        });
        appLogger.info('Connected to object store');

        app.use(routes.routes());

        app.listen(port, () => {
            appLogger.info(`Jewellery Catalogue Api server running on port ${port}`);
        });
    } catch (error: unknown) {
        const appLogger = dependencyContainer.resolve(DependencyToken.Logger);

        if (error instanceof Error) {
            if (appLogger) {
                appLogger.error('Encountered an error on start up', { error: error.message });
            }
        } else {
            if (appLogger) {
                appLogger.error('Encountered unexpected error on start up', { error });
            }
        }
        process.exit(1);
    }
};

onStartup();
