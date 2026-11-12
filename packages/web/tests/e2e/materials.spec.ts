import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { MOCK_TOKEN_MATERIALS } from './mocks/auth';
import { apiCreateBead, apiGetMaterials } from './utils/api-helpers';
import { chooseMaterialAction, materialRow } from './utils/materials-ui';

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
    await page.getByRole('radio', { name: fields.type, exact: true }).click();
}

async function submitAndOpenMaterials(page: Page) {
    await page.getByRole('button', { name: 'Add material' }).click();
    await expect(page.getByText('Material created')).toBeVisible();
    await page.goto('/materials');
}

test.describe.serial('Materials', () => {
    test('fresh user sees the empty state', async ({ authenticatedPage: page }) => {
        await page.goto('/materials');
        await expect(page.getByText('No materials yet')).toBeVisible();
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
        await page.getByRole('radio', { name: 'Solid' }).click();
        await page.getByRole('radio', { name: 'Silver', exact: true }).click();
        await page.locator('input[name="diameter"]').fill('0.5');
        await page.locator('input[name="length"]').fill('10');
        await submitAndOpenMaterials(page);

        const row = materialRow(page, 'Silver Wire');
        await expect(row).toContainText('20.00m');
        await expect(row).toContainText('£0.80');
        await page.getByRole('tab', { name: /^Wire 1$/ }).click();
        await expect(row).toContainText('Solid');
        await expect(row).toContainText('Silver');
        await expect(row).toContainText('0.50mm');
        await expect(row).toContainText('10.00m');

        const [wire] = await apiGetMaterials(TOKEN);
        expect(wire).toMatchObject({
            type: 'WIRE',
            wireType: 'FULL',
            metalType: 'SILVER',
            totalLength: 20,
            lengthPerPack: 10,
        });
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
        await page.getByRole('radio', { name: 'Filled' }).click();
        await page.getByRole('radio', { name: 'Gold', exact: true }).click();
        await page.locator('input[name="diameter"]').fill('1.2');
        await page.locator('input[name="length"]').fill('5');
        await submitAndOpenMaterials(page);

        const row = materialRow(page, 'Gold Chain');
        await expect(row).toContainText('5.00m');
        await expect(row).toContainText('£3.00');
        await page.getByRole('tab', { name: /^Chains 1$/ }).click();
        await expect(row).toContainText('Gold');

        const [chain] = await apiGetMaterials(TOKEN);
        expect(chain).toMatchObject({ type: 'CHAIN', wireType: 'FILLED', metalType: 'GOLD', pricePerMeter: 3 });
    });

    test('creates an ear hook', async ({ authenticatedPage: page }) => {
        await fillCommon(page, {
            name: 'Brass Hooks',
            brand: 'HookCo',
            url: 'http://example.com/hooks',
            type: 'Ear hook',
            pricePerPack: '5',
            packs: '2',
        });
        await page.getByRole('radio', { name: 'Plated' }).click();
        await page.getByRole('radio', { name: 'Brass', exact: true }).click();
        await page.locator('input[name="quantity"]').fill('50');
        await submitAndOpenMaterials(page);

        const row = materialRow(page, 'Brass Hooks');
        await expect(row).toContainText('100');
        await expect(row).toContainText('£0.10');
        await page.getByRole('tab', { name: /^Ear hooks 1$/ }).click();
        await expect(row).toContainText('Brass');

        const [hook] = await apiGetMaterials(TOKEN);
        expect(hook).toMatchObject({ type: 'EAR_HOOK', totalQuantity: 100, pricePerPiece: 0.1 });
    });

    test('shows validation errors and creates nothing when the form is empty', async ({ authenticatedPage: page }) => {
        await page.goto('/addMaterial');
        await page.getByRole('button', { name: 'Add material' }).click();

        await expect(page.getByText('Please enter the material name')).toBeVisible();
        await expect(page.getByText('Please enter the brand')).toBeVisible();

        // Type-specific fields are validated too
        await page.locator('input[name="name"]').fill('Half Wire');
        await page.locator('input[name="brand"]').fill('WireCo');
        await page.getByRole('radio', { name: 'Wire', exact: true }).click();
        await page.locator('input[name="diameter"]').fill('0');
        await page.getByRole('button', { name: 'Add material' }).click();
        await expect(page.getByText('Diameter must be greater than 0')).toBeVisible();
        await expect(page.getByText('Please enter the length')).toBeVisible();
        await expect(page).toHaveURL(/\/addMaterial$/);
        expect(await apiGetMaterials(TOKEN)).toHaveLength(0);
    });

    test('submitting an empty wire form asks for the wire and metal type in plain words', async ({
        authenticatedPage: page,
    }) => {
        await page.goto('/addMaterial');
        await page.getByRole('button', { name: 'Add material' }).click();

        await expect(page.getByText('Pick a wire type')).toBeVisible();
        await expect(page.getByText('Pick a metal type')).toBeVisible();
        await expect(page.getByText(/expected one of/i)).toHaveCount(0);
        expect(await apiGetMaterials(TOKEN)).toHaveLength(0);
    });

    test('adding packs at the same price increases stock', async ({ authenticatedPage: page }) => {
        await apiCreateBead(TOKEN, { name: 'Restock Bead', quantity: 100, packs: 1, pricePerPack: 5 });
        await page.goto('/materials');

        await chooseMaterialAction(page, 'Restock Bead', 'Edit');
        const dialog = page.getByRole('dialog', { name: 'Edit material' });
        await dialog.locator('input[name="addPacks"]').fill('2');
        await expect(dialog.getByText('New stock level will be:')).toBeVisible();
        await expect(dialog).toContainText('300');
        await dialog.getByRole('button', { name: 'Save changes' }).click();

        await expect(page.getByRole('alertdialog')).toHaveCount(0);
        await expect(materialRow(page, 'Restock Bead')).toContainText('300');
        const [bead] = await apiGetMaterials(TOKEN);
        expect(bead).toMatchObject({ totalQuantity: 300, pricePerBead: 0.05 });
    });

    test('the Buy menu item opens the purchase URL', async ({ authenticatedPage: page }) => {
        await apiCreateBead(TOKEN, { name: 'Buyable Bead', purchaseUrl: 'http://example.com/buy-me' });
        await page.addInitScript(() => {
            (window as unknown as { opened: unknown[] }).opened = [];
            window.open = (...args: unknown[]) => {
                (window as unknown as { opened: unknown[] }).opened.push(args);

                return null;
            };
        });
        await page.goto('/materials');

        await chooseMaterialAction(page, 'Buyable Bead', 'Buy');
        const opened = await page.evaluate(() => (window as unknown as { opened: unknown[][] }).opened);
        expect(opened).toEqual([['http://example.com/buy-me', '_blank', 'noopener,noreferrer']]);
    });

    test('long names truncate on one line with no horizontal page scroll at phone widths', async ({
        authenticatedPage: page,
    }) => {
        const longName = 'Extra long hand dyed freshwater pearl bead strand with a name that keeps going and going';
        await apiCreateBead(TOKEN, { name: longName });

        for (const width of [360, 412, 1280]) {
            await page.setViewportSize({ width, height: 800 });
            await page.goto('/materials');
            const name = page.getByText(longName).first();
            await expect(name).toBeVisible();
            await expect(name).toHaveAttribute('title', longName);
            await expect(name).toHaveCSS('white-space', 'nowrap');
            await expect(name).toHaveCSS('text-overflow', 'ellipsis');

            const overflow = await page.evaluate(
                () => document.documentElement.scrollWidth - document.documentElement.clientWidth
            );

            expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
        }
    });

    test('the row menu offers Buy, Edit and Delete', async ({ authenticatedPage: page }) => {
        await apiCreateBead(TOKEN, { name: 'Menu Bead' });
        await page.goto('/materials');

        await page.getByRole('button', { name: 'More actions for Menu Bead' }).click();
        await expect(page.getByRole('menuitem', { name: 'Buy' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
    });

    test('search filters materials by name', async ({ authenticatedPage: page }) => {
        await apiCreateBead(TOKEN, { name: 'Ruby Bead' });
        await apiCreateBead(TOKEN, { name: 'Jade Bead' });
        await page.goto('/materials');

        const search = page.getByPlaceholder('Search materials...');
        await search.fill('ruby');
        await expect(materialRow(page, 'Ruby Bead')).toBeVisible();
        await expect(materialRow(page, 'Jade Bead')).toHaveCount(0);

        await search.fill('zzzzzz');
        await expect(page.getByText('No materials found')).toBeVisible();

        await search.fill('');
        await expect(materialRow(page, 'Ruby Bead')).toBeVisible();
        await expect(materialRow(page, 'Jade Bead')).toBeVisible();
    });
});
