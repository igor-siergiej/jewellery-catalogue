import { expect, test } from './fixtures';
import { MOCK_TOKEN_HOME } from './mocks/auth';
import { apiCreateBead, apiCreateDesign, apiGetMaterials } from './utils/api-helpers';
import { expectNoHorizontalScroll } from './utils/visual-helpers';

const TOKEN = MOCK_TOKEN_HOME;
const LONG_NAME = `Long ${'wirewrapped amethyst '.repeat(6)}`.trim().slice(0, 120);

test.use({ authToken: TOKEN });

test.describe.serial('Home stock ledger', () => {
    test('no designs shows the empty state with a single Add design action', async ({ authenticatedPage: page }) => {
        await page.goto('/home');

        await expect(page.getByRole('heading', { name: 'Stock', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'No designs yet' })).toBeVisible();
        await expect(page.getByText('Add your first design to start tracking stock.')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Add design' })).toHaveCount(1);
        await expect(page.getByRole('link', { name: 'Add design' })).toHaveAttribute('href', '/addDesign');
    });

    test('an out-of-stock design is the first ledger row, with can make shown as a dash', async ({
        authenticatedPage: page,
    }) => {
        await apiCreateDesign(TOKEN, { name: 'Zed Fine Design', lowStockThreshold: 0 });
        const out = await apiCreateDesign(TOKEN, { name: 'Zed Out Design', lowStockThreshold: 2 });
        await page.goto('/home');

        const rows = page.getByRole('row');
        const first = rows.nth(1);
        await expect(first).toContainText('Zed Out Design');
        await expect(first.getByRole('cell').nth(1)).toHaveText('0');
        await expect(first.getByRole('cell').nth(2)).toHaveText('–');
        await expect(rows.nth(2)).toContainText('Zed Fine Design');
        await expect(page.getByText('1 design out of stock')).toBeVisible();

        await first.getByRole('link', { name: 'Zed Out Design' }).click();
        await expect(page).toHaveURL(`/designs/${out.id}`);
    });

    test('Add design sits in the header row before the ledger', async ({ authenticatedPage: page }) => {
        await apiCreateDesign(TOKEN, { name: 'Header Order Design' });
        await page.goto('/home');

        const add = page.getByRole('link', { name: 'Add design' });
        await expect(add).toHaveAttribute('href', '/addDesign');
        const addBox = await add.boundingBox();
        const tableBox = await page.getByRole('table').boundingBox();
        expect(addBox!.y).toBeLessThan(tableBox!.y);
    });

    test('Review goes to the Designs list filtered to designs not on Etsy', async ({ authenticatedPage: page }) => {
        await apiCreateDesign(TOKEN, { name: 'Etsy Gap Design' });
        await page.goto('/home');

        await page.getByRole('link', { name: 'Review', exact: true }).click();
        await expect(page).toHaveURL('/designs?etsy=none');
    });

    test('a long design name truncates without horizontal scroll at 412px, and rows are tappable', async ({
        authenticatedPage: page,
    }) => {
        await apiCreateDesign(TOKEN, { name: LONG_NAME, lowStockThreshold: 3 });
        await page.setViewportSize({ width: 412, height: 900 });
        await page.goto('/home');

        const link = page.getByRole('link', { name: LONG_NAME });
        await expect(link).toBeVisible();
        await expectNoHorizontalScroll(page);
        expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);

        await page.setViewportSize({ width: 360, height: 800 });
        await expectNoHorizontalScroll(page);
    });

    test('a long design name does not scroll the page on desktop and keeps its full title', async ({
        authenticatedPage: page,
    }) => {
        await apiCreateDesign(TOKEN, { name: LONG_NAME, lowStockThreshold: 3 });
        await page.goto('/home');

        await expect(page.getByRole('link', { name: LONG_NAME })).toHaveAttribute('title', LONG_NAME);
        await expectNoHorizontalScroll(page);
    });

    test('Etsy not connected hides unlinked listings and sales without requesting them', async ({
        authenticatedPage: page,
    }) => {
        await apiCreateDesign(TOKEN, { name: 'Disconnected Design' });
        const requested: string[] = [];
        page.on('request', (req) => {
            if (/\/api\/(etsy\/listings|sales\/report)/.test(req.url())) requested.push(req.url());
        });
        await page.goto('/home');

        await expect(page.getByRole('heading', { name: 'Not on Etsy yet' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Unlinked Etsy listings' })).toHaveCount(0);
        await expect(page.getByRole('heading', { name: 'Sales' })).toHaveCount(0);
        expect(requested).toEqual([]);
    });

    test('materials below their threshold are named under Running low', async ({ authenticatedPage: page }) => {
        await apiCreateDesign(TOKEN, { name: 'Running Low Design' });
        await apiCreateBead(TOKEN, { name: 'Critical Bead', packs: 1, lowStockThreshold: 3 });
        await apiCreateBead(TOKEN, { name: 'Fine Bead', packs: 5, lowStockThreshold: 3 });
        await page.goto('/home');

        const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Running low' }) });
        await expect(panel.getByText('Critical Bead')).toBeVisible();
        await expect(panel.getByText('Fine Bead')).toHaveCount(0);
        await panel.getByRole('link', { name: 'Shopping list' }).click();
        await expect(page).toHaveURL('/shopping-list');
    });

    test('a stock alert set when adding a material puts it under Running low', async ({ authenticatedPage: page }) => {
        await apiCreateDesign(TOKEN, { name: 'Alert Design' });
        await page.goto('/addMaterial');
        await page.locator('input[name="name"]').fill('Alerting Bead');
        await page.locator('input[name="brand"]').fill('AlertCo');
        await page.locator('input[name="purchaseUrl"]').fill('http://example.com');
        await page.locator('input[name="pricePerPack"]').fill('5');
        await page.locator('input[name="packs"]').fill('1');
        await page.getByRole('radio', { name: 'Bead', exact: true }).click();
        await page.locator('input[name="colour"]').fill('red');
        await page.locator('input[name="diameter"]').fill('4');
        await page.locator('input[name="quantity"]').fill('100');
        await page.locator('input[name="lowStockThreshold"]').fill('2');
        await page.getByRole('button', { name: 'Add material' }).click();
        await expect(page.getByText('Added material successfully!')).toBeVisible();

        const beads = await apiGetMaterials(TOKEN);
        expect(beads.find((m) => m.name === 'Alerting Bead')?.lowStockThreshold).toBe(2);
        await page.goto('/home');
        await expect(
            page.locator('section').filter({ has: page.getByRole('heading', { name: 'Running low' }) })
        ).toContainText('Alerting Bead');
    });
});
