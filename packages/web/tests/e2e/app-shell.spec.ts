import { expect, test } from './fixtures';
import { MOCK_TOKEN_APP_SHELL, MOCK_TOKEN_APP_SHELL_OTHER } from './mocks/auth';
import { apiCleanup, apiCreateBead, apiCreateDesign } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_APP_SHELL;
test.use({ authToken: TOKEN });

const AUTH_URL = 'http://localhost:3008';

test.describe
    .serial('App shell and session', () => {
        test('the sidebar and header reach every page', async ({ authenticatedPage: page }) => {
            await page.goto('/home');
            const sidebar = page.locator('[data-sidebar="sidebar"]');

            for (const [link, path] of [
                ['Designs', '/designs'],
                ['Listings', '/listings'],
                ['Add Design', '/addDesign'],
                ['Materials', '/materials'],
                ['Add Material', '/addMaterial'],
                ['Board', '/board'],
                ['Home', '/home'],
            ]) {
                await sidebar.getByRole('button', { name: link, exact: true }).click();
                await expect(page).toHaveURL(new RegExp(`${path}$`));
            }

            await page.getByRole('button', { name: 'Settings' }).click();
            await expect(page).toHaveURL(/\/settings$/);
            await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
        });

        test('logging out ends the session', async ({ authenticatedPage: page }) => {
            await page.goto('/home');
            await page.evaluate(() => sessionStorage.setItem('e2e-signed-out', '1'));
            // The real logout clears the refresh cookie, so refreshing afterwards fails
            await page.route(`${AUTH_URL}/refresh`, (route) => route.fulfill({ status: 401, json: {} }));
            await page.getByTitle('Logout').click();

            await expect(page).toHaveURL(/\/$/);
            await expect(page.getByText('Welcome back Goldsmith!')).toBeVisible();
            expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBeNull();

            await page.goto('/home');
            await expect(page).toHaveURL(/\/$/);
        });

        test('a signed-in user opening the start or register page lands on Home', async ({
            authenticatedPage: page,
        }) => {
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

            await expect(page.getByRole('cell', { name: 'After Refresh Bead' })).toBeVisible();
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
            await expect(page.getByRole('cell', { name: 'My Bead' })).toBeVisible();
            await expect(page.getByRole('cell', { name: 'Their Bead' })).toHaveCount(0);
        });
    });

test.describe('Signed out', () => {
    for (const path of ['/home', '/designs', '/materials', '/board', '/settings', '/shopping-list']) {
        test(`${path} redirects to the start page`, async ({ page }) => {
            await page.goto(path);
            await expect(page).toHaveURL(/\/$/);
            await expect(page.getByText('Welcome back Goldsmith!')).toBeVisible();
        });
    }
});
