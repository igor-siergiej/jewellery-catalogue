import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const isStaging = process.env.NODE_ENV === 'staging' || !!process.env.STAGING_BASE_URL;
// True whenever tests target an already-running, real backend (staging/prod),
// as opposed to a locally-started app that has no auth backend of its own.
const isRemoteTarget = isStaging || !!process.env.E2E_BASE_URL;

if (isCI || isStaging) {
    process.env.E2E_API_SERVICE_URL = process.env.E2E_API_SERVICE_URL || 'http://localhost:3001';
    process.env.E2E_AUTH_SERVICE_URL = process.env.E2E_AUTH_SERVICE_URL || 'http://localhost:3008';
} else {
    process.env.E2E_API_SERVICE_URL = process.env.E2E_API_SERVICE_URL || 'http://localhost:3001';
    process.env.E2E_AUTH_SERVICE_URL = process.env.E2E_AUTH_SERVICE_URL || 'http://localhost:3008';
}

const getBaseURL = () => {
    if (process.env.STAGING_BASE_URL) return process.env.STAGING_BASE_URL;
    return process.env.E2E_BASE_URL || 'http://localhost:3000';
};

const ROOT = path.resolve(__dirname, '../..');

const E2E_MONGO_URI = process.env.E2E_MONGO_URI || 'mongodb://localhost:27018';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: isCI ? 3 : 5,
    reporter: 'html',
    // Mock auth server: needed whenever there's no real auth backend to talk to.
    // Skip it only when pointed at a real (staging/prod) environment.
    globalSetup: isRemoteTarget ? undefined : './tests/e2e/global-setup.ts',
    use: {
        baseURL: getBaseURL(),
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 15000,
        navigationTimeout: 30000,
    },
    timeout: 60000,
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: isCI
        ? [
              {
                  command: `bash -c "cd ${ROOT} && bun run --filter @jewellery-catalogue/api start"`,
                  url: 'http://localhost:3001/api/health',
                  reuseExistingServer: false,
                  timeout: 30000,
                  env: {
                      PORT: '3001',
                      CONNECTION_URI: E2E_MONGO_URI,
                      DATABASE_NAME: 'jewellery_catalogue_e2e',
                      BUCKET_NAME: 'test',
                      BUCKET_ENDPOINT: 'localhost:9000',
                      BUCKET_ACCESS_KEY: 'minioadmin',
                      BUCKET_SECRET_KEY: 'minioadmin',
                      ETSY_API_KEY: 'test',
                      ETSY_SHARED_SECRET: 'test',
                      ETSY_REDIRECT_URI: 'http://localhost:3001/api/etsy/oauth/callback',
                      WEB_APP_URL: 'http://localhost:3000',
                  },
              },
              {
                  command: 'bunx vite --port 3000',
                  url: 'http://localhost:3000',
                  reuseExistingServer: false,
                  timeout: 30000,
              },
          ]
        : undefined,
});
