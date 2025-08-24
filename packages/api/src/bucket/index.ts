import { PersistentFile } from '@jewellery-catalogue/types';
import fs from 'fs';
import { Client } from 'minio';

import { DependencyContainer } from '../lib/dependencyContainer';
import { DependencyToken, ILogger } from '../lib/dependencyContainer/types';
import { IBucket } from './types';

export class Bucket implements IBucket {
    private client: Client;
    private bucketName: string;
    private logger: ILogger;

    constructor() {
        const appLogger = DependencyContainer.getInstance().resolve(DependencyToken.Logger);

        if (!appLogger) {
            throw new Error('Logger dependency not resolved');
        }

        this.logger = appLogger;

        const bucketName = process.env.BUCKET_NAME;
        const accessKey = process.env.BUCKET_ACCESS_KEY;
        const secretKey = process.env.BUCKET_SECRET_KEY;
        const endPoint = process.env.BUCKET_ENDPOINT;

        if (!accessKey || !secretKey || !endPoint || !bucketName) {
            this.logger.error('Missing env vars to create bucket client');
            throw new Error('Missing required environment variables for bucket configuration');
        }

        this.bucketName = bucketName;

        const [hostname, portStr] = endPoint.split(':');
        const port = portStr ? parseInt(portStr) : 7000;

        this.client = new Client({
            useSSL: false,
            endPoint: hostname,
            port: port,
            accessKey,
            secretKey
        });

        this.logger.info('Created Bucket client');
    }

    public addImage = async (objectName: string, image: PersistentFile) => {
        const { filepath, mimetype } = image ?? {};

        if (!mimetype) {
            this.logger.warn('Warning unknown uploaded file type');
        }

        const fileStream = fs.createReadStream(filepath);
        const fileSize = fs.statSync(filepath).size;

        return this.client.putObject(this.bucketName, objectName, fileStream, fileSize, {
            'Content-Type': mimetype
        });
    };

    public getObjectStream = async (id: string) => {
        return this.client.getObject(this.bucketName, id);
    };

    public getHeadObject = async (id: string) => {
        return this.client.statObject(this.bucketName, id);
    };
}
