import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_HOME } from './mocks/auth';
import { apiCreateBead, apiCreateDesign, apiGetMaterials, apiProduceDesign } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_HOME;
test.use({ authToken: TOKEN });

const lowStockCard = (page: Page, title: RegExp) =>
    page.locator('[data-slot="card"]').filter({ has: page.getByText(title) });

test.describe
    .serial('Home low-stock dashboard', () => {
        test('everything above its threshold shows the all-good state', async ({ authenticatedPage: page }) => {
            await apiCreateBead(TOKEN, { name: 'Plenty Bead', packs: 3, lowStockThreshold: 2 });
            await apiCreateDesign(TOKEN, { name: 'No Threshold Design' });
            await page.goto('/home');

            await expect(page.getByText('All Stock Levels Good!')).toBeVisible();
            await expect(page.getByText('Low Stock Dashboard')).toHaveCount(0);
        });

        test('materials below their threshold are listed with a severity', async ({ authenticatedPage: page }) => {
            await apiCreateBead(TOKEN, { name: 'Critical Bead', packs: 1, lowStockThreshold: 3 });
            await apiCreateBead(TOKEN, { name: 'Low Bead', packs: 2, lowStockThreshold: 3 });
            await apiCreateBead(TOKEN, { name: 'Fine Bead', packs: 5, lowStockThreshold: 3 });
            const empty = await apiCreateBead(TOKEN, {
                name: 'Empty Bead',
                quantity: 10,
                packs: 1,
                lowStockThreshold: 1,
            });
            const design = await apiCreateDesign(TOKEN, {
                name: 'Uses Every Bead',
                materials: [{ ...empty, requiredQuantity: 10 }],
            });
            await apiProduceDesign(TOKEN, design.id, 1);
            await page.goto('/home');

            const card = lowStockCard(page, /^Low Stock Materials \(3\)$/);
            await expect(card.getByRole('row', { name: /Critical Bead/ })).toContainText('1 / 3 packs');
            await expect(card.getByRole('row', { name: /Critical Bead/ })).toContainText('Critical');
            await expect(card.getByRole('row', { name: /Low Bead/ })).toContainText('2 / 3 packs');
            await expect(card.getByRole('row', { name: /Low Bead/ })).toContainText('Low');
            await expect(card.getByRole('row', { name: /Empty Bead/ })).toContainText('Out of Stock');
            await expect(card.getByRole('row', { name: /Fine Bead/ })).toHaveCount(0);
        });

        test('a stock alert set when adding a material puts it on Home', async ({ authenticatedPage: page }) => {
            await page.goto('/addMaterial');
            await page.locator('input[name="name"]').fill('Alerting Bead');
            await page.locator('input[name="brand"]').fill('AlertCo');
            await page.locator('input[name="purchaseUrl"]').fill('http://example.com');
            await page.locator('input[name="pricePerPack"]').fill('5');
            await page.locator('input[name="packs"]').fill('1');
            await page.getByRole('button', { name: 'Bead', exact: true }).click();
            await page.locator('input[name="colour"]').fill('red');
            await page.locator('input[name="diameter"]').fill('4');
            await page.locator('input[name="quantity"]').fill('100');
            await page.locator('input[name="lowStockThreshold"]').fill('2');
            await page.getByRole('button', { name: 'Add Material!' }).click();
            await expect(page.getByText('Added material successfully!')).toBeVisible();

            const [bead] = await apiGetMaterials(TOKEN);
            expect(bead.lowStockThreshold).toBe(2);
            await page.goto('/home');
            await expect(
                lowStockCard(page, /^Low Stock Materials \(1\)$/).getByRole('row', { name: /Alerting Bead/ })
            ).toContainText('1 / 2 packs');
        });

        test('restocking a material from Home takes it off the list', async ({ authenticatedPage: page }) => {
            await apiCreateBead(TOKEN, { name: 'Restock Me', packs: 1, lowStockThreshold: 3 });
            await page.goto('/home');

            const card = lowStockCard(page, /^Low Stock Materials \(1\)$/);
            await card
                .getByRole('row', { name: /Restock Me/ })
                .getByRole('button', { name: 'Edit material' })
                .click();
            const dialog = page.getByRole('dialog');
            await dialog.locator('input[name="addPacks"]').fill('4');
            await dialog.getByRole('button', { name: 'Update Material' }).click();

            await expect(page.getByText('All Stock Levels Good!')).toBeVisible();
            const [bead] = await apiGetMaterials(TOKEN);
            expect(bead.totalQuantity).toBe(500);
        });

        test('producing a low-stock design from Home takes it off the list', async ({ authenticatedPage: page }) => {
            const bead = await apiCreateBead(TOKEN, { name: 'Stocked Bead', packs: 5 });
            const design = await apiCreateDesign(TOKEN, {
                name: 'Popular Ring',
                lowStockThreshold: 2,
                materials: [{ ...bead, requiredQuantity: 1 }],
            });
            await page.goto('/home');

            const card = lowStockCard(page, /^Low Stock Designs \(1\)$/);
            const row = card.getByRole('row', { name: /Popular Ring/ });
            await expect(row).toContainText('Out of Stock');
            await row.getByRole('button', { name: 'View design' }).click();
            await expect(page).toHaveURL(`/designs/${design.id}`);

            await page.goto('/home');
            await lowStockCard(page, /^Low Stock Designs \(1\)$/)
                .getByRole('row', { name: /Popular Ring/ })
                .getByRole('button', { name: 'Edit design' })
                .click();
            const dialog = page.getByRole('dialog', { name: 'Manage Design Inventory' });
            await dialog.locator('input[name="addQuantity"]').fill('2');
            await dialog.getByRole('button', { name: 'Produce Designs' }).click();

            await expect(page.getByText('All Stock Levels Good!')).toBeVisible();
        });
    });
