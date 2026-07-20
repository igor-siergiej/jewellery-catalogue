import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_LISTINGS } from './mocks/auth';

const TOKEN = MOCK_TOKEN_LISTINGS;

test.use({ authToken: TOKEN });

const LISTINGS = [
    {
        listingId: 1,
        title: 'Silver Moon Pendant Necklace',
        price: 24.99,
        url: 'https://etsy.com/listing/1',
        state: 'active',
        imageUrl: null,
        linkedDesignId: null,
    },
    {
        listingId: 2,
        title: 'Gold Hoop Earrings',
        price: 18.5,
        url: 'https://etsy.com/listing/2',
        state: 'active',
        imageUrl: null,
        linkedDesignId: null,
    },
    {
        listingId: 3,
        title: 'Beaded Charm Bracelet',
        price: 12.0,
        url: 'https://etsy.com/listing/3',
        state: 'active',
        imageUrl: null,
        linkedDesignId: null,
    },
];

const SOLD_OUT_LISTING = {
    listingId: 4,
    title: 'Vintage Rose Brooch',
    price: 32.0,
    url: 'https://etsy.com/listing/4',
    state: 'sold_out',
    imageUrl: 'https://i.etsy.com/4-75x75.jpg',
    linkedDesignId: null,
};

async function mockConnectedListings(page: Page, extra: unknown[] = []) {
    await page.route('**/api/etsy/connection', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: true }) })
    );
    await page.route('**/api/etsy/listings', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([...LISTINGS, ...extra]),
        })
    );
}

test.describe('Etsy Listings search', () => {
    test('search filters listings by title, clearing restores full list @smoke', async ({
        authenticatedPage: page,
    }) => {
        await mockConnectedListings(page);

        await page.goto('/listings');
        await page.waitForLoadState('networkidle');

        for (const listing of LISTINGS) {
            await expect(page.getByText(listing.title)).toBeVisible({ timeout: 10000 });
        }

        await page.getByPlaceholder('Search listings...').fill('Hoop');

        await expect(page.getByText('Gold Hoop Earrings')).toBeVisible();
        await expect(page.getByText('Silver Moon Pendant Necklace')).not.toBeVisible();
        await expect(page.getByText('Beaded Charm Bracelet')).not.toBeVisible();

        await page.getByPlaceholder('Search listings...').fill('');

        for (const listing of LISTINGS) {
            await expect(page.getByText(listing.title)).toBeVisible({ timeout: 10000 });
        }
    });

    test('search with no matches shows empty state', async ({ authenticatedPage: page }) => {
        await mockConnectedListings(page);

        await page.goto('/listings');
        await page.waitForLoadState('networkidle');

        await page.getByPlaceholder('Search listings...').fill('nonexistent listing xyz');

        await expect(page.getByText('No Matching Listings')).toBeVisible({ timeout: 10000 });
    });

    test('sold-out listing shows a "Sold out" badge and its image', async ({ authenticatedPage: page }) => {
        await mockConnectedListings(page, [SOLD_OUT_LISTING]);

        await page.goto('/listings');
        await page.waitForLoadState('networkidle');

        const soldOutRow = page.locator('tr').filter({ hasText: SOLD_OUT_LISTING.title });
        await expect(soldOutRow).toBeVisible({ timeout: 10000 });
        await expect(soldOutRow.getByText('Sold out')).toBeVisible();
        await expect(soldOutRow.locator('img')).toHaveAttribute('src', SOLD_OUT_LISTING.imageUrl);

        const activeRow = page.locator('tr').filter({ hasText: 'Silver Moon Pendant Necklace' });
        await expect(activeRow.getByText('Sold out')).not.toBeVisible();
    });
});
