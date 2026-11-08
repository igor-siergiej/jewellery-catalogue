import type { Page } from '@playwright/test';
import { expect } from './fixtures';
import { MOCK_TOKEN_VISUAL_VIEW_DESIGN_DESKTOP, MOCK_TOKEN_VISUAL_VIEW_DESIGN_MOBILE } from './mocks/auth';
import { apiCreateBead, apiCreateDesign, apiSetUserSettings } from './utils/api-helpers';
import { expectNoHorizontalScroll, settle, visualTest } from './utils/visual-helpers';

const test = visualTest({
    mobile: MOCK_TOKEN_VISUAL_VIEW_DESIGN_MOBILE,
    desktop: MOCK_TOKEN_VISUAL_VIEW_DESIGN_DESKTOP,
});

// The added date comes from the server clock, so it is masked to keep baselines stable across months
const dateAdded = (page: Page) => page.getByText('Added', { exact: true }).locator('xpath=following-sibling::*[1]');

async function seedSimpleDesign(token: string) {
    const bead = await apiCreateBead(token, { name: 'Visual Design Bead' });
    return apiCreateDesign(token, {
        name: 'Visual Detail Necklace',
        designType: 'NECKLACE',
        timeRequired: '00:30',
        price: 32,
        description: '<p>A delicate beaded necklace</p>',
        materials: [{ ...bead, requiredQuantity: 10 }],
        totalMaterialCosts: 5,
        lowStockThreshold: 2,
    });
}

/** Makes the design look linked to a live Etsy listing, as a push or status refresh would leave it. */
async function mockLinkedListing(page: Page, designId: string) {
    const etsy = { listingId: 4242, state: 'active', lastPushedAt: 1735689600000 };
    await page.route('**/api/etsy/connection', (route) =>
        route.fulfill({ json: { connected: true, shopName: 'Visual Bead Shop' } })
    );
    await page.route(new RegExp(`/api/designs/${designId}$`), async (route) => {
        if (route.request().method() !== 'GET') return route.continue();
        const response = await route.fetch();
        await route.fulfill({ response, json: { ...(await response.json()), etsy } });
    });
    await page.route(`**/api/designs/${designId}/etsy-status`, async (route) => {
        const response = await route.fetch({ url: route.request().url().replace('/etsy-status', ''), method: 'GET' });
        await route.fulfill({ json: { ...(await response.json()), etsy } });
    });
}

test.describe('View design page visual regression', () => {
    test.describe.configure({ mode: 'serial' });

    test('populated state', async ({ authenticatedPage: page, authToken }) => {
        const bead = await apiCreateBead(authToken, { name: 'Visual Design Bead' });
        const design = await apiCreateDesign(authToken, {
            name: 'Visual Detail Necklace',
            price: 32,
            description: 'A delicate beaded necklace',
            materials: [{ ...bead, requiredQuantity: 10 }],
            totalMaterialCosts: 5,
        });
        await page.goto(`/designs/${design.id}`);
        await expect(page.getByText('Visual Detail Necklace').first()).toBeVisible({ timeout: 10000 });
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('view-design-populated.png', { fullPage: true, mask: [dateAdded(page)] });
    });

    test('variant design', async ({ authenticatedPage: page, authToken }) => {
        const amethyst = await apiCreateBead(authToken, { name: 'Visual Amethyst', quantity: 20, pricePerPack: 10 });
        const quartz = await apiCreateBead(authToken, { name: 'Visual Quartz', quantity: 4, pricePerPack: 4 });
        const design = await apiCreateDesign(authToken, {
            name: 'Visual Gem Drops',
            designType: 'EARRINGS',
            variationGroups: [
                {
                    id: 'vg-1',
                    name: 'Gemstone',
                    required: 2,
                    options: [
                        { id: 'opt-1', material: { ...amethyst, requiredQuantity: 2 } },
                        { id: 'opt-2', material: { ...quartz, requiredQuantity: 2 } },
                    ],
                },
            ],
            variants: [
                {
                    id: 'v-1',
                    optionIds: ['opt-1'],
                    name: 'Visual Amethyst',
                    totalQuantity: 3,
                    totalMaterialCosts: 1,
                    price: 9,
                },
                {
                    id: 'v-2',
                    optionIds: ['opt-2'],
                    name: 'Visual Quartz',
                    totalQuantity: 0,
                    totalMaterialCosts: 0.4,
                    price: 8,
                },
            ],
        });
        await page.goto(`/designs/${design.id}`);
        await expect(page.getByRole('row', { name: /Visual Quartz/ })).toBeVisible({ timeout: 10000 });
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('view-design-variants.png', { fullPage: true, mask: [dateAdded(page)] });
    });

    test('linked to Etsy', async ({ authenticatedPage: page, authToken }) => {
        const design = await seedSimpleDesign(authToken);
        await mockLinkedListing(page, design.id);
        await page.goto(`/designs/${design.id}`);
        await expect(page.getByRole('button', { name: 'Send to Etsy' })).toBeVisible({ timeout: 10000 });
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('view-design-etsy-linked.png', { fullPage: true, mask: [dateAdded(page)] });
    });

    test('edit dialog', async ({ authenticatedPage: page, authToken }) => {
        const design = await seedSimpleDesign(authToken);
        await page.goto(`/designs/${design.id}`);
        await page.getByRole('button', { name: 'Edit Details' }).click();
        const dialog = page.getByRole('dialog', { name: 'Edit Design Properties' });
        await expect(dialog.locator('.ProseMirror')).toHaveText('A delicate beaded necklace');
        await settle(page);
        await expect(dialog).toHaveScreenshot('view-design-edit-dialog.png');
    });

    test('inventory dialog', async ({ authenticatedPage: page, authToken }) => {
        const design = await seedSimpleDesign(authToken);
        await page.goto(`/designs/${design.id}`);
        await page.getByRole('button', { name: 'Manage Inventory' }).click();
        const dialog = page.getByRole('dialog', { name: 'Manage Design Inventory' });
        await expect(dialog).toBeVisible();
        await settle(page);
        await expect(dialog).toHaveScreenshot('view-design-inventory-dialog.png');
    });

    test('send to Etsy dialog', async ({ authenticatedPage: page, authToken }) => {
        await apiSetUserSettings(authToken, {
            etsyDescriptionTemplate: '{description}\n\nMade with: {materials}',
            etsyTaxonomyMap: { NECKLACE: 1234 },
        });
        const design = await seedSimpleDesign(authToken);
        await page.route('**/api/etsy/connection', (route) =>
            route.fulfill({ json: { connected: true, shopName: 'Visual Bead Shop' } })
        );
        const settingsLoaded = page.waitForResponse('**/api/user-settings');
        await page.goto(`/designs/${design.id}`);
        await settingsLoaded;
        await page.getByRole('button', { name: 'Send to Etsy' }).click();
        const dialog = page.getByRole('dialog', { name: 'Send to Etsy' });
        await expect(dialog.getByLabel('Title')).toHaveValue('Visual Detail Necklace');
        await settle(page);
        await expect(dialog).toHaveScreenshot('view-design-etsy-dialog.png');
    });
});
