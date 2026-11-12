import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { MOCK_TOKEN_LISTINGS_RECONCILE } from './mocks/auth';
import { apiCreateDesign } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_LISTINGS_RECONCILE;

test.use({ authToken: TOKEN });

type Listing = {
    listingId: number;
    title: string;
    price: number;
    url: string;
    state: string;
    imageUrl: string | null;
    linkedDesignId: string | null;
};

const listing = (listingId: number, title: string, linkedDesignId: string | null = null): Listing => ({
    listingId,
    title,
    price: 20,
    url: `https://etsy.com/listing/${listingId}`,
    state: 'active',
    imageUrl: null,
    linkedDesignId,
});

/**
 * Stands in for Etsy: listings come from `listings`, and the reconcile endpoints (which call Etsy) update it the
 * way the server would. Created designs are real, so the app can navigate to them.
 */
async function mockShop(page: Page, listings: Listing[]) {
    const linkRequests: unknown[] = [];
    await page.route('**/api/etsy/connection', (route) =>
        route.fulfill({ json: { connected: true, shopName: 'Test Shop' } })
    );
    await page.route('**/api/etsy/listings', (route) => route.fulfill({ json: listings }));
    await page.route('**/api/etsy/sales/unmatched', (route) => route.fulfill({ json: [] }));
    await page.route('**/api/etsy/reconcile/create', async (route) => {
        const { listingId } = route.request().postDataJSON();
        const target = listings.find((l) => l.listingId === listingId);

        if (!target) return route.fulfill({ status: 404, json: {} });
        const design = await apiCreateDesign(TOKEN, { name: target.title, price: target.price });
        target.linkedDesignId = design.id;

        return route.fulfill({ json: { designId: design.id } });
    });
    await page.route('**/api/etsy/reconcile/link', (route) => {
        const body = route.request().postDataJSON();
        linkRequests.push(body);
        const target = listings.find((l) => l.listingId === body.listingId);

        if (target) target.linkedDesignId = body.designId;

        return route.fulfill({ json: { ok: true } });
    });

    return { linkRequests };
}

test.describe.serial('Listings reconcile', () => {
    test('creating a design from a listing opens the new design and links the row', async ({
        authenticatedPage: page,
    }) => {
        await mockShop(page, [listing(11, 'Moonstone Ring')]);
        await page.goto('/listings');

        const row = page.getByRole('row', { name: /Moonstone Ring/ });
        await expect(row).toContainText('£20.00');
        await row.getByRole('button', { name: 'More actions for Moonstone Ring' }).click();
        await page.getByRole('menuitem', { name: 'Create design' }).click();

        await expect(page).toHaveURL(/\/designs\/[a-z0-9]+$/);
        await expect(page.getByRole('heading', { level: 1, name: 'Moonstone Ring' })).toBeVisible();

        await page.goto('/listings');
        const linkedRow = page.getByRole('row', { name: /Moonstone Ring/ });
        await expect(linkedRow.getByRole('link', { name: 'Moonstone Ring' })).toBeVisible();
        await expect(linkedRow.getByText('Not linked')).toHaveCount(0);
        await expect(linkedRow.getByRole('button', { name: /More actions/ })).toHaveCount(0);
    });

    test('linking an existing design only offers unlinked designs', async ({ authenticatedPage: page }) => {
        const ring = await apiCreateDesign(TOKEN, { name: 'Handmade Ring' });
        await apiCreateDesign(TOKEN, { name: 'Handmade Bangle' });
        const { linkRequests } = await mockShop(page, [listing(21, 'Etsy Ring Listing')]);
        await page.goto('/listings');

        await page
            .getByRole('row', { name: /Etsy Ring Listing/ })
            .getByRole('button', { name: 'Link', exact: true })
            .click();
        const dialog = page.getByRole('dialog', { name: 'Link an existing design' });
        await expect(dialog.getByText('Handmade Ring')).toBeVisible();
        await expect(dialog.getByText('Handmade Bangle')).toBeVisible();

        await dialog.getByRole('searchbox', { name: 'Search designs' }).fill('ring');
        await expect(dialog.getByText('Handmade Bangle')).toHaveCount(0);
        await dialog.getByRole('button', { name: 'Link Handmade Ring' }).click();

        await expect(dialog).toBeHidden();
        expect(linkRequests).toEqual([{ listingId: 21, designId: ring.id }]);

        const linkedCell = page
            .getByRole('row', { name: /Etsy Ring Listing/ })
            .getByRole('link', { name: 'Handmade Ring' });

        await expect(linkedCell).toBeVisible();
        await linkedCell.click();
        await expect(page).toHaveURL(`/designs/${ring.id}`);
    });

    test('shows when there are no unlinked designs to link', async ({ authenticatedPage: page }) => {
        const listed = await apiCreateDesign(TOKEN, { name: 'Already Listed' });
        await mockShop(page, [listing(31, 'Lonely Listing')]);
        await page.route(/\/api\/designs$/, (route) =>
            route.request().method() === 'GET'
                ? route.fulfill({
                      json: [{ ...listed, etsy: { listingId: 99, state: 'active', lastPushedAt: 1 } }],
                  })
                : route.fallback()
        );
        await page.goto('/listings');

        await page.getByRole('button', { name: 'Link', exact: true }).click();
        await expect(page.getByText('No unlinked designs available.')).toBeVisible();
    });

    test('a shop with no listings shows the empty state', async ({ authenticatedPage: page }) => {
        await mockShop(page, []);
        await page.goto('/listings');
        await expect(page.getByText('No listings', { exact: true })).toBeVisible();
        await expect(page.getByText('0 listings on Etsy')).toBeVisible();
    });

    test('without an Etsy connection the page links to Settings', async ({ authenticatedPage: page }) => {
        await page.route('**/api/etsy/connection', (route) => route.fulfill({ json: { connected: false } }));
        await page.goto('/listings');

        await expect(page.getByText('Etsy is not connected')).toBeVisible();
        await page.getByRole('link', { name: 'Connect your Etsy shop' }).click();
        await expect(page).toHaveURL(/\/settings$/);
    });

    test('each listing links out to Etsy', async ({ authenticatedPage: page }) => {
        await mockShop(page, [listing(41, 'Outbound Listing')]);
        await page.goto('/listings');
        const link = page.getByRole('row', { name: /Outbound Listing/ }).getByRole('link', { name: 'View on Etsy' });
        await expect(link).toHaveAttribute('href', 'https://etsy.com/listing/41');
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
});
