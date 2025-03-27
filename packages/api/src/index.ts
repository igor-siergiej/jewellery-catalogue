import bodyParser from 'koa-bodyparser';
import { registerDepdendencies } from './dependencies';
import { DependencyContainer } from './lib/dependencyContainer';
import { DependencyToken } from './lib/dependencyContainer/types';
import 'dotenv/config';
import Koa, { Request } from 'koa';
import KoaLogger from 'koa-logger';
import routes from './routes';
// TODO: this needs to use @koa/cors
import koaCors, { Options } from 'koa-cors';
import { HttpErrorCode } from './types';

const port = process.env.PORT;

const allowedOrigins = ['http://localhost:3000', 'https://jewellerycatalogue.imapps.co.uk'];
const logger = KoaLogger();

const corsOptions: Options = {
    origin: (request: Request) => {
        const origin = request.url;
        if (allowedOrigins.includes(origin)) {
            return origin;
        }
        return '*';
    },
    methods: ['GET'],
};

export const onStartup = async () => {
    try {
        const app = new Koa();
        app.use(koaCors(corsOptions));
        app.use(logger);
        app.use(bodyParser());

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
            console.error('Server Error:', {
                message: err.message,
                stack: err.stack,
                path: ctx.request.path,
                method: ctx.request.method
            });
        });

        registerDepdendencies();

        const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

        await database.connect();

        app.use(routes.routes()).use(routes.allowedMethods());

        app.listen(port, () => {
            console.log(`Jewellery Catalogue Api server running on port ${port}.`);
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Encountered an error on start up', error.message);
        } else {
            console.error('Encountered unexpected error on start up', error);
        }
        process.exit(1);
    }
};

onStartup();
