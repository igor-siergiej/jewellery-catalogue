import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_MATERIALS } from './mocks/auth';
import { apiCreateBead, apiGetMaterials } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_MATERIALS;
test.use({ authToken: TOKEN });

async function fillCommon(
    page: Page,
    fields: { name: string; brand: string; url: string; type: string; pricePerPack: string; packs: string }
) {
    await page.goto('/addMaterial');
    await page.locator('input[name="name"]').fill(fields.name);
    await page.locator('input[name="brand"]').fill(fields.brand);
    await page.locator('input[name="purchaseUrl"]').fill(fields.url);
    await page.locator('input[name="pricePerPack"]').fill(fields.pricePerPack);
    await page.locator('input[name="packs"]').fill(fields.packs);
    await page.getByRole('button', { name: fields.type, exact: true }).click();
}

async function submitAndOpenMaterials(page: Page) {
    await page.getByRole('button', { name: 'Add Material!' }).click();
    await expect(page.getByText('Added material successfully!')).toBeVisible();
    await page.goto('/materials');
}

const allMaterialsRow = (page: Page, name: string) =>
    page.getByRole('tabpanel', { name: 'All Materials' }).getByRole('row', { name: new RegExp(name) });

test.describe
    .serial('Materials', () => {
        test('fresh user sees the empty state', async ({ authenticatedPage: page }) => {
            await page.goto('/materials');
            await expect(page.getByText('No Materials Found')).toBeVisible();
        });

        test('creates a wire with derived length and per-metre price', async ({ authenticatedPage: page }) => {
            await fillCommon(page, {
                name: 'Silver Wire',
                brand: 'WireCo',
                url: 'http://example.com/wire',
                type: 'Wire',
                pricePerPack: '8',
                packs: '2',
            });
            await page.getByRole('button', { name: 'Solid' }).click();
            await page.getByRole('button', { name: 'Silver', exact: true }).click();
            await page.locator('input[name="diameter"]').fill('0.5');
            await page.locator('input[name="length"]').fill('10');
            await submitAndOpenMaterials(page);

            const row = allMaterialsRow(page, 'Silver Wire');
            await expect(row).toContainText('20.00m');
            await expect(row).toContainText('10.00m');
            await expect(row).toContainText('£0.80');
            await expect(row).toContainText('0.50mm');
            await page.getByRole('tab', { name: 'Wires (1)' }).click();
            await expect(page.getByRole('tabpanel').getByText('Silver Wire')).toBeVisible();

            const [wire] = await apiGetMaterials(TOKEN);
            expect(wire).toMatchObject({ type: 'WIRE', wireType: 'FULL', metalType: 'SILVER', totalLength: 20 });
        });

        test('creates a chain', async ({ authenticatedPage: page }) => {
            await fillCommon(page, {
                name: 'Gold Chain',
                brand: 'ChainCo',
                url: 'http://example.com/chain',
                type: 'Chain',
                pricePerPack: '15',
                packs: '1',
            });
            await page.getByRole('button', { name: 'Filled' }).click();
            await page.getByRole('button', { name: 'Gold', exact: true }).click();
            await page.locator('input[name="diameter"]').fill('1.2');
            await page.locator('input[name="length"]').fill('5');
            await submitAndOpenMaterials(page);

            const row = allMaterialsRow(page, 'Gold Chain');
            await expect(row).toContainText('5.00m');
            await expect(row).toContainText('£3.00');
            await page.getByRole('tab', { name: 'Chains (1)' }).click();
            await expect(page.getByRole('tabpanel').getByText('Gold Chain')).toBeVisible();

            const [chain] = await apiGetMaterials(TOKEN);
            expect(chain).toMatchObject({ type: 'CHAIN', wireType: 'FILLED', metalType: 'GOLD', pricePerMeter: 3 });
        });

        test('creates an ear hook', async ({ authenticatedPage: page }) => {
            await fillCommon(page, {
                name: 'Brass Hooks',
                brand: 'HookCo',
                url: 'http://example.com/hooks',
                type: 'Ear Hook',
                pricePerPack: '5',
                packs: '2',
            });
            await page.getByRole('button', { name: 'Plated' }).click();
            await page.getByRole('button', { name: 'Brass', exact: true }).click();
            await page.locator('input[name="quantity"]').fill('50');
            await submitAndOpenMaterials(page);

            const row = allMaterialsRow(page, 'Brass Hooks');
            await expect(row).toContainText('100');
            await expect(row).toContainText('£0.10');
            await page.getByRole('tab', { name: 'Ear Hooks (1)' }).click();
            await expect(page.getByRole('tabpanel').getByText('Brass Hooks')).toBeVisible();

            const [hook] = await apiGetMaterials(TOKEN);
            expect(hook).toMatchObject({ type: 'EAR_HOOK', totalQuantity: 100, pricePerPiece: 0.1 });
        });

        test('shows validation errors and creates nothing when the form is empty', async ({
            authenticatedPage: page,
        }) => {
            await page.goto('/addMaterial');
            await page.getByRole('button', { name: 'Add Material!' }).click();

            await expect(page.getByText('Please enter the material name')).toBeVisible();
            await expect(page.getByText('Please enter the brand')).toBeVisible();

            // Type-specific fields are validated too
            await page.locator('input[name="name"]').fill('Half Wire');
            await page.locator('input[name="brand"]').fill('WireCo');
            await page.getByRole('button', { name: 'Wire', exact: true }).click();
            await page.locator('input[name="diameter"]').fill('0');
            await page.getByRole('button', { name: 'Add Material!' }).click();
            await expect(page.getByText('Diameter must be greater than 0')).toBeVisible();
            await expect(page.getByText('Please enter the length')).toBeVisible();
            await expect(page).toHaveURL(/\/addMaterial$/);
            expect(await apiGetMaterials(TOKEN)).toHaveLength(0);
        });

        test('adding packs at the same price increases stock', async ({ authenticatedPage: page }) => {
            await apiCreateBead(TOKEN, { name: 'Restock Bead', quantity: 100, packs: 1, pricePerPack: 5 });
            await page.goto('/materials');

            await allMaterialsRow(page, 'Restock Bead').getByRole('button', { name: 'Edit material' }).click();
            const dialog = page.getByRole('dialog');
            await dialog.locator('input[name="addPacks"]').fill('2');
            await expect(dialog.getByText('New stock level will be:')).toBeVisible();
            await expect(dialog).toContainText('300');
            await dialog.getByRole('button', { name: 'Update Material' }).click();

            await expect(page.getByRole('alertdialog', { name: 'Update Design Prices?' })).toHaveCount(0);
            await expect(allMaterialsRow(page, 'Restock Bead')).toContainText('300');
            const [bead] = await apiGetMaterials(TOKEN);
            expect(bead).toMatchObject({ totalQuantity: 300, pricePerBead: 0.05 });
        });

        test('the buy button opens the purchase URL', async ({ authenticatedPage: page }) => {
            await apiCreateBead(TOKEN, { name: 'Buyable Bead', purchaseUrl: 'http://example.com/buy-me' });
            await page.addInitScript(() => {
                (window as unknown as { opened: unknown[] }).opened = [];
                window.open = (...args: unknown[]) => {
                    (window as unknown as { opened: unknown[] }).opened.push(args);
                    return null;
                };
            });
            await page.goto('/materials');

            await allMaterialsRow(page, 'Buyable Bead').getByRole('button', { name: 'Buy material' }).click();
            const opened = await page.evaluate(() => (window as unknown as { opened: unknown[][] }).opened);
            expect(opened).toEqual([['http://example.com/buy-me', '_blank', 'noopener,noreferrer']]);
        });

        test('search filters materials by name', async ({ authenticatedPage: page }) => {
            await apiCreateBead(TOKEN, { name: 'Ruby Bead' });
            await apiCreateBead(TOKEN, { name: 'Jade Bead' });
            await page.goto('/materials');

            const search = page.getByPlaceholder('Search materials...');
            await search.fill('ruby');
            await expect(allMaterialsRow(page, 'Ruby Bead')).toBeVisible();
            await expect(allMaterialsRow(page, 'Jade Bead')).toHaveCount(0);

            await search.fill('zzzzzz');
            await expect(page.getByText('No materials found.')).toBeVisible();

            await search.fill('');
            await expect(allMaterialsRow(page, 'Ruby Bead')).toBeVisible();
            await expect(allMaterialsRow(page, 'Jade Bead')).toBeVisible();
        });
    });
