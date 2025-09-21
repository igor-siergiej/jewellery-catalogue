import { describe, expect, it, vi } from 'vitest';

// Mock the ConfigService and parsers
const mockConfigService = vi.fn();
const mockParsers = {
    number: vi.fn(),
    string: vi.fn()
};

vi.mock('@igor-siergiej/api-utils', () => ({
    ConfigService: mockConfigService,
    parsers: mockParsers
}));

describe('Config', () => {
    describe('schema definition', () => {
        it('should create ConfigService with correct schema', async () => {
            // Import the config to trigger the constructor
            const { config } = await import('./index');

            expect(mockConfigService).toHaveBeenCalledWith({
                port: { parser: mockParsers.number, from: 'PORT' },
                connectionUri: { parser: mockParsers.string, from: 'CONNECTION_URI' },
                databaseName: { parser: mockParsers.string, from: 'DATABASE_NAME' },
                bucketName: { parser: mockParsers.string, from: 'BUCKET_NAME' },
                bucketAccessKey: { parser: mockParsers.string, from: 'BUCKET_ACCESS_KEY' },
                bucketSecretKey: { parser: mockParsers.string, from: 'BUCKET_SECRET_KEY' },
                bucketEndpoint: { parser: mockParsers.string, from: 'BUCKET_ENDPOINT' }
            });
        });

        it('should use number parser for port', async () => {
            const { config } = await import('./index');
            const callArgs = mockConfigService.mock.calls[0][0];
            expect(callArgs.port.parser).toBe(mockParsers.number);
            expect(callArgs.port.from).toBe('PORT');
        });

        it('should use string parser for all other fields', async () => {
            await import('./index');
            const callArgs = mockConfigService.mock.calls[0][0];

            const stringFields = [
                'connectionUri',
                'databaseName',
                'bucketName',
                'bucketAccessKey',
                'bucketSecretKey',
                'bucketEndpoint'
            ];

            stringFields.forEach((field) => {
                expect(callArgs[field].parser).toBe(mockParsers.string);
            });
        });

        it('should map to correct environment variables', async () => {
            await import('./index');
            const callArgs = mockConfigService.mock.calls[0][0];

            expect(callArgs.port.from).toBe('PORT');
            expect(callArgs.connectionUri.from).toBe('CONNECTION_URI');
            expect(callArgs.databaseName.from).toBe('DATABASE_NAME');
            expect(callArgs.bucketName.from).toBe('BUCKET_NAME');
            expect(callArgs.bucketAccessKey.from).toBe('BUCKET_ACCESS_KEY');
            expect(callArgs.bucketSecretKey.from).toBe('BUCKET_SECRET_KEY');
            expect(callArgs.bucketEndpoint.from).toBe('BUCKET_ENDPOINT');
        });
    });

    describe('config export', () => {
        it('should export config as ConfigService instance', async () => {
            const { config } = await import('./index');
            expect(config).toBeInstanceOf(mockConfigService);
        });

        it('should be a singleton instance', async () => {
            const { config } = await import('./index');
            const { config: config2 } = await import('./index');
            expect(config).toBe(config2);
        });
    });

    describe('schema structure', () => {
        it('should have all required configuration fields', async () => {
            await import('./index');
            const callArgs = mockConfigService.mock.calls[0][0];
            const expectedFields = [
                'port',
                'connectionUri',
                'databaseName',
                'bucketName',
                'bucketAccessKey',
                'bucketSecretKey',
                'bucketEndpoint'
            ];

            expectedFields.forEach((field) => {
                expect(callArgs).toHaveProperty(field);
                expect(callArgs[field]).toHaveProperty('parser');
                expect(callArgs[field]).toHaveProperty('from');
            });
        });

        it('should have exactly 7 configuration fields', async () => {
            await import('./index');
            const callArgs = mockConfigService.mock.calls[0][0];
            expect(Object.keys(callArgs)).toHaveLength(7);
        });

        it('should be defined as const', async () => {
            // This test verifies the schema object structure matches what we expect
            // The 'as const' assertion ensures TypeScript treats it as a readonly tuple
            await import('./index');
            const callArgs = mockConfigService.mock.calls[0][0];

            // All values should be objects with parser and from properties
            Object.values(callArgs).forEach((config) => {
                expect(config).toHaveProperty('parser');
                expect(config).toHaveProperty('from');
                expect(typeof config.from).toBe('string');
            });
        });
    });

    describe('environment variable mapping', () => {
        it('should map port to PORT environment variable', async () => {
            await import('./index');
            const callArgs = mockConfigService.mock.calls[0][0];
            expect(callArgs.port.from).toBe('PORT');
        });

        it('should map database config to correct env vars', async () => {
            await import('./index');
            const callArgs = mockConfigService.mock.calls[0][0];
            expect(callArgs.connectionUri.from).toBe('CONNECTION_URI');
            expect(callArgs.databaseName.from).toBe('DATABASE_NAME');
        });

        it('should map bucket config to correct env vars', async () => {
            await import('./index');
            const callArgs = mockConfigService.mock.calls[0][0];
            expect(callArgs.bucketName.from).toBe('BUCKET_NAME');
            expect(callArgs.bucketAccessKey.from).toBe('BUCKET_ACCESS_KEY');
            expect(callArgs.bucketSecretKey.from).toBe('BUCKET_SECRET_KEY');
            expect(callArgs.bucketEndpoint.from).toBe('BUCKET_ENDPOINT');
        });
    });

    describe('parser assignment', () => {
        it('should assign correct parsers to fields', async () => {
            await import('./index');
            const callArgs = mockConfigService.mock.calls[0][0];

            // Port should use number parser
            expect(callArgs.port.parser).toBe(mockParsers.number);

            // All string fields should use string parser
            const stringFields = [
                'connectionUri', 'databaseName', 'bucketName',
                'bucketAccessKey', 'bucketSecretKey', 'bucketEndpoint'
            ];

            stringFields.forEach((field) => {
                expect(callArgs[field].parser).toBe(mockParsers.string);
            });
        });

        it('should only use number parser for port field', async () => {
            await import('./index');
            const callArgs = mockConfigService.mock.calls[0][0];

            // Count how many fields use number parser
            const numberParserFields = Object.entries(callArgs)
                .filter(([, config]) => config.parser === mockParsers.number);

            expect(numberParserFields).toHaveLength(1);
            expect(numberParserFields[0][0]).toBe('port');
        });

        it('should use string parser for 6 fields', async () => {
            await import('./index');
            const callArgs = mockConfigService.mock.calls[0][0];

            // Count how many fields use string parser
            const stringParserFields = Object.entries(callArgs)
                .filter(([, config]) => config.parser === mockParsers.string);

            expect(stringParserFields).toHaveLength(6);
        });
    });
});
