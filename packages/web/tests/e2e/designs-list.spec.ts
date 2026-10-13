import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_DESIGNS_LIST } from './mocks/auth';
import { apiCreateBead, apiCreateDesign, apiGetDesigns } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_DESIGNS_LIST;
test.use({ authToken: TOKEN });

const cardTitle = (page: Page, name: string) =>
    page.locator('[data-slot="item-title"]').filter({ hasText: new RegExp(`^${name}$`) });

test.describe
    .serial('Designs list', () => {
        test('fresh user sees the empty state', async ({ authenticatedPage: page }) => {
            await page.goto('/designs');
            await expect(page.getByText('No Designs Yet')).toBeVisible();
            await expect(page.getByRole('tab', { name: 'All (0)' })).toBeVisible();
        });

        test('search filters designs by name and shows a no-match state', async ({ authenticatedPage: page }) => {
            await apiCreateDesign(TOKEN, { name: 'Amethyst Drops' });
            await apiCreateDesign(TOKEN, { name: 'Copper Cuff' });
            await page.goto('/designs');

            const search = page.getByPlaceholder('Search designs...');
            await search.fill('amethist');
            await expect(cardTitle(page, 'Amethyst Drops')).toBeVisible();
            await expect(cardTitle(page, 'Copper Cuff')).toHaveCount(0);

            await search.fill('zzzzzz');
            await expect(page.getByText('No Matching Designs')).toBeVisible();

            await search.fill('');
            await expect(cardTitle(page, 'Amethyst Drops')).toBeVisible();
            await expect(cardTitle(page, 'Copper Cuff')).toBeVisible();
        });

        test('type tabs filter designs and show per-type counts', async ({ authenticatedPage: page }) => {
            await apiCreateDesign(TOKEN, { name: 'Drop Earrings', designType: 'EARRINGS' });
            await apiCreateDesign(TOKEN, { name: 'Stud Earrings', designType: 'EARRINGS' });
            await apiCreateDesign(TOKEN, { name: 'Band Ring', designType: 'RING' });
            await page.goto('/designs');

            await expect(page.getByRole('tab', { name: 'All (3)' })).toBeVisible();
            await page.getByRole('tab', { name: 'Rings (1)' }).click();
            await expect(cardTitle(page, 'Band Ring')).toBeVisible();
            await expect(cardTitle(page, 'Drop Earrings')).toHaveCount(0);

            await page.getByRole('tab', { name: 'Earrings (2)' }).click();
            await expect(cardTitle(page, 'Drop Earrings')).toBeVisible();
            await expect(cardTitle(page, 'Stud Earrings')).toBeVisible();
            await expect(cardTitle(page, 'Band Ring')).toHaveCount(0);

            await page.getByRole('tab', { name: 'Bracelets (0)' }).click();
            await expect(page.getByText('No Matching Designs')).toBeVisible();
        });

        test('cards show stock and how many can be made from material stock', async ({ authenticatedPage: page }) => {
            const bead = await apiCreateBead(TOKEN, { name: 'Card Bead', quantity: 25 });
            await apiCreateDesign(TOKEN, { name: 'Makeable', materials: [{ ...bead, requiredQuantity: 10 }] });
            await apiCreateDesign(TOKEN, { name: 'No Materials' });
            await page.goto('/designs');

            const makeable = page.locator('[data-slot="item"]').filter({ has: cardTitle(page, 'Makeable') });
            await expect(makeable).toContainText('0 in stock');
            await expect(makeable.getByTestId('can-make')).toHaveText('Can make 2');
            // A design with no materials has no limit, so no badge
            const noMaterials = page.locator('[data-slot="item"]').filter({ has: cardTitle(page, 'No Materials') });
            await expect(noMaterials.getByTestId('can-make')).toHaveCount(0);
        });

        test('cancelling delete keeps the design', async ({ authenticatedPage: page }) => {
            await apiCreateDesign(TOKEN, { name: 'Keep Me' });
            await page.goto('/designs');

            await page.getByTitle('Delete Design').click();
            const dialog = page.getByRole('alertdialog', { name: 'Delete Keep Me?' });
            await dialog.getByRole('button', { name: 'Cancel' }).click();

            await expect(dialog).toBeHidden();
            await expect(cardTitle(page, 'Keep Me')).toBeVisible();
            expect(await apiGetDesigns(TOKEN)).toHaveLength(1);
        });

        test('clicking a card opens the design', async ({ authenticatedPage: page }) => {
            const design = await apiCreateDesign(TOKEN, { name: 'Open Me' });
            await page.goto('/designs');

            await cardTitle(page, 'Open Me').click();
            await expect(page).toHaveURL(`/designs/${design.id}`);
            await expect(page.getByRole('heading', { level: 1, name: 'Open Me' })).toBeVisible();
        });

        test('the shopping list link opens the shopping list', async ({ authenticatedPage: page }) => {
            await page.goto('/designs');
            await page.getByRole('link', { name: 'Shopping list' }).click();
            await expect(page).toHaveURL(/\/shopping-list$/);
        });
    });
