import { expect, test } from './fixtures';
import { MOCK_TOKEN_SALES_DASHBOARD } from './mocks/auth';
import { SALES_REPORT } from './mocks/salesReport';

test.use({ authToken: MOCK_TOKEN_SALES_DASHBOARD });

test.describe('Sales dashboard on Home', () => {
    test('shows totals and per-design rows, and refetches when the range changes', async ({
        authenticatedPage: page,
    }) => {
        const requestedUrls: string[] = [];
        await page.route('**/api/sales/report**', (route) => {
            requestedUrls.push(route.request().url());
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SALES_REPORT) });
        });

        await page.goto('/home');

        const dashboard = page.getByTestId('sales-dashboard');
        await expect(dashboard).toBeVisible();
        await expect(dashboard.getByText('£182.50')).toBeVisible();
        await expect(dashboard.getByText('Silver Moon Pendant Necklace').first()).toBeVisible();
        await expect(dashboard.getByText(/Plus 1 sale \(£15\.00\)/)).toBeVisible();
        expect(requestedUrls.at(-1)).toContain('from=');

        await dashboard.getByRole('button', { name: 'All time' }).click();
        await expect.poll(() => requestedUrls.at(-1)).not.toContain('from=');
        await expect(dashboard.getByRole('button', { name: 'All time' })).toHaveAttribute('aria-pressed', 'true');
    });

    test('stays hidden until the first Etsy sale is recorded', async ({ authenticatedPage: page }) => {
        await page.route('**/api/sales/report**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ...SALES_REPORT, hasAnySales: false, designs: [] }),
            })
        );

        await page.goto('/home');

        await expect(page.getByText('All Stock Levels Good!')).toBeVisible();
        await expect(page.getByTestId('sales-dashboard')).toHaveCount(0);
    });
});
