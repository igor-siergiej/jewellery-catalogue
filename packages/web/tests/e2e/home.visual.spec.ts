import { expect } from './fixtures';
import { MOCK_TOKEN_VISUAL_HOME_DESKTOP, MOCK_TOKEN_VISUAL_HOME_MOBILE } from './mocks/auth';
import { apiCreateDesign } from './utils/api-helpers';
import { expectNoHorizontalScroll, settle, visualTest } from './utils/visual-helpers';

const test = visualTest({ mobile: MOCK_TOKEN_VISUAL_HOME_MOBILE, desktop: MOCK_TOKEN_VISUAL_HOME_DESKTOP });

test.describe('Home page visual regression', () => {
    test.describe.configure({ mode: 'serial' });

    test('empty state', async ({ authenticatedPage: page }) => {
        await page.goto('/home');
        await expect(page.getByRole('heading', { name: 'Stock', exact: true })).toBeVisible({ timeout: 10000 });
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('home-empty.png', { fullPage: true });
    });

    test('populated state', async ({ authenticatedPage: page, authToken }) => {
        await apiCreateDesign(authToken, {
            name: 'Visual Low Design',
            lowStockThreshold: 5,
            photo: 'blue-lace-agate-ring',
        });
        await page.goto('/home');
        await expect(page.getByText('Visual Low Design').first()).toBeVisible({ timeout: 10000 });
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('home-populated.png', { fullPage: true });
    });
    test('collapsed sidebar', async ({ authenticatedPage: page }, testInfo) => {
        // fallow-ignore-next-line weakened-tests -- project-conditional skip, not a disabled test; it runs on desktop-visual
        test.skip(testInfo.project.name !== 'desktop-visual', 'the sidebar only collapses to a rail on desktop');
        await page.goto('/home');
        await expect(page.getByRole('heading', { name: 'Stock', exact: true })).toBeVisible({ timeout: 10000 });
        await page.locator('[data-slot="sidebar-trigger"]').click();
        const rail = page.locator('[data-sidebar="sidebar"]');
        await expect(page.locator('[data-slot="sidebar"][data-state="collapsed"]')).toBeVisible();
        await expect.poll(async () => (await rail.boundingBox())?.width).toBeLessThanOrEqual(48);
        await settle(page);

        const railBox = (await rail.boundingBox())!;

        for (const control of [
            rail.getByRole('link', { name: 'Settings', exact: true }),
            rail.getByRole('button', { name: 'Log out' }),
        ]) {
            const box = (await control.boundingBox())!;
            expect(box.x).toBeGreaterThanOrEqual(railBox.x);
            expect(box.x + box.width).toBeLessThanOrEqual(railBox.x + railBox.width);
            expect(Math.abs(box.x + box.width / 2 - (railBox.x + railBox.width / 2))).toBeLessThanOrEqual(1);
        }

        await expect(page).toHaveScreenshot('home-sidebar-collapsed.png');
    });
});
