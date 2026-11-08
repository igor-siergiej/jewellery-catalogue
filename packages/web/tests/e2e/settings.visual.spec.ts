import { expect } from './fixtures';
import { MOCK_TOKEN_VISUAL_SETTINGS_DESKTOP, MOCK_TOKEN_VISUAL_SETTINGS_MOBILE } from './mocks/auth';
import { expectNoHorizontalScroll, settle, visualTest } from './utils/visual-helpers';

const test = visualTest({ mobile: MOCK_TOKEN_VISUAL_SETTINGS_MOBILE, desktop: MOCK_TOKEN_VISUAL_SETTINGS_DESKTOP });

test.describe('Settings page visual regression', () => {
    test.describe.configure({ mode: 'serial' });

    test('default state', async ({ authenticatedPage: page }) => {
        await page.route('**/api/etsy/connection', (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: false }) })
        );
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('settings-default.png', { fullPage: true });
    });

    test('Etsy connected', async ({ authenticatedPage: page }) => {
        await page.route('**/api/etsy/connection', (route) =>
            route.fulfill({ json: { connected: true, shopName: 'Visual Bead Shop' } })
        );
        await page.route('**/api/etsy/taxonomy', (route) =>
            route.fulfill({
                json: [
                    {
                        id: 1,
                        name: 'Jewelry',
                        children: [
                            { id: 10, name: 'Rings', children: [] },
                            { id: 11, name: 'Earrings', children: [] },
                            { id: 12, name: 'Necklaces', children: [] },
                            { id: 13, name: 'Bracelets', children: [] },
                        ],
                    },
                ],
            })
        );
        await page.route('**/api/etsy/shipping-profiles', (route) =>
            route.fulfill({
                json: [
                    { shippingProfileId: 501, title: 'Royal Mail 1st class' },
                    { shippingProfileId: 502, title: 'Tracked 24' },
                ],
            })
        );
        await page.goto('/settings');
        await expect(page.getByLabel('Shipping profile')).toBeVisible({ timeout: 10000 });
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('settings-etsy-connected.png', { fullPage: true });
    });
});
