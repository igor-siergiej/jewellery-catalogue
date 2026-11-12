import { expect } from './fixtures';
import { MOCK_TOKEN_VISUAL_ADD_DESIGN_DESKTOP, MOCK_TOKEN_VISUAL_ADD_DESIGN_MOBILE } from './mocks/auth';
import { addSharedMaterial } from './utils/add-design-form';
import { apiCreateBead } from './utils/api-helpers';
import { expectNoHorizontalScroll, settle, showWholeForm, visualTest } from './utils/visual-helpers';

const test = visualTest({ mobile: MOCK_TOKEN_VISUAL_ADD_DESIGN_MOBILE, desktop: MOCK_TOKEN_VISUAL_ADD_DESIGN_DESKTOP });

test.describe('Add design page visual regression', () => {
    test.describe.configure({ mode: 'serial' });

    test('empty state', async ({ authenticatedPage: page }) => {
        await showWholeForm(page, 1400);
        await page.goto('/addDesign');
        await page.waitForLoadState('networkidle');
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('add-design-empty.png');
    });

    test('validation errors', async ({ authenticatedPage: page }) => {
        await showWholeForm(page, 1400);
        await page.goto('/addDesign');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Create design' }).click();
        await expect(page.getByText('Please enter the design name')).toBeVisible();
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('add-design-errors.png');
    });

    test('with materials and variation groups', async ({ authenticatedPage: page, authToken }) => {
        await apiCreateBead(authToken, { name: 'Visual Spacer', pricePerPack: 5, quantity: 100 });
        await apiCreateBead(authToken, { name: 'Visual Amethyst', pricePerPack: 10, quantity: 20 });
        await apiCreateBead(authToken, { name: 'Visual Quartz', pricePerPack: 4, quantity: 20 });
        await showWholeForm(page, 2800);
        await page.goto('/addDesign');
        await page.getByPlaceholder('Enter design name').fill('Visual Gem Drops');
        await page.getByLabel('Hours').fill('0');
        await page.getByLabel('Minutes').fill('30');
        await page.locator('form').getByRole('radio', { name: 'Earrings' }).click();
        await addSharedMaterial(page, 'Visual Spacer', 2);

        await page.getByRole('button', { name: 'More options' }).click();
        const variations = page.getByRole('region', { name: 'Variations' });
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
        await expect(page).toHaveScreenshot('add-design-variations.png');
    });
});
