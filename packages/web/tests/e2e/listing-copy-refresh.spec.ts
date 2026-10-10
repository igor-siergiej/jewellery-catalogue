import { expect, test } from './fixtures';
import { MOCK_TOKEN_LISTING_REFRESH } from './mocks/auth';

test.use({ authToken: MOCK_TOKEN_LISTING_REFRESH });

const listing = (listingId: number, title: string, linkedDesignId: string | null) => ({
    listingId,
    title,
    price: 20,
    url: `https://etsy.com/listing/${listingId}`,
    state: 'active',
    imageUrl: null,
    linkedDesignId,
});

test('bulk refresh generates per listing, survives a failure, and only updates Etsy on accept', async ({
    authenticatedPage: page,
}) => {
    await page.route('**/api/etsy/connection', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: true }) })
    );
    await page.route('**/api/etsy/listings', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                listing(1, 'Old Opal Ring', 'd1'),
                listing(2, 'Old Moon Pendant', 'd2'),
                listing(3, 'Unlinked Brooch', null),
            ]),
        })
    );
    await page.route('**/api/etsy/listings/*/copy/propose', (route) => {
        const listingId = Number(
            route
                .request()
                .url()
                .match(/listings\/(\d+)\//)?.[1]
        );
        if (listingId === 2) {
            return route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"fal down"}' });
        }
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                listingId,
                designId: 'd1',
                designName: 'Opal Ring',
                current: { title: 'Old Opal Ring', description: 'Old words', tags: ['old tag'] },
                proposed: { title: 'Opal Ring in Sterling Silver', description: 'New words', tags: ['opal ring'] },
            }),
        });
    });
    const applied: unknown[] = [];
    await page.route('**/api/etsy/listings/*/copy', (route) => {
        applied.push(route.request().postDataJSON());
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"updated":true}' });
    });

    await page.goto('/listings');
    await page.getByRole('button', { name: 'Refresh listing copy with AI' }).click();
    const panel = page.getByTestId('listing-copy-refresh');

    // Only linked listings can be refreshed.
    await expect(panel.getByLabel('Select Unlinked Brooch')).toHaveCount(0);
    await panel.getByLabel('Select Old Opal Ring').click();
    await panel.getByLabel('Select Old Moon Pendant').click();
    await panel.getByRole('button', { name: 'Generate new copy (2)' }).click();

    const items = panel.getByTestId('listing-refresh-item');
    await expect(items.filter({ hasText: 'Old Moon Pendant' })).toContainText('Failed');
    const opal = items.filter({ hasText: 'Old Opal Ring' });
    await expect(opal).toContainText('Ready to review');
    await expect(opal).toContainText('Old words');
    await expect(opal).toContainText('Opal Ring in Sterling Silver');
    expect(applied).toHaveLength(0);

    await opal.getByRole('button', { name: 'Accept and update Etsy' }).click();
    await expect(opal).toContainText('Updated on Etsy');
    expect(applied).toEqual([{ title: 'Opal Ring in Sterling Silver', description: 'New words', tags: ['opal ring'] }]);
});
