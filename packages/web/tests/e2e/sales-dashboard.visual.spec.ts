import { expect } from './fixtures';
import { MOCK_TOKEN_VISUAL_SALES_DESKTOP, MOCK_TOKEN_VISUAL_SALES_MOBILE } from './mocks/auth';
import { SALES_REPORT } from './mocks/salesReport';
import { expectNoHorizontalScroll, settle, visualTest } from './utils/visual-helpers';

const test = visualTest({ mobile: MOCK_TOKEN_VISUAL_SALES_MOBILE, desktop: MOCK_TOKEN_VISUAL_SALES_DESKTOP });

test.describe('Sales dashboard visual regression', () => {
    test('populated state', async ({ authenticatedPage: page }) => {
        await page.route('**/api/sales/report**', (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SALES_REPORT) })
        );

        await page.goto('/home');
        await expect(page.getByTestId('sales-dashboard')).toBeVisible({ timeout: 10000 });
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('sales-dashboard.png', { fullPage: true });
    });
});
