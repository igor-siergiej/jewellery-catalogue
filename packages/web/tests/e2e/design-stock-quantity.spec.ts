import { expect, test } from './fixtures';
import { MOCK_TOKEN_STOCK_QUANTITY } from './mocks/auth';
import { apiCreateDesign, apiGetDesigns } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_STOCK_QUANTITY;
const API_URL = process.env.E2E_API_SERVICE_URL || 'http://localhost:3001';

test.use({ authToken: TOKEN });

test.describe
    .serial('Design stock quantity', () => {
        test('directly setting stock updates the design without touching material stock @smoke', async ({
            authenticatedPage: page,
        }) => {
            const design = await apiCreateDesign(TOKEN, { name: 'Direct Stock Design', price: 9.0 });

            await page.goto('/designs');
            await page.waitForLoadState('networkidle');

            await expect(page.getByText('Direct Stock Design')).toBeVisible({ timeout: 10000 });
            await page.locator('[title="Manage Inventory"]').click();

            await expect(page.getByText('Manage Design Inventory')).toBeVisible({ timeout: 10000 });
            await page.locator('#set-stock-quantity').fill('12');
            await page.getByRole('button', { name: 'Update Stock' }).click();

            await expect(page.getByText('Stock updated!')).toBeVisible({ timeout: 10000 });

            const designs = await apiGetDesigns(TOKEN);
            const updated = designs.find((d) => d.id === design.id);
            expect((updated as { totalQuantity?: number })?.totalQuantity).toBe(12);
        });

        test('syncing stock from a linked Etsy listing updates the design', async ({ authenticatedPage: page }) => {
            const design = await apiCreateDesign(TOKEN, { name: 'Etsy Synced Stock Design', price: 9.0 });
            const linkRes = await fetch(`${API_URL}/api/designs/${design.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
                body: JSON.stringify({ etsy: { listingId: 555, state: 'active', lastPushedAt: null } }),
            });
            expect(linkRes.ok).toBe(true);

            await page.route('**/api/designs/*/etsy-sync-quantity', (route) =>
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ ...design, etsy: { listingId: 555, state: 'active' }, totalQuantity: 27 }),
                })
            );

            await page.goto('/designs');
            await page.waitForLoadState('networkidle');

            await expect(page.getByText('Etsy Synced Stock Design')).toBeVisible({ timeout: 10000 });
            await page.locator('[title="Manage Inventory"]').click();

            await expect(page.getByText('Manage Design Inventory')).toBeVisible({ timeout: 10000 });

            const syncButton = page.getByRole('button', { name: 'Sync from Etsy' });
            await expect(syncButton).toBeVisible({ timeout: 10000 });
            await syncButton.click();

            await expect(page.getByText('Stock synced from Etsy!')).toBeVisible({ timeout: 10000 });
        });

        test('sync button is not shown for a design with no linked Etsy listing', async ({
            authenticatedPage: page,
        }) => {
            await apiCreateDesign(TOKEN, { name: 'Unlinked Stock Design', price: 9.0 });

            await page.goto('/designs');
            await page.waitForLoadState('networkidle');

            await expect(page.getByText('Unlinked Stock Design')).toBeVisible({ timeout: 10000 });
            await page.locator('[title="Manage Inventory"]').click();

            await expect(page.getByText('Manage Design Inventory')).toBeVisible({ timeout: 10000 });
            await expect(page.getByRole('button', { name: 'Sync from Etsy' })).not.toBeVisible();
        });
    });
