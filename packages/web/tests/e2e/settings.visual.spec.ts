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
});
