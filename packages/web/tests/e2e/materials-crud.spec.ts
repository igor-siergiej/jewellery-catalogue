import { expect, test } from './fixtures';
import { MOCK_TOKEN_MATERIALS_CRUD } from './mocks/auth';
import { apiCreateBead } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_MATERIALS_CRUD;

test.use({ authToken: TOKEN });

test.describe
    .serial('Materials CRUD via UI', () => {
        test('create bead via AddMaterial form', async ({ authenticatedPage: page }) => {
            await page.goto('/addMaterial');
            await page.waitForLoadState('networkidle');

            await page.locator('input[name="name"]').fill('UI Test Bead');
            await page.locator('input[name="brand"]').fill('TestBrand');
            await page.locator('input[name="purchaseUrl"]').fill('http://example.com');

            await page.getByRole('button', { name: 'Bead' }).click();

            await page.locator('input[name="colour"]').fill('red');
            await page.locator('input[name="diameter"]').fill('4');
            await page.locator('input[name="quantity"]').fill('100');

            await page.locator('input[name="pricePerPack"]').fill('5.00');
            await page.locator('input[name="packs"]').fill('1');

            await page.getByRole('button', { name: 'Add Material!' }).click();

            await expect(page.getByText('Added material successfully!')).toBeVisible({ timeout: 10000 });

            await page.goto('/materials');
            await page.waitForLoadState('networkidle');

            await expect(page.getByRole('cell', { name: 'UI Test Bead' })).toBeVisible({ timeout: 10000 });
        });

        test('delete material via table', async ({ authenticatedPage: page }) => {
            const bead = await apiCreateBead(TOKEN, { name: 'Deletable Bead' });

            await page.goto('/materials');
            await page.waitForLoadState('networkidle');

            await expect(page.getByRole('cell', { name: bead.name })).toBeVisible({ timeout: 10000 });

            await page
                .locator('tr')
                .filter({ hasText: bead.name })
                .locator('button:has(span:text("Delete material"))')
                .click();

            await expect(page.getByText(`Delete "${bead.name}"?`)).toBeVisible({ timeout: 5000 });
            await page.getByRole('button', { name: 'Delete' }).click();

            await expect(page.getByRole('cell', { name: bead.name })).not.toBeVisible({ timeout: 10000 });
        });

        test('edit material non-price field does not trigger price dialog', async ({ authenticatedPage: page }) => {
            const bead = await apiCreateBead(TOKEN, { name: 'Edit Brand Bead', pricePerPack: 5.0 });

            await page.goto('/materials');
            await page.waitForLoadState('networkidle');

            await page
                .locator('tr')
                .filter({ hasText: bead.name })
                .locator('button:has(span:text("Edit material"))')
                .click();

            await page.waitForSelector('input[name="brand"]', { timeout: 10000 });
            await page.locator('input[name="brand"]').fill('NewBrand');

            await page.getByRole('button', { name: 'Update Material' }).click();

            await expect(page.getByText('Update Design Prices?')).not.toBeVisible();
            await expect(page.getByText('Material updated successfully!')).toBeVisible({ timeout: 10000 });
        });
    });
