import bodyParser from 'koa-bodyparser';
import { registerDepdendencies } from './dependencies';
import { DependencyContainer } from './lib/dependencyContainer';
import { DependencyToken } from './lib/dependencyContainer/types';
import 'dotenv/config';
import Koa, { Request } from 'koa';
import KoaLogger from 'koa-logger';
import routes from './routes';
import koaCors, { Options } from 'koa-cors';
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

        registerDepdendencies();

        const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

        await database.connect();

        app.use(routes.routes()).use(routes.allowedMethods());

        app.listen(port, () => {
            console.log(`Jewellery Catalogue Api server running on port ${port}.`);
        });
    } catch (error) {
        console.error('Encountered an error on start up', error);
        process.exit(1);
    }
};

onStartup();
