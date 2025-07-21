import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : 3, // Use fewer workers in CI for stability
    reporter: 'html',
    use: {
        baseURL: process.env.STAGING_BASE_URL || 'http://localhost:8082',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        // Longer timeout for real services
        actionTimeout: 15000,
        navigationTimeout: 30000,
    },

    timeout: 60000, // Longer timeout for E2E tests

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    // No webServer - we'll test against the deployed staging environment
});
