import { expect, test } from '@playwright/test';

test.describe('E2E: Jewellery Catalogue Start Page', () => {
    test('should load the start page and verify application is running end-to-end', async ({ page }) => {
        // Navigate to the start page
        await page.goto('/');

        // Wait for the page to load completely
        await page.waitForLoadState('networkidle');

        // Verify the page title
        await expect(page).toHaveTitle('Jewellery Catalogue');

        // Verify the main content is loaded
        const rootElement = page.locator('#root');
        await expect(rootElement).toBeVisible();

        // Verify that the application has loaded (no error boundaries or loading states)
        await expect(page.locator('body')).not.toContainText('Error');
        await expect(page.locator('body')).not.toContainText('Something went wrong');
    });

    test('should verify page loads without console errors', async ({ page }) => {
        const consoleErrors: Array<string> = [];
        const networkErrors: Array<string> = [];

        // Listen for console errors
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Listen for network failures
        page.on('response', (response) => {
            if (response.status() >= 400) {
                networkErrors.push(`${response.status()}: ${response.url()}`);
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Verify no critical console errors
        const criticalErrors = consoleErrors.filter(error =>
            !error.includes('favicon') // Ignore favicon errors
            && !error.includes('manifest') // Ignore manifest errors
            && !error.includes('DevTools') // Ignore DevTools specific errors
        );

        expect(criticalErrors).toHaveLength(0);

        // Verify no critical network errors (except for optional resources)
        const criticalNetworkErrors = networkErrors.filter(error =>
            !error.includes('favicon')
            && !error.includes('manifest')
        );

        expect(criticalNetworkErrors).toHaveLength(0);
    });

    test('should verify services are healthy by checking API connectivity', async ({ page, request }) => {
        // Test that the API service is reachable directly
        const apiResponse = await request.get('http://localhost:8080/health');
        expect(apiResponse.status()).toBe(200);
        const apiBody = await apiResponse.json();
        expect(apiBody.service).toBe('api');

        // Test that the Auth service is reachable directly
        const authResponse = await request.get('http://localhost:8081/health');
        expect(authResponse.status()).toBe(200);
        const authBody = await authResponse.json();
        expect(authBody.service).toBe('auth');

        // Navigate to ensure the frontend can communicate with backend
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Verify the page loads successfully (indicates frontend-backend communication works)
        await expect(page.locator('#root')).toBeVisible();
    });

    test('should verify basic styling is applied correctly', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Verify background color is applied
        const bodyElement = page.locator('body');
        await expect(bodyElement).toHaveCSS('background-color', 'rgb(204, 218, 244)');

        // Verify fonts are loaded
        const fontLinks = page.locator('link[href*="fonts.googleapis.com"]');
        await expect(fontLinks).toHaveCount(2);
    });

    test('should verify start page content when user is not authenticated', async ({ page }) => {
        // Clear any existing sessions/cookies to ensure clean state
        await page.context().clearCookies();

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Should see the welcome content for unauthenticated users
        // This test will need to be adjusted based on your actual start page content
        await expect(page.locator('#root')).toBeVisible();

        // Wait a bit more to ensure any auth checks complete
        await page.waitForTimeout(2000);

        // Verify no crashes or error states
        await expect(page.locator('body')).not.toContainText('Error');
    });
});
