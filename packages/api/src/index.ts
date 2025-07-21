import 'dotenv/config';

import cors from '@koa/cors';
import Koa, { Context, Next } from 'koa';
import koaBody from 'koa-body';

import { registerDepdendencies } from './dependencies';
import { DependencyContainer } from './lib/dependencyContainer';
import { DependencyToken } from './lib/dependencyContainer/types';
import routes from './routes';
import { HttpErrorCode } from './types';

const port = process.env.API_PORT;

const allowedOrigins = ['http://localhost:3000', 'https://jewellerycatalogue.imapps.co.uk'];

const customLogger = async (ctx: Context, next: Next) => {
    const start = Date.now();
    const appLogger = DependencyContainer.getInstance().resolve(DependencyToken.Logger);

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
        appLogger.logHttpRequest(ctx.method, ctx.url, ctx.status, responseTime);
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
            const appLogger = DependencyContainer.getInstance().resolve(DependencyToken.Logger);

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

        const appLogger = DependencyContainer.getInstance().resolve(DependencyToken.Logger);

        if (!appLogger) {
            throw new Error('Logger dependency not resolved');
        }

        const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

        if (!database) {
            throw new Error('Could not connect to DB');
        }

        await database.connect();

        app.use(routes.routes());

        app.listen(port, () => {
            appLogger.info(`Jewellery Catalogue Api server running on port ${port}`);
        });
    } catch (error: unknown) {
        const dependencyContainer = DependencyContainer.getInstance();
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
