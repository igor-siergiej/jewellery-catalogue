import type { Page, Request } from '@playwright/test';

import { expect, test } from './fixtures';
import { MOCK_TOKEN_SETTINGS } from './mocks/auth';
import { apiCreateBead, apiCreateDesign, apiGetDesigns, apiSetUserSettings } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_SETTINGS;

test.use({ authToken: TOKEN });

const API_URL = process.env.E2E_API_SERVICE_URL || 'http://localhost:3001';

const TAXONOMY = [
    {
        id: 1,
        name: 'Jewelry',
        children: [
            { id: 10, name: 'Rings', children: [] },
            { id: 11, name: 'Earrings', children: [] },
            { id: 12, name: 'Necklaces', children: [] },
            { id: 13, name: 'Bracelets', children: [] },
        ],
    },
];

const SHIPPING_PROFILES = [
    { shippingProfileId: 501, title: 'Royal Mail 1st class' },
    { shippingProfileId: 502, title: 'Tracked 24' },
];

async function getSettings() {
    const res = await fetch(`${API_URL}/api/user-settings`, { headers: { Authorization: `Bearer ${TOKEN}` } });

    return res.json();
}

async function mockConnected(
    page: Page,
    connection: Record<string, unknown> = { connected: true, shopName: 'Bead Shop' }
) {
    await page.route('**/api/etsy/connection', (route) =>
        route.request().method() === 'GET' ? route.fulfill({ json: connection }) : route.fallback()
    );
    await page.route('**/api/etsy/taxonomy', (route) => route.fulfill({ json: TAXONOMY }));
    await page.route('**/api/etsy/shipping-profiles', (route) => route.fulfill({ json: SHIPPING_PROFILES }));
}

test.describe.serial('Settings', () => {
    test('saving pricing persists across reload, with no designs to reprice', async ({ authenticatedPage: page }) => {
        await apiSetUserSettings(TOKEN, { hourlyWage: 10, profitMargin: 10 });
        await page.goto('/settings');

        await expect(page.getByLabel('Hourly wage')).toHaveValue('10');
        await page.getByLabel('Hourly wage').fill('18.5');
        await page.getByLabel('Profit margin').fill('35');
        await page.getByLabel('Etsy price suggestion: markup multiplier').fill('2.5');
        await page.getByLabel('Etsy price suggestion: hourly rate').fill('15');
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(page.getByText('Saved.')).toBeVisible();

        await page.reload();
        await expect(page.getByLabel('Hourly wage')).toHaveValue('18.5');
        await expect(page.getByLabel('Profit margin')).toHaveValue('35');
        await expect(page.getByLabel('Etsy price suggestion: markup multiplier')).toHaveValue('2.5');
        await expect(page.getByLabel('Etsy price suggestion: hourly rate')).toHaveValue('15');
        expect(await getSettings()).toMatchObject({
            hourlyWage: 18.5,
            profitMargin: 35,
            markupMultiplier: 2.5,
            hourlyRate: 15,
        });
    });

    test('changing hourly wage then Save asks before repricing, and Save without updating keeps prices', async ({
        authenticatedPage: page,
    }) => {
        await apiSetUserSettings(TOKEN, { hourlyWage: 10, profitMargin: 10 });
        const bead = await apiCreateBead(TOKEN, { name: 'Keep Bead', quantity: 100, pricePerPack: 5 });
        await apiCreateDesign(TOKEN, {
            name: 'Kept Ring',
            timeRequired: '0:30',
            materials: [{ ...bead, requiredQuantity: 10 }],
            totalMaterialCosts: 0.5,
            price: 1,
        });
        await page.goto('/settings');

        await page.getByLabel('Hourly wage').fill('20');
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        const confirm = page.getByRole('alertdialog', { name: 'Update prices for 1 design?' });
        await expect(confirm).toBeVisible();
        await confirm.getByRole('button', { name: 'Save without updating' }).click();
        await expect(page.getByText('Saved.')).toBeVisible();

        expect(await getSettings()).toMatchObject({ hourlyWage: 20 });
        const [design] = await apiGetDesigns(TOKEN);
        expect(design.price).toBe(1);
    });

    test('Update prices in the confirm reprices every design', async ({ authenticatedPage: page }) => {
        await apiSetUserSettings(TOKEN, { hourlyWage: 10, profitMargin: 10 });
        const bead = await apiCreateBead(TOKEN, { name: 'Price Bead', quantity: 100, pricePerPack: 5 });
        await apiCreateDesign(TOKEN, {
            name: 'Repriced Ring',
            timeRequired: '0:30',
            materials: [{ ...bead, requiredQuantity: 10 }],
            totalMaterialCosts: 0.5,
            price: 1,
        });
        await page.goto('/settings');

        await page.getByLabel('Hourly wage').fill('20');
        await page.getByLabel('Profit margin').fill('50');
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await page
            .getByRole('alertdialog', { name: 'Update prices for 1 design?' })
            .getByRole('button', { name: 'Update prices' })
            .click();
        await expect(page.getByText('Updated 1 of 1 design')).toBeVisible();

        // (£0.50 materials + 30 min × £20) × 1.5
        const [design] = await apiGetDesigns(TOKEN);
        expect(design.price).toBe(15.75);
    });

    test('Save with no change to wage or margin saves without asking', async ({ authenticatedPage: page }) => {
        await apiSetUserSettings(TOKEN, { hourlyWage: 10, profitMargin: 10 });
        await apiCreateDesign(TOKEN, { name: 'Unasked Ring', price: 1 });
        await page.goto('/settings');

        await page.getByLabel('Etsy price suggestion: markup multiplier').fill('3');
        await page.getByRole('button', { name: 'Save', exact: true }).click();

        await expect(page.getByText('Saved.')).toBeVisible();
        await expect(page.getByRole('alertdialog')).toHaveCount(0);
        expect(await getSettings()).toMatchObject({ markupMultiplier: 3 });
    });

    test('connect Etsy goes to the authorisation URL', async ({ authenticatedPage: page }) => {
        await page.route('**/api/etsy/connection', (route) => route.fulfill({ json: { connected: false } }));
        await page.route('**/api/etsy/oauth/start', (route) =>
            route.fulfill({ json: { url: 'http://localhost:3000/settings?etsy=connected' } })
        );
        await page.goto('/settings');

        await page.getByRole('button', { name: 'Connect Etsy' }).click();
        await expect(page.getByText('Etsy connected successfully.')).toBeVisible();
        // The result param is stripped once read
        await expect(page).toHaveURL(/\/settings$/);
    });

    test('a failed Etsy authorisation shows an error', async ({ authenticatedPage: page }) => {
        await page.route('**/api/etsy/connection', (route) => route.fulfill({ json: { connected: false } }));
        await page.goto('/settings?etsy=error');
        await expect(page.getByText('Failed to connect to Etsy. Please try again.')).toBeVisible();
    });

    test('disconnecting Etsy hides the Etsy defaults', async ({ authenticatedPage: page }) => {
        await mockConnected(page);
        let disconnected = false;
        await page.route('**/api/etsy/connection', (route) => {
            if (route.request().method() !== 'DELETE') return route.fallback();
            disconnected = true;

            return route.fulfill({ json: { ok: true } });
        });
        await page.goto('/settings');

        await expect(page.getByText('Bead Shop')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Etsy defaults' })).toBeVisible();
        await page.getByRole('button', { name: 'Disconnect' }).click();

        await expect(page.getByRole('button', { name: 'Connect Etsy' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Etsy defaults' })).toHaveCount(0);
        expect(disconnected).toBe(true);
    });

    test('a broken connection offers to reconnect', async ({ authenticatedPage: page }) => {
        await mockConnected(page, { connected: true, shopName: 'Bead Shop', broken: true });
        let started: Request | undefined;
        await page.route('**/api/etsy/oauth/start', (route) => {
            started = route.request();

            return route.fulfill({ json: { url: 'http://localhost:3000/settings' } });
        });
        await page.goto('/settings');

        await expect(page.getByText('Etsy connection needs to be re-authorized.')).toBeVisible();
        await page.getByRole('button', { name: 'Reconnect Etsy' }).click();
        await expect.poll(() => started).toBeDefined();
    });

    test('Etsy defaults are saved with the pricing settings', async ({ authenticatedPage: page }) => {
        await apiSetUserSettings(TOKEN, { etsyTaxonomyMap: {} });
        await mockConnected(page);
        await page.goto('/settings');

        // Unmapped types default to the category with the same name
        await expect(page.getByLabel('Etsy category for Rings')).toHaveText('Jewelry > Rings');
        await expect(page.getByLabel('Etsy category for Ear cuffs')).toHaveText('Jewelry > Earrings');
        await expect(page.getByText('Your shop has multiple shipping profiles')).toBeVisible();

        await page.getByLabel('Description template').fill('{description}\n\nMaterials: {materials}');
        await page.getByLabel('Etsy category for Rings').click();
        await page.getByRole('option', { name: 'Jewelry > Bracelets' }).click();
        await page.getByLabel('Shipping profile').click();
        await page.getByRole('option', { name: 'Tracked 24' }).click();
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(page.getByText('Saved.')).toBeVisible();

        expect(await getSettings()).toMatchObject({
            etsyDescriptionTemplate: '{description}\n\nMaterials: {materials}',
            etsyTaxonomyMap: { RING: 13, EARRINGS: 11, EARCUFF: 11, NECKLACE: 12, BRACELET: 13 },
            etsyShippingProfileId: 502,
        });

        await page.reload();
        await expect(page.getByLabel('Etsy category for Rings')).toHaveText('Jewelry > Bracelets');
        await expect(page.getByLabel('Shipping profile')).toHaveText('Tracked 24');
    });

    test('checking for updates while offline says it cannot check', async ({ authenticatedPage: page }) => {
        await page.goto('/settings');
        const check = page.getByRole('button', { name: 'Check for updates' });
        await expect(check).toBeEnabled();

        await page.context().setOffline(true);
        await check.click();

        await expect(page.getByRole('status')).toHaveText('Could not check for updates. Try again when online.');
        await expect(page.getByRole('button', { name: 'Update now' })).toHaveCount(0);
        await page.context().setOffline(false);
    });
});
