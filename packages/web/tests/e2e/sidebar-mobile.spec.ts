import { expect, test } from './fixtures';
import { MOCK_TOKEN_SIDEBAR_MOBILE } from './mocks/auth';
import { expectNoHorizontalScroll } from './utils/visual-helpers';

test.use({ authToken: MOCK_TOKEN_SIDEBAR_MOBILE, viewport: { width: 393, height: 851 } });

test.describe('Mobile sidebar', () => {
    test('closes after navigating to a page', async ({ authenticatedPage: page }) => {
        await page.goto('/home');
        await page.locator('[data-slot="sidebar-trigger"]').click();

        const drawer = page.locator('[data-mobile="true"]');
        await expect(drawer).toBeVisible();

        await drawer.getByRole('button', { name: 'Materials' }).click();

        await expect(page).toHaveURL(/\/materials/);
        await expect(drawer).toBeHidden();
        await expectNoHorizontalScroll(page);
    });
});
