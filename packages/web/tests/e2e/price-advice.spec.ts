import { expect, test } from './fixtures';
import { MOCK_TOKEN_PRICE_ADVICE } from './mocks/auth';
import { apiCleanup, apiCreateBead, apiCreateDesign } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_PRICE_ADVICE;

test.use({ authToken: TOKEN });

test.describe
    .serial('AI price range on the design page', () => {
        test.beforeEach(async () => {
            await apiCleanup(TOKEN);
        });

        test.afterAll(async () => {
            await apiCleanup(TOKEN);
        });

        test('is only fetched on request, and shows the range next to the formula price', async ({
            authenticatedPage: page,
        }) => {
            const bead = await apiCreateBead(TOKEN, { name: 'Price Bead' });
            const design = await apiCreateDesign(TOKEN, {
                name: 'Price Ring',
                materials: [{ ...bead, requiredQuantity: 1 }],
            });
            let requests = 0;
            await page.route('**/api/designs/*/price-suggestion', (route) => {
                requests++;
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        low: 24,
                        high: 32,
                        recommended: 28,
                        rationale: 'Comparable rings sell steadily at £30.',
                        formulaPrice: 26.5,
                        materialCost: 4,
                    }),
                });
            });

            await page.goto(`/designs/${design.id}`);
            await expect(page.getByRole('button', { name: 'Ask AI for a price range' })).toBeVisible();
            expect(requests).toBe(0);

            await page.getByRole('button', { name: 'Ask AI for a price range' }).click();

            const advice = page.getByTestId('price-advice');
            await expect(advice).toContainText('£24.00 – £32.00');
            await expect(advice).toContainText('(suggests £28.00)');
            await expect(advice).toContainText('Comparable rings sell steadily at £30.');
            await expect(advice).toContainText('Your formula price is £26.50');
        });

        test('explains when AI is not set up', async ({ authenticatedPage: page }) => {
            const bead = await apiCreateBead(TOKEN, { name: 'Price Bead' });
            const design = await apiCreateDesign(TOKEN, {
                name: 'Price Ring',
                materials: [{ ...bead, requiredQuantity: 1 }],
            });
            await page.route('**/api/designs/*/price-suggestion', (route) =>
                route.fulfill({
                    status: 503,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'AI generation is not configured' }),
                })
            );

            await page.goto(`/designs/${design.id}`);
            await page.getByRole('button', { name: 'Ask AI for a price range' }).click();

            await expect(page.getByText("AI features aren't set up yet.")).toBeVisible();
        });

        test('explains the usage limit when the API returns 429', async ({ authenticatedPage: page }) => {
            const bead = await apiCreateBead(TOKEN, { name: 'Price Bead' });
            const design = await apiCreateDesign(TOKEN, {
                name: 'Price Ring',
                materials: [{ ...bead, requiredQuantity: 1 }],
            });
            await page.route('**/api/designs/*/price-suggestion', (route) =>
                route.fulfill({
                    status: 429,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'AI limit reached: 20 requests per hour. Try again later.' }),
                })
            );

            await page.goto(`/designs/${design.id}`);
            await page.getByRole('button', { name: 'Ask AI for a price range' }).click();

            await expect(page.getByText("You've reached the AI usage limit for now.")).toBeVisible();
        });
    });
