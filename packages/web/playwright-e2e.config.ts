import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 3,
    reporter: 'html',
    use: {
        // Prioritize STAGING_BASE_URL from CI, then localhost for CI environments,
        // finally fall back to local development IP
        baseURL: process.env.STAGING_BASE_URL
            || (process.env.CI ? 'http://localhost:8082' : 'http://192.168.68.54:8082'),
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

    // No webServer - we'll test against the deployed staging environment
});
