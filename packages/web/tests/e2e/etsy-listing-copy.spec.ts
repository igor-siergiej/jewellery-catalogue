// packages/web/tests/e2e/etsy-listing-copy.spec.ts
import type { Page, Request } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_ETSY_LISTING_COPY } from './mocks/auth';
import { apiCreateDesign } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_ETSY_LISTING_COPY;
test.use({ authToken: TOKEN });

const GENERATED = {
    title: 'Silver Wire Wrapped Amethyst Drop Earrings, Purple Boho Gift for Her',
    description: 'Handmade purple drop earrings.\n\nCare: keep dry.',
    tags: ['amethyst earrings', 'purple drop earrings', 'gift for her'],
};

async function mockEtsyReady(page: Page) {
    await page.route('**/api/etsy/connection', (route) =>
        route.fulfill({ json: { connected: true, shopName: 'Test Shop' } })
    );
    await page.route('**/api/user-settings', (route) =>
        route.request().method() === 'GET'
            ? route.fulfill({
                  json: {
                      userId: 'x',
                      hourlyWage: 10,
                      profitMargin: 10,
                      markupMultiplier: 2,
                      hourlyRate: 0,
                      etsyDescriptionTemplate: 'TEMPLATE: {description}',
                      etsyTaxonomyMap: { EARRINGS: 1234 },
                      etsyShippingProfileId: null,
                  },
              })
            : route.continue()
    );
}

async function openPushDialog(page: Page, name: string) {
    const design = await apiCreateDesign(TOKEN, { name, price: 20, designType: 'EARRINGS' });
    await page.goto(`/designs/${design.id}`);
    await page.getByRole('button', { name: 'Send to Etsy' }).click();
    return page.getByRole('dialog');
}

test.describe('Etsy listing copy', () => {
    test('generated copy is editable and the edits are what gets pushed', async ({ authenticatedPage: page }) => {
        await mockEtsyReady(page);
        await page.route('**/api/designs/*/etsy-listing/generate', (route) => route.fulfill({ json: GENERATED }));
        let pushRequest: Request | undefined;
        await page.route('**/api/designs/*/etsy-push', async (route) => {
            pushRequest = route.request();
            await route.fulfill({ json: { error: 'stop here' }, status: 500 });
        });

        const dialog = await openPushDialog(page, 'Copy Gen Earrings');
        await expect(dialog.getByLabel('Title')).toHaveValue('Copy Gen Earrings');

        await dialog.getByRole('button', { name: 'Generate with AI' }).click();
        await expect(dialog.getByLabel('Title')).toHaveValue(GENERATED.title);
        await expect(dialog.getByLabel('Description')).toHaveValue(GENERATED.description);
        await expect(dialog.getByText('3/13')).toBeVisible();

        await dialog.getByLabel('Title').fill('Amethyst Drop Earrings');
        await dialog.getByRole('button', { name: 'Remove tag gift for her' }).click();
        await dialog.getByLabel('Add tag').fill('Boho Jewellery');
        await dialog.getByLabel('Add tag').press('Enter');

        await dialog.getByRole('button', { name: 'Send to Etsy' }).click();
        await expect.poll(() => pushRequest).toBeDefined();
        expect(pushRequest?.postDataJSON()).toMatchObject({
            title: 'Amethyst Drop Earrings',
            description: GENERATED.description,
            tags: ['amethyst earrings', 'purple drop earrings', 'boho jewellery'],
            price: 20,
        });
    });

    test('a failed generation shows an error and keeps the template text', async ({ authenticatedPage: page }) => {
        await mockEtsyReady(page);
        await page.route('**/api/designs/*/etsy-listing/generate', (route) =>
            route.fulfill({ status: 503, json: { message: 'AI generation is not configured' } })
        );

        const dialog = await openPushDialog(page, 'Copy Gen Failure');
        await dialog.getByRole('button', { name: 'Generate with AI' }).click();

        await expect(dialog.getByText("AI features aren't set up yet")).toBeVisible();
        await expect(dialog.getByLabel('Title')).toHaveValue('Copy Gen Failure');
        await expect(dialog.getByLabel('Description')).toHaveValue(/^TEMPLATE:/);
    });
});
