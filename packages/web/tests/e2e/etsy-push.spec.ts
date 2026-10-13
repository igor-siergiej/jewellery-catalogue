import type { Page, Request } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_ETSY_PUSH } from './mocks/auth';
import { apiCreateBead, apiCreateDesign, apiSetUserSettings } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_ETSY_PUSH;
test.use({ authToken: TOKEN });

type Etsy = { listingId: number; state: string; lastPushedAt: number | null; pushIncomplete?: boolean };

async function mockConnection(page: Page, connected: boolean) {
    await page.route('**/api/etsy/connection', (route) =>
        route.fulfill({ json: connected ? { connected: true, shopName: 'Test Shop' } : { connected: false } })
    );
}

/** Makes the real design look linked to an Etsy listing, as the push or a status refresh would leave it. */
async function mockLinkedListing(page: Page, designId: string, etsy: Etsy) {
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

/**
 * The Send to Etsy dialog seeds its description from the settings template when it opens, and doesn't re-seed if
 * the settings arrive later, so wait for them before interacting.
 */
async function openDesign(page: Page, designId: string) {
    const settingsLoaded = page.waitForResponse('**/api/user-settings');
    await page.goto(`/designs/${designId}`);
    await settingsLoaded;
}

async function seedDesign(name = 'Amethyst Studs', designType = 'EARRINGS') {
    await apiSetUserSettings(TOKEN, {
        etsyDescriptionTemplate: '{description}\n\nMade with: {materials}',
        etsyTaxonomyMap: { EARRINGS: 1234 },
    });
    const bead = await apiCreateBead(TOKEN, { name: 'Amethyst Bead' });
    return apiCreateDesign(TOKEN, {
        name,
        designType,
        price: 24,
        description: '<p>Purple studs.</p>',
        materials: [{ ...bead, requiredQuantity: 2 }],
    });
}

test.describe
    .serial('Send to Etsy', () => {
        test('is not offered when Etsy is not connected', async ({ authenticatedPage: page }) => {
            const design = await seedDesign();
            await mockConnection(page, false);
            await openDesign(page, design.id);

            await expect(page.getByRole('heading', { level: 1, name: 'Amethyst Studs' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Send to Etsy' })).toHaveCount(0);
        });

        test('pre-fills the listing from the design and settings, then sends it', async ({
            authenticatedPage: page,
        }) => {
            const design = await seedDesign();
            await mockConnection(page, true);
            let pushRequest: Request | undefined;
            await page.route('**/api/designs/*/etsy-push', async (route) => {
                pushRequest = route.request();
                const response = await route.fetch({
                    url: route.request().url().replace('/etsy-push', ''),
                    method: 'GET',
                });
                await route.fulfill({
                    json: { ...(await response.json()), etsy: { listingId: 555, state: 'draft', lastPushedAt: 1 } },
                });
            });
            await openDesign(page, design.id);
            await page.getByRole('button', { name: 'Send to Etsy' }).click();

            const dialog = page.getByRole('dialog', { name: 'Send to Etsy' });
            await expect(dialog.getByLabel('Title')).toHaveValue('Amethyst Studs');
            await expect(dialog.getByLabel('Description')).toHaveValue('Purple studs.\n\nMade with: Amethyst Bead');
            await expect(dialog.getByText('Taxonomy #1234 (set for EARRINGS in Settings)')).toBeVisible();
            await expect(dialog.getByText('1 product photo(s) will be sent.')).toBeVisible();
            await expect(dialog.getByRole('spinbutton')).toHaveValue('24');

            await dialog.getByLabel('Add tag').fill('purple studs');
            await dialog.getByLabel('Add tag').press('Enter');
            await dialog.getByRole('spinbutton').fill('26.5');
            await dialog.getByRole('button', { name: 'Send to Etsy' }).click();

            await expect(dialog).toBeHidden();
            expect(pushRequest?.postDataJSON()).toEqual({
                title: 'Amethyst Studs',
                description: 'Purple studs.\n\nMade with: Amethyst Bead',
                tags: ['purple studs'],
                price: 26.5,
            });
            await expect(page.getByRole('link', { name: 'Draft on Etsy' })).toHaveAttribute(
                'href',
                'https://www.etsy.com/your/shops/me/listing-editor/edit/555'
            );
            await expect(page.getByRole('button', { name: 'Send to Etsy' })).toBeDisabled();
        });

        test('cannot send without a category mapped for the design type', async ({ authenticatedPage: page }) => {
            const design = await seedDesign('Plain Ring', 'RING');
            await mockConnection(page, true);
            await openDesign(page, design.id);
            await page.getByRole('button', { name: 'Send to Etsy' }).click();

            const dialog = page.getByRole('dialog', { name: 'Send to Etsy' });
            await expect(dialog.getByText('No category mapped for this design type')).toBeVisible();
            await expect(dialog.getByRole('button', { name: 'Send to Etsy' })).toBeDisabled();
        });

        test('rejects titles Etsy would refuse', async ({ authenticatedPage: page }) => {
            const design = await seedDesign();
            await mockConnection(page, true);
            await openDesign(page, design.id);
            await page.getByRole('button', { name: 'Send to Etsy' }).click();

            const dialog = page.getByRole('dialog', { name: 'Send to Etsy' });
            await dialog.getByLabel('Title').fill('Studs for £5 ✨');
            await expect(dialog.getByText('Etsy titles can use %, :, & and + once each')).toBeVisible();
            await expect(dialog.getByRole('button', { name: 'Send to Etsy' })).toBeDisabled();

            await dialog.getByLabel('Description').fill('');
            await dialog.getByLabel('Title').fill('Amethyst Studs');
            await expect(dialog.getByRole('button', { name: 'Send to Etsy' })).toBeDisabled();
        });

        test('a failed push keeps the dialog open with an error', async ({ authenticatedPage: page }) => {
            const design = await seedDesign();
            await mockConnection(page, true);
            await page.route('**/api/designs/*/etsy-push', (route) =>
                route.fulfill({ status: 502, json: { message: 'Etsy is down' } })
            );
            await openDesign(page, design.id);
            await page.getByRole('button', { name: 'Send to Etsy' }).click();

            const dialog = page.getByRole('dialog', { name: 'Send to Etsy' });
            await dialog.getByRole('button', { name: 'Send to Etsy' }).click();
            await expect(dialog.locator('p.text-destructive')).toContainText('502');
            await expect(dialog).toBeVisible();
            await expect(dialog.getByLabel('Title')).toHaveValue('Amethyst Studs');
        });

        test('an interrupted push can be resumed, sending only the price', async ({ authenticatedPage: page }) => {
            const design = await seedDesign();
            await mockConnection(page, true);
            await mockLinkedListing(page, design.id, {
                listingId: 777,
                state: 'draft',
                lastPushedAt: null,
                pushIncomplete: true,
            });
            let pushBody: unknown;
            await page.route('**/api/designs/*/etsy-push', (route) => {
                pushBody = route.request().postDataJSON();
                return route.fulfill({ status: 500, json: {} });
            });
            await openDesign(page, design.id);
            await page.getByRole('button', { name: 'Send to Etsy' }).click();

            const dialog = page.getByRole('dialog', { name: 'Send to Etsy' });
            await expect(dialog.getByText('Resuming an interrupted upload')).toBeVisible();
            await expect(dialog.getByLabel('Title')).toBeDisabled();
            await expect(dialog.getByRole('button', { name: 'Generate with AI' })).toBeDisabled();
            await dialog.getByRole('button', { name: 'Send to Etsy' }).click();
            await expect.poll(() => pushBody).toEqual({ price: 24 });
        });

        test('shows the linked listing state from the status refresh', async ({ authenticatedPage: page }) => {
            const design = await seedDesign();
            await mockConnection(page, true);
            await mockLinkedListing(page, design.id, { listingId: 888, state: 'active', lastPushedAt: 1 });
            await openDesign(page, design.id);

            await expect(page.getByRole('link', { name: 'Active on Etsy' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Send to Etsy' })).toHaveAttribute(
                'title',
                'This design is already on Etsy'
            );
        });
    });
