import { expect } from './fixtures';
import { MOCK_TOKEN_VISUAL_DESIGNS_DESKTOP, MOCK_TOKEN_VISUAL_DESIGNS_MOBILE } from './mocks/auth';
import { apiCreateDesign, apiCreateDraft } from './utils/api-helpers';
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
        await apiCreateDesign(authToken, { name: 'Visual Moon Pendant', price: 24.5, photo: 'celestial-rings' });
        await apiCreateDesign(authToken, { name: 'Visual Star Earrings', price: 18, photo: 'floral-earrings' });
        await page.goto('/designs');
        await expect(page.getByText('Visual Moon Pendant')).toBeVisible({ timeout: 10000 });
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('designs-populated.png', { fullPage: true });
    });

    test('search with no matches', async ({ authenticatedPage: page, authToken }) => {
        await apiCreateDesign(authToken, { name: 'Visual Moon Pendant', price: 24.5, photo: 'celestial-rings' });
        await page.goto('/designs');
        await expect(page.getByText('Visual Moon Pendant')).toBeVisible({ timeout: 10000 });
        await page.getByPlaceholder('Search designs...').fill('zzzzzz');
        await expect(page.getByText('Visual Moon Pendant')).toBeHidden();
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('designs-search-no-match.png', { fullPage: true });
    });

    test('delete confirmation', async ({ authenticatedPage: page, authToken }) => {
        await apiCreateDesign(authToken, { name: 'Visual Moon Pendant', price: 24.5, photo: 'celestial-rings' });
        await page.goto('/designs');
        await expect(page.getByText('Visual Moon Pendant')).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: /^More actions for / }).click();
        await page.getByRole('menuitem', { name: 'Delete' }).click();
        const dialog = page.getByRole('alertdialog', { name: 'Delete "Visual Moon Pendant"?' });
        await expect(dialog).toBeVisible();
        await settle(page);
        await expect(page).toHaveScreenshot('designs-delete-confirm.png');
    });

    test('draft and photoless cards match the design card layout', async ({ authenticatedPage: page, authToken }) => {
        await apiCreateDraft(authToken, {
            type: 'design',
            name: 'Visual Draft Ring',
            data: { name: 'Visual Draft Ring' },
        });
        await apiCreateDesign(authToken, { name: 'Visual Photoless Studs', price: 12 });
        await apiCreateDesign(authToken, { name: 'Visual Moon Pendant', price: 24.5, photo: 'celestial-rings' });
        await page.goto('/designs');
        await expect(page.getByText('Visual Draft Ring')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Visual Moon Pendant')).toBeVisible();
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('designs-draft-and-photoless.png', {
            fullPage: true,
            mask: [page.getByText(/^Edited /)],
        });
    });
});
