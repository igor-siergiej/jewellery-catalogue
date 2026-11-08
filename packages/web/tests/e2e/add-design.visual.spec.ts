import { expect } from './fixtures';
import { MOCK_TOKEN_VISUAL_ADD_DESIGN_DESKTOP, MOCK_TOKEN_VISUAL_ADD_DESIGN_MOBILE } from './mocks/auth';
import { addSharedMaterial } from './utils/add-design-form';
import { apiCreateBead } from './utils/api-helpers';
import { expectNoHorizontalScroll, settle, visualTest } from './utils/visual-helpers';

const test = visualTest({ mobile: MOCK_TOKEN_VISUAL_ADD_DESIGN_MOBILE, desktop: MOCK_TOKEN_VISUAL_ADD_DESIGN_DESKTOP });

test.describe('Add design page visual regression', () => {
    test.describe.configure({ mode: 'serial' });

    test('empty state', async ({ authenticatedPage: page }) => {
        await page.goto('/addDesign');
        await page.waitForLoadState('networkidle');
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('add-design-empty.png', { fullPage: true });
    });

    test('validation errors', async ({ authenticatedPage: page }) => {
        await page.goto('/addDesign');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Create Design' }).click();
        await expect(page.getByText('Please enter the design name')).toBeVisible();
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('add-design-errors.png', { fullPage: true });
    });

    test('with materials and variation groups', async ({ authenticatedPage: page, authToken }) => {
        await apiCreateBead(authToken, { name: 'Visual Spacer', pricePerPack: 5, quantity: 100 });
        await apiCreateBead(authToken, { name: 'Visual Amethyst', pricePerPack: 10, quantity: 20 });
        await apiCreateBead(authToken, { name: 'Visual Quartz', pricePerPack: 4, quantity: 20 });
        await page.goto('/addDesign');
        await page.getByPlaceholder('Enter design name').fill('Visual Gem Drops');
        await page.getByLabel('Time Spent Crafting').fill('00:30');
        await page.locator('form').getByRole('button', { name: 'Earrings' }).click();
        await addSharedMaterial(page, 'Visual Spacer', 2);

        const variations = page.locator('div.grid:has(> div > h2:text-is("Variations"))');
        await variations.getByRole('button', { name: 'Add Variation Group' }).click();
        await variations.getByPlaceholder('Group name (e.g. Gemstone)').fill('Gemstone');
        await variations.getByPlaceholder('Qty').fill('1');
        await variations.getByRole('button', { name: 'Add Option' }).click();
        await variations.getByRole('combobox').nth(0).click();
        await page.getByRole('option', { name: 'Visual Amethyst' }).click();
        await variations.getByRole('button', { name: 'Add Option' }).click();
        await variations.getByRole('combobox').nth(1).click();
        await page.getByRole('option', { name: 'Visual Quartz' }).click();
        await expect(variations.getByRole('row', { name: /Visual Quartz/ })).toBeVisible();

        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page.locator('form')).toHaveScreenshot('add-design-variations.png');
    });
});
