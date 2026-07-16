import { ConfigService, parsers } from '@imapps/api-utils';

const schema = {
    port: { parser: parsers.number, from: 'PORT' },
    connectionUri: { parser: parsers.string, from: 'CONNECTION_URI' },
    databaseName: { parser: parsers.string, from: 'DATABASE_NAME' },
    bucketName: { parser: parsers.string, from: 'BUCKET_NAME' },
    bucketAccessKey: { parser: parsers.string, from: 'BUCKET_ACCESS_KEY' },
    bucketSecretKey: { parser: parsers.string, from: 'BUCKET_SECRET_KEY' },
    bucketEndpoint: { parser: parsers.string, from: 'BUCKET_ENDPOINT' },
    etsyApiKey: { parser: parsers.string, from: 'ETSY_API_KEY' },
    etsySharedSecret: { parser: parsers.string, from: 'ETSY_SHARED_SECRET' },
    etsyRedirectUri: { parser: parsers.string, from: 'ETSY_REDIRECT_URI' },
    webAppUrl: { parser: parsers.string, from: 'WEB_APP_URL' },
} as const;

export const config = new ConfigService(schema);
