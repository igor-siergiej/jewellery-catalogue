import express, { Application } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { registerDepdendencies } from './dependencies';
import { DependencyContainer } from './lib/dependencyContainer';
import { DependencyToken } from './lib/dependencyContainer/types';
import 'dotenv/config';

const port = process.env.PORT;

const allowedOrigins: Array<string> = [
    'https://jewellerycatalogue.imapps.co.uk',
    'http://localhost:3000',
];

const corsOptions: cors.CorsOptions = {
    origin: function(origin, callback) {
        if (!origin) {
            callback(null, true);
            return;
        }
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
};

export const onStartup = async () => {
    try {
        const app: Application = express();

        registerDepdendencies();

        const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

        await database.connect();

        app.use(cors(corsOptions));
        app.use(bodyParser.json());
        app.use(
            bodyParser.urlencoded({
                extended: true,
            })
        );

        app.use((req, res, next) => {
            // TODO: do some logging here
            next();
        });

        // TODO: move these out to another directory and remove the leading /api/


        app.listen(port, () => {
            console.log(`Jewellery Catalogue Api server running on port ${port}.`);
        });
    } catch (error) {
        console.error('Encountered an error on start up', error);
        process.exit(1);
    }
};

onStartup();
