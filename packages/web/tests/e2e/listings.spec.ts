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
        linkedDesignId: null,
    },
    { listingId: 2, title: 'Gold Hoop Earrings', price: 18.5, url: 'https://etsy.com/listing/2', linkedDesignId: null },
    {
        listingId: 3,
        title: 'Beaded Charm Bracelet',
        price: 12.0,
        url: 'https://etsy.com/listing/3',
        linkedDesignId: null,
    },
];

async function mockConnectedListings(page: Page) {
    await page.route('**/api/etsy/connection', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: true }) })
    );
    await page.route('**/api/etsy/listings', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LISTINGS) })
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
});
