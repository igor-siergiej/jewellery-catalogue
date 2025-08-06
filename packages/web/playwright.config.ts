import { defineConfig, devices } from '@playwright/test';

// Environment detection
const isCI = !!process.env.CI;
const isStaging = process.env.NODE_ENV === 'staging' || process.env.STAGING_BASE_URL;

// Set environment-specific URLs for E2E tests
if (isCI || isStaging) {
    // Pipeline/Staging environment - uses staging URLs
    process.env.E2E_API_SERVICE_URL = process.env.E2E_API_SERVICE_URL || 'http://localhost:5001';
    process.env.E2E_AUTH_SERVICE_URL = process.env.E2E_AUTH_SERVICE_URL || 'http://localhost:5002';
} else {
    // Local development environment - uses local development URLs
    process.env.E2E_API_SERVICE_URL = process.env.E2E_API_SERVICE_URL || 'http://localhost:3001';
    process.env.E2E_AUTH_SERVICE_URL = process.env.E2E_AUTH_SERVICE_URL || 'http://localhost:3008';
}

// Determine base URL based on environment
const getBaseURL = () => {
    if (process.env.STAGING_BASE_URL) {
        return process.env.STAGING_BASE_URL; // Pipeline sets this
    }
    if (isCI || isStaging) {
        return 'http://localhost:8082'; // Staging default
    }
    return process.env.E2E_BASE_URL || 'http://localhost:3000'; // Local development default
};

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: isCI ? 3 : 5, // Fewer workers in CI to avoid resource contention
    reporter: 'html',
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

    // E2E tests assume services are already running, so no webServer needed
});
