import { expect } from './fixtures';
import { MOCK_TOKEN_VISUAL_HOME_DESKTOP, MOCK_TOKEN_VISUAL_HOME_MOBILE } from './mocks/auth';
import { apiCreateDesign } from './utils/api-helpers';
import { expectNoHorizontalScroll, settle, visualTest } from './utils/visual-helpers';

const test = visualTest({ mobile: MOCK_TOKEN_VISUAL_HOME_MOBILE, desktop: MOCK_TOKEN_VISUAL_HOME_DESKTOP });

test.describe('Home page visual regression', () => {
    test.describe.configure({ mode: 'serial' });

    test('empty state', async ({ authenticatedPage: page }) => {
        await page.goto('/home');
        await expect(page.getByText('Low Stock').first()).toBeVisible({ timeout: 10000 });
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('home-empty.png', { fullPage: true });
    });

    test('populated state', async ({ authenticatedPage: page, authToken }) => {
        await apiCreateDesign(authToken, { name: 'Visual Low Design', lowStockThreshold: 5 });
        await page.goto('/home');
        await expect(page.getByText('Visual Low Design').first()).toBeVisible({ timeout: 10000 });
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('home-populated.png', { fullPage: true });
    });
});
