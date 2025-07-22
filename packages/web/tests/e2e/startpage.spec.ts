import { expect, test } from '@playwright/test';

import { waitForAuthServices } from './utils/auth-helpers';

test.describe('Given Start Page', () => {
    test('When the start page is loaded', async ({ page }) => {
        await page.goto('/');

        await page.waitForLoadState('networkidle');

        await expect(page).toHaveTitle('Jewellery Catalogue');

        const rootElement = page.locator('#root');
        await expect(rootElement).toBeVisible();

        // Wait for React app to load
        await page.waitForTimeout(2000);

        await expect(page.locator('body')).not.toContainText('Error');
        await expect(page.locator('body')).not.toContainText('Something went wrong');
    });

    test('should verify page loads without console errors', async ({ page }) => {
        const consoleErrors: Array<string> = [];
        const networkErrors: Array<string> = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        page.on('response', (response) => {
            if (response.status() >= 400) {
                networkErrors.push(`${response.status()}: ${response.url()}`);
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const criticalErrors = consoleErrors.filter(error =>
            !error.includes('favicon')
            && !error.includes('manifest')
            && !error.includes('DevTools')
            && !error.includes('400 (Bad Request)')
        );

        expect(criticalErrors).toHaveLength(0);

        const criticalNetworkErrors = networkErrors.filter(error => !error.includes('/refresh'));

        expect(criticalNetworkErrors).toHaveLength(0);
    });

    test('should verify services are healthy by checking API connectivity', async ({ page, request }) => {
        // Wait for services to be ready before testing connectivity
        await waitForAuthServices(page);

        // Use environment variables for service URLs, with fallbacks for local development
        const apiServiceUrl = process.env.E2E_API_SERVICE_URL || 'http://192.168.68.54:5001';
        const authServiceUrl = process.env.E2E_AUTH_SERVICE_URL || 'http://192.168.68.54:5002';

        const apiResponse = await request.get(`${apiServiceUrl}/health`);
        expect(apiResponse.status()).toBe(200);
        const apiBody = await apiResponse.json();
        expect(apiBody.service).toBe('api');

        const authResponse = await request.get(`${authServiceUrl}/health`);
        expect(authResponse.status()).toBe(200);
        const authBody = await authResponse.json();
        expect(authBody.service).toBe('auth');

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('#root')).toBeVisible();
    });

    test('should verify basic styling is applied correctly', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const bodyElement = page.locator('body');
        await expect(bodyElement).toHaveCSS('background-color', 'rgb(204, 218, 244)');

        const fontLinks = page.locator('link[href*="fonts.googleapis.com"]');
        await expect(fontLinks).toHaveCount(2);
    });

    test('should verify start page content when user is not authenticated', async ({ page }) => {
        await page.context().clearCookies();

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('#root')).toBeVisible();

        await page.waitForTimeout(2000);

        await expect(page.locator('body')).not.toContainText('Error');
    });
});
