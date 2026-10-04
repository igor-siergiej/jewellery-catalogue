import { expect } from './fixtures';
import { MOCK_TOKEN_VISUAL_MATERIALS_DESKTOP, MOCK_TOKEN_VISUAL_MATERIALS_MOBILE } from './mocks/auth';
import { apiCreateBead } from './utils/api-helpers';
import { expectNoHorizontalScroll, settle, visualTest } from './utils/visual-helpers';

const test = visualTest({ mobile: MOCK_TOKEN_VISUAL_MATERIALS_MOBILE, desktop: MOCK_TOKEN_VISUAL_MATERIALS_DESKTOP });

test.describe('Materials page visual regression', () => {
    test.describe.configure({ mode: 'serial' });

    test('empty state', async ({ authenticatedPage: page }) => {
        await page.goto('/materials');
        await page.waitForLoadState('networkidle');
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('materials-empty.png', { fullPage: true });
    });

    test('populated state', async ({ authenticatedPage: page, authToken }) => {
        await apiCreateBead(authToken, { name: 'Visual Red Bead', colour: 'red' });
        await apiCreateBead(authToken, { name: 'Visual Blue Bead', colour: 'blue', diameter: 6 });
        await page.goto('/materials');
        await expect(page.getByText('Visual Red Bead')).toBeVisible({ timeout: 10000 });
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('materials-populated.png', { fullPage: true });
    });
});
