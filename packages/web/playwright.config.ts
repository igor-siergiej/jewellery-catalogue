import { defineConfig, devices } from '@playwright/test';

// Environment detection
const isCI = !!process.env.CI;
const isStaging = process.env.NODE_ENV === 'staging' || process.env.STAGING_BASE_URL;
const isE2E = process.env.PLAYWRIGHT_TEST_TYPE === 'e2e';

// Set environment-specific URLs for E2E tests
if (isE2E) {
    if (isCI || isStaging) {
        // Pipeline/Staging environment - uses staging URLs
        process.env.E2E_API_SERVICE_URL = process.env.E2E_API_SERVICE_URL || 'http://localhost:5001';
        process.env.E2E_AUTH_SERVICE_URL = process.env.E2E_AUTH_SERVICE_URL || 'http://localhost:5002';
    } else {
        // Local development environment - uses local development URLs
        process.env.E2E_API_SERVICE_URL = process.env.E2E_API_SERVICE_URL || 'http://localhost:3001';
        process.env.E2E_AUTH_SERVICE_URL = process.env.E2E_AUTH_SERVICE_URL || 'http://localhost:3008';
    }
}

// Determine base URL and test directory based on test type
const getBaseURL = () => {
    if (isE2E) {
        if (process.env.STAGING_BASE_URL) {
            return process.env.STAGING_BASE_URL; // Pipeline sets this
        }
        if (isCI || isStaging) {
            return 'http://localhost:8082'; // Staging default
        }
        return process.env.E2E_BASE_URL || 'http://localhost:3000'; // Local development default
    }
    return 'http://localhost:3000'; // Regular tests use local dev server
};

const getTestDir = () => {
    return isE2E ? './tests/e2e' : './tests';
};

export default defineConfig({
    testDir: getTestDir(),
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: isCI ? 3 : 5, // Fewer workers in CI to avoid resource contention
    reporter: 'html',
    use: {
        baseURL: getBaseURL(),
        trace: 'on-first-retry',
        screenshot: isE2E ? 'only-on-failure' : undefined,
        video: isE2E ? 'retain-on-failure' : undefined,
        actionTimeout: isE2E ? 15000 : undefined,
        navigationTimeout: isE2E ? 30000 : undefined,
    },

    timeout: isE2E ? 60000 : 30000,

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    // Only start web server for regular tests, not E2E (E2E assumes services are already running)
    webServer: isE2E
        ? undefined
        : {
                command: 'yarn start',
                url: 'http://localhost:3000',
                reuseExistingServer: !process.env.CI,
            },
});
