import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_PRODUCTION_PLAN } from './mocks/auth';
import { apiCleanup, apiCreateBead, apiCreateDesign } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_PRODUCTION_PLAN;

test.use({ authToken: TOKEN });

function findDesignCard(page: Page, designName: string) {
    const title = page.locator('[data-slot="item-title"]').filter({ hasText: designName });
    return page.locator('[data-slot="item"]').filter({ has: title });
}

test.describe
    .serial('What can I make? and the shopping list', () => {
        test.beforeEach(async () => {
            await apiCleanup(TOKEN);
        });

        test.afterAll(async () => {
            await apiCleanup(TOKEN);
        });

        test('shows how many can be made, and what to buy for a target', async ({ authenticatedPage: page }) => {
            // 50 beads in stock, 20 per piece: can make 2.
            const bead = await apiCreateBead(TOKEN, { name: 'Plan Bead', quantity: 50, packs: 1, pricePerPack: 5 });
            const design = await apiCreateDesign(TOKEN, {
                name: 'Plan Bracelet',
                materials: [{ ...bead, requiredQuantity: 20 }],
            });

            await page.goto('/designs');
            await expect(findDesignCard(page, 'Plan Bracelet').getByTestId('can-make')).toHaveText('Can make 2');

            await page.goto(`/designs/${design.id}`);
            await expect(page.getByTestId('can-make')).toHaveText('Can make 2');

            await page.goto('/designs');
            await page.getByRole('link', { name: 'Shopping list' }).click();
            await expect(page).toHaveURL(/\/shopping-list$/);

            await page.getByRole('button', { name: 'Add design' }).click();
            await page.getByLabel('Design').selectOption({ label: 'Plan Bracelet' });
            await page.getByLabel('Quantity').fill('5');
            await page.getByRole('button', { name: 'Build list' }).click();

            // Need 100, have 50: one 50-bead pack at £5.
            const result = page.getByTestId('shopping-list-result');
            await expect(result.getByText('Estimated cost £5.00')).toBeVisible();
            await expect(result.getByRole('row', { name: /Plan Bead/ })).toContainText('1 × 50 pcs');
        });
    });
