import { ConfigService, parsers } from '@imapps/api-utils';

const schema = {
    port: { parser: parsers.number, from: 'PORT' },
    authUrl: { parser: parsers.string, from: 'AUTH_URL' },
    connectionUri: { parser: parsers.string, from: 'CONNECTION_URI' },
    databaseName: { parser: parsers.string, from: 'DATABASE_NAME' },
    bucketName: { parser: parsers.string, from: 'BUCKET_NAME' },
    bucketAccessKey: { parser: parsers.string, from: 'BUCKET_ACCESS_KEY' },
    bucketSecretKey: { parser: parsers.string, from: 'BUCKET_SECRET_KEY' },
    bucketEndpoint: { parser: parsers.string, from: 'BUCKET_ENDPOINT' },
    // Test-only: keep images in process memory instead of the S3 bucket (e2e runs without an object store).
    inMemoryImageStore: { parser: parsers.boolean, from: 'IN_MEMORY_IMAGE_STORE', optional: true },
    etsyApiKey: { parser: parsers.string, from: 'ETSY_API_KEY' },
    etsySharedSecret: { parser: parsers.string, from: 'ETSY_SHARED_SECRET' },
    etsyRedirectUri: { parser: parsers.string, from: 'ETSY_REDIRECT_URI' },
    etsyMockUrl: { parser: parsers.string, from: 'ETSY_MOCK_URL', optional: true },
    webAppUrl: { parser: parsers.string, from: 'WEB_APP_URL' },
    falKey: { parser: parsers.string, from: 'FAL_KEY', optional: true },
    falModel: { parser: parsers.string, from: 'FAL_MODEL', optional: true },
    aiLimitPerHour: { parser: parsers.number, from: 'AI_LIMIT_PER_HOUR', optional: true },
    aiLimitPerDay: { parser: parsers.number, from: 'AI_LIMIT_PER_DAY', optional: true },
} as const;

export const config = new ConfigService(schema);
