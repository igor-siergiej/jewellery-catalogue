import { expect, test } from '@playwright/test';

test.describe('Jewellery Catalogue Homepage', () => {
    test('should load the homepage and display the correct title', async ({ page }) => {
        await page.goto('/');

        await page.waitForLoadState('networkidle');

        await expect(page).toHaveTitle('Jewellery Catalogue');
    });

    test('should display the root element', async ({ page }) => {
        await page.goto('/');

        await page.waitForLoadState('networkidle');

        const rootElement = page.locator('#root');
        await expect(rootElement).toBeVisible();
    });

    test('should have the correct background color', async ({ page }) => {
        await page.goto('/');

        await page.waitForLoadState('networkidle');

        const bodyElement = page.locator('body');
        await expect(bodyElement).toHaveCSS('background-color', 'rgb(204, 218, 244)');
    });

    test('should load without console errors', async ({ page }) => {
        const consoleErrors: Array<string> = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        await page.goto('/');

        await page.waitForLoadState('networkidle');

        expect(consoleErrors).toHaveLength(0);
    });

    test('should have proper font loading', async ({ page }) => {
        await page.goto('/');

        await page.waitForLoadState('networkidle');

        const fontLinks = page.locator('link[href*="fonts.googleapis.com"]');
        await expect(fontLinks).toHaveCount(2);
    });
});
