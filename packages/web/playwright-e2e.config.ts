import { defineConfig, devices } from '@playwright/test';

// Simple config - set E2E service URLs directly
process.env.E2E_API_SERVICE_URL = process.env.E2E_API_SERVICE_URL || 'http://localhost:5001';
process.env.E2E_AUTH_SERVICE_URL = process.env.E2E_AUTH_SERVICE_URL || 'http://localhost:5002';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 3,
    reporter: 'html',
    use: {
        baseURL: process.env.STAGING_BASE_URL || 'http://localhost:8082',
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
});
