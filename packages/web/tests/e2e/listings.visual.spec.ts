import { expect } from './fixtures';
import { MOCK_TOKEN_VISUAL_LISTINGS_DESKTOP, MOCK_TOKEN_VISUAL_LISTINGS_MOBILE } from './mocks/auth';
import { expectNoHorizontalScroll, settle, visualTest } from './utils/visual-helpers';

const test = visualTest({ mobile: MOCK_TOKEN_VISUAL_LISTINGS_MOBILE, desktop: MOCK_TOKEN_VISUAL_LISTINGS_DESKTOP });

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
        title: 'Vintage Rose Brooch',
        price: 32,
        url: 'https://etsy.com/listing/3',
        state: 'sold_out',
        imageUrl: null,
        linkedDesignId: null,
    },
];

test.describe('Listings page visual regression', () => {
    test.describe.configure({ mode: 'serial' });

    test('populated state', async ({ authenticatedPage: page }) => {
        await page.route('**/api/etsy/connection', (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: true }) })
        );
        await page.route('**/api/etsy/listings', (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LISTINGS) })
        );
        await page.goto('/listings');
        await expect(page.getByText('Gold Hoop Earrings')).toBeVisible({ timeout: 10000 });
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('listings-populated.png', { fullPage: true });
    });

    test('not connected state', async ({ authenticatedPage: page }) => {
        await page.route('**/api/etsy/connection', (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: false }) })
        );
        await page.goto('/listings');
        await page.waitForLoadState('networkidle');
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('listings-disconnected.png', { fullPage: true });
    });
});
