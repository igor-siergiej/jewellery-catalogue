import { expect } from './fixtures';
import { MOCK_TOKEN_VISUAL_ADD_MATERIAL_DESKTOP, MOCK_TOKEN_VISUAL_ADD_MATERIAL_MOBILE } from './mocks/auth';
import { expectNoHorizontalScroll, settle, visualTest } from './utils/visual-helpers';

const test = visualTest({
    mobile: MOCK_TOKEN_VISUAL_ADD_MATERIAL_MOBILE,
    desktop: MOCK_TOKEN_VISUAL_ADD_MATERIAL_DESKTOP,
});

test.describe('Add material page visual regression', () => {
    test.describe.configure({ mode: 'serial' });

    test('empty state', async ({ authenticatedPage: page }) => {
        await page.goto('/addMaterial');
        await page.waitForLoadState('networkidle');
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('add-material-empty.png', { fullPage: true });
    });
});
