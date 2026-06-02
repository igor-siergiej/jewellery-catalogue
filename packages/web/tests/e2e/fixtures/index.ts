import { test as base, type Page } from '@playwright/test';
import { MOCK_TOKEN, mockAuthRoutes } from '../mocks/auth';
import { apiCleanup } from '../utils/api-helpers';

interface Fixtures {
    authenticatedPage: Page;
    authToken: string;
}

async function waitForApi(apiUrl: string, maxRetries = 15, retryDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const res = await fetch(`${apiUrl}/api/materials`, {
                headers: { Authorization: `Bearer ${MOCK_TOKEN}` },
            });
            if (res.status !== 503 && res.status !== 0) return;
        } catch {
            // not up yet
        }
        await new Promise((r) => setTimeout(r, retryDelay));
    }
    throw new Error(`API not ready at ${apiUrl}`);
}

export const test = base.extend<Fixtures>({
    authToken: [MOCK_TOKEN, { option: true }],

    authenticatedPage: async ({ page, authToken }, use) => {
        const apiUrl = process.env.E2E_API_SERVICE_URL || 'http://localhost:3001';
        await waitForApi(apiUrl);
        await apiCleanup(authToken);

        await mockAuthRoutes(page, authToken);

        await page.route(/\/api\/images\//, (route) =>
            route.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('GIF89a', 'ascii') })
        );

        await page.addInitScript((token) => {
            localStorage.setItem('accessToken', token);
        }, authToken);

        await use(page);
    },
});

export { expect } from '@playwright/test';
