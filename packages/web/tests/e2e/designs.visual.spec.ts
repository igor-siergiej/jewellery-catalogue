import { expect } from './fixtures';
import { MOCK_TOKEN_VISUAL_DESIGNS_DESKTOP, MOCK_TOKEN_VISUAL_DESIGNS_MOBILE } from './mocks/auth';
import { apiCreateDesign } from './utils/api-helpers';
import { expectNoHorizontalScroll, settle, visualTest } from './utils/visual-helpers';

const test = visualTest({ mobile: MOCK_TOKEN_VISUAL_DESIGNS_MOBILE, desktop: MOCK_TOKEN_VISUAL_DESIGNS_DESKTOP });

test.describe('Designs page visual regression', () => {
    test.describe.configure({ mode: 'serial' });

    test('empty state', async ({ authenticatedPage: page }) => {
        await page.goto('/designs');
        await page.waitForLoadState('networkidle');
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('designs-empty.png', { fullPage: true });
    });

    test('populated state', async ({ authenticatedPage: page, authToken }) => {
        await apiCreateDesign(authToken, { name: 'Visual Moon Pendant', price: 24.5 });
        await apiCreateDesign(authToken, { name: 'Visual Star Earrings', price: 18 });
        await page.goto('/designs');
        await expect(page.getByText('Visual Moon Pendant')).toBeVisible({ timeout: 10000 });
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('designs-populated.png', { fullPage: true });
    });
});
