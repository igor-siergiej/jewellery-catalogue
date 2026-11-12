import { expect, test } from './fixtures';
import { MOCK_TOKEN_APP_SHELL, MOCK_TOKEN_APP_SHELL_OTHER } from './mocks/auth';
import { apiCleanup, apiCreateBead, apiCreateDesign } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_APP_SHELL;

test.use({ authToken: TOKEN });

const AUTH_URL = 'http://localhost:3008';

test.describe.serial('App shell and session', () => {
    test('the sidebar and header reach every page', async ({ authenticatedPage: page }) => {
        await page.goto('/home');
        const sidebar = page.locator('[data-sidebar="sidebar"]');
        const nav = sidebar.locator('[data-sidebar="menu"]');

        for (const [link, path] of [
            ['Designs', '/designs'],
            ['Etsy', '/listings'],
            ['Materials', '/materials'],
            ['Board', '/board'],
            ['Stock', '/home'],
        ]) {
            await nav.getByRole('link', { name: link, exact: true }).click();
            await expect(page).toHaveURL(new RegExp(`${path}$`));
            await expect(nav.getByRole('link', { name: link, exact: true })).toHaveAttribute('aria-current', 'page');
        }

        await sidebar.getByRole('link', { name: 'Settings', exact: true }).click();
        await expect(page).toHaveURL(/\/settings$/);
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    });

    test('the sidebar nav is Stock, Designs, Materials, Etsy, Board with no add links', async ({
        authenticatedPage: page,
    }) => {
        await page.goto('/home');
        const sidebar = page.locator('[data-sidebar="sidebar"]');
        const nav = sidebar.locator('[data-sidebar="menu"]');

        for (const name of ['Stock', 'Designs', 'Materials', 'Etsy', 'Board']) {
            await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
        }

        await expect(sidebar.getByRole('link', { name: 'Settings', exact: true })).toBeVisible();

        await expect(sidebar.getByRole('link', { name: 'Add Design' })).toHaveCount(0);
        await expect(sidebar.getByRole('button', { name: 'Add Design' })).toHaveCount(0);
        await expect(sidebar.getByRole('link', { name: 'Add Material' })).toHaveCount(0);
        await expect(sidebar.getByText(/^v\d/)).toHaveCount(0);
    });

    test('the brand link goes to Stock', async ({ authenticatedPage: page }) => {
        await page.goto('/designs');
        await page.locator('[data-sidebar="sidebar"] a[aria-label="Stock"]').click();
        await expect(page).toHaveURL(/\/home$/);
    });

    test('a design page keeps Designs active', async ({ authenticatedPage: page }) => {
        await apiCleanup(TOKEN);
        const design = await apiCreateDesign(TOKEN, { name: 'Active Nav Design' });
        await page.goto(`/designs/${design.id}`);
        await expect(
            page.locator('[data-sidebar="menu"]').getByRole('link', { name: 'Designs', exact: true })
        ).toHaveAttribute('aria-current', 'page');
    });

    test('the header has no Settings button or Back to Designs', async ({ authenticatedPage: page }) => {
        await apiCleanup(TOKEN);
        const design = await apiCreateDesign(TOKEN, { name: 'Header Check Design' });
        await page.goto(`/designs/${design.id}`);
        await expect(page.getByRole('heading', { name: 'Header Check Design' })).toBeVisible();
        const header = page.locator('header');
        await expect(header.getByRole('button', { name: 'Settings' })).toHaveCount(0);
        await expect(header.getByRole('link', { name: 'Settings' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Back to Designs' })).toHaveCount(0);
    });

    test('collapsed sidebar keeps Settings and Log out reachable', async ({ authenticatedPage: page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/home');
        await page.locator('[data-slot="sidebar-trigger"]').click();
        const sidebar = page.locator('[data-sidebar="sidebar"]');
        await expect(page.locator('[data-slot="sidebar"][data-state="collapsed"]')).toBeVisible();

        await expect(sidebar.getByRole('button', { name: 'Log out' })).toBeVisible();
        await sidebar.getByRole('link', { name: 'Settings', exact: true }).click();
        await expect(page).toHaveURL(/\/settings$/);
    });

    test('logging out ends the session', async ({ authenticatedPage: page }) => {
        await page.goto('/home');
        await page.evaluate(() => sessionStorage.setItem('e2e-signed-out', '1'));
        // The real logout clears the refresh cookie, so refreshing afterwards fails
        await page.route(`${AUTH_URL}/refresh`, (route) => route.fulfill({ status: 401, json: {} }));
        await page.getByRole('button', { name: 'Log out' }).click();

        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
        expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBeNull();

        await page.goto('/home');
        await expect(page).toHaveURL(/\/$/);
    });

    test('a signed-in user opening the start or register page lands on Home', async ({ authenticatedPage: page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/home$/);
        await page.goto('/register');
        await expect(page).toHaveURL(/\/home$/);
    });

    test('an expired token is refreshed and the request retried', async ({ authenticatedPage: page }) => {
        await apiCreateBead(TOKEN, { name: 'After Refresh Bead' });
        let refreshes = 0;
        await page.route(`${AUTH_URL}/refresh`, (route) => {
            refreshes++;

            return route.fulfill({ json: { accessToken: TOKEN } });
        });
        let rejected = false;
        await page.route(/\/api\/materials$/, (route) => {
            if (rejected) return route.fallback();
            rejected = true;

            return route.fulfill({ status: 401, json: { message: 'Token expired' } });
        });
        await page.goto('/materials');

        await expect(page.getByRole('cell', { name: 'After Refresh Bead', exact: true })).toBeVisible();
        expect(rejected).toBe(true);
        expect(refreshes).toBeGreaterThan(0);
    });

    test('a failed refresh signs the user out', async ({ authenticatedPage: page }) => {
        await page.route(`${AUTH_URL}/refresh`, (route) => route.fulfill({ status: 401, json: {} }));
        await page.route(/\/api\/materials$/, (route) =>
            route.fulfill({ status: 401, json: { message: 'Token expired' } })
        );
        await page.goto('/materials');

        await expect(page).toHaveURL(/\/$/);
    });

    test("one user never sees another user's designs or materials", async ({ authenticatedPage: page }) => {
        await apiCleanup(MOCK_TOKEN_APP_SHELL_OTHER);
        await apiCreateBead(MOCK_TOKEN_APP_SHELL_OTHER, { name: 'Their Bead' });
        await apiCreateDesign(MOCK_TOKEN_APP_SHELL_OTHER, { name: 'Their Design' });
        await apiCreateBead(TOKEN, { name: 'My Bead' });
        await apiCreateDesign(TOKEN, { name: 'My Design' });

        await page.goto('/designs');
        await expect(page.getByText('My Design')).toBeVisible();
        await expect(page.getByText('Their Design')).toHaveCount(0);

        await page.goto('/materials');
        await expect(page.getByRole('cell', { name: 'My Bead', exact: true })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'Their Bead', exact: true })).toHaveCount(0);
    });
});

test.describe('Signed out', () => {
    for (const path of ['/home', '/designs', '/materials', '/board', '/settings', '/shopping-list']) {
        test(`${path} redirects to the start page`, async ({ page }) => {
            await page.goto(path);
            await expect(page).toHaveURL(/\/$/);
            await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
        });
    }
});
