import { expect, test } from '@playwright/test';

import { ANALYTICS_WEBSITE_ID, mockAnalytics } from './mocks/analytics';

test.describe('Given the Umami tracker', () => {
    test('When the app loads then a page view reaches the collect endpoint @smoke', async ({ page }) => {
        const hits = await mockAnalytics(page);

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect
            .poll(() => hits.filter((h) => !h.payload.name).map((h) => h.payload.website))
            .toContain(ANALYTICS_WEBSITE_ID);
    });
});
