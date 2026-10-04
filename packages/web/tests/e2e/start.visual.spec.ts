import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, settle } from './utils/visual-helpers';

test.describe('Start and register pages visual regression', () => {
    test.describe.configure({ mode: 'serial' });

    test('start page', async ({ page }) => {
        await page.goto('/');
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('start.png', { fullPage: true });
    });

    test('register page', async ({ page }) => {
        await page.goto('/register');
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('register.png', { fullPage: true });
    });
});
