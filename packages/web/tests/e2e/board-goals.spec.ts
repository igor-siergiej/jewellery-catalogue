import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_BOARD_GOALS } from './mocks/auth';
import { apiCleanupBoard, apiCreateGoal } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_BOARD_GOALS;
test.use({ authToken: TOKEN });

const API_URL = process.env.E2E_API_SERVICE_URL || 'http://localhost:3001';

type ApiGoal = { id: string; title: string; currentValue: number; [key: string]: unknown };

async function apiGetGoals(): Promise<ApiGoal[]> {
    const res = await fetch(`${API_URL}/api/goals`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    return res.json();
}

const goalCard = (page: Page, title: string) => page.getByRole('button', { name: `Edit goal ${title}` });

/**
 * Etsy-tracked goals read their value from Etsy on create and sync. The e2e stack has no Etsy, so these goals are
 * stored as manual goals and reported back to the app with their Etsy source.
 */
async function mockEtsyGoals(page: Page, etsyValue: number) {
    const etsySources = new Map<string, string>();
    const withSource = (goal: ApiGoal) =>
        etsySources.has(goal.id) ? { ...goal, source: etsySources.get(goal.id) } : goal;

    await page.route(/\/api\/goals$/, async (route) => {
        const request = route.request();
        if (request.method() === 'POST') {
            const body = request.postDataJSON();
            if (body.source === 'manual') return route.fallback();
            const goal = await apiCreateGoal(TOKEN, { ...body, source: 'manual', currentValue: etsyValue });
            etsySources.set(goal.id, body.source);
            return route.fulfill({ json: withSource(goal as ApiGoal) });
        }
        const response = await route.fetch();
        return route.fulfill({ json: ((await response.json()) as ApiGoal[]).map(withSource) });
    });

    return etsySources;
}

test.describe
    .serial('Board goals', () => {
        test.beforeEach(() => apiCleanupBoard(TOKEN));
        test.afterEach(({ page }) => page.unrouteAll({ behavior: 'ignoreErrors' }));

        test('adding a manual goal shows its progress', async ({ authenticatedPage: page }) => {
            await page.goto('/board');
            await expect(page.getByText('0 goals')).toBeVisible();
            await page.getByRole('button', { name: 'Add Goal' }).click();
            const dialog = page.getByRole('dialog', { name: 'Add Goal' });

            await dialog.getByPlaceholder('Goal title').fill('List 40 designs');
            await expect(dialog.getByRole('button', { name: 'Add Goal' })).toBeDisabled();
            await dialog.getByPlaceholder('Target (e.g. 50)').fill('0');
            await expect(dialog.getByRole('button', { name: 'Add Goal' })).toBeDisabled();
            await dialog.getByPlaceholder('Target (e.g. 50)').fill('40');
            await dialog.getByPlaceholder('Unit (optional, e.g. listings)').fill('listings');
            await dialog.getByRole('button', { name: 'Add Goal' }).click();
            await expect(dialog).toBeHidden();

            const card = goalCard(page, 'List 40 designs');
            await expect(card).toContainText('0/40 listings');
            await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
            await expect(card.getByRole('button', { name: 'Sync from Etsy' })).toHaveCount(0);
            await expect(page.getByText('1 goals')).toBeVisible();

            await page.reload();
            await expect(goalCard(page, 'List 40 designs')).toBeVisible();
            const [goal] = await apiGetGoals();
            expect(goal).toMatchObject({
                title: 'List 40 designs',
                targetValue: 40,
                unit: 'listings',
                source: 'manual',
            });
        });

        test('updating current progress moves the bar, capped at the target', async ({ authenticatedPage: page }) => {
            await apiCreateGoal(TOKEN, { title: 'Sell 10 rings', targetValue: 10, currentValue: 2 });
            await page.goto('/board');

            const card = goalCard(page, 'Sell 10 rings');
            await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20');

            await card.click();
            let dialog = page.getByRole('dialog', { name: 'Edit Goal' });
            await dialog.getByLabel('Current progress').fill('5');
            await dialog.getByRole('button', { name: 'Save Changes' }).click();
            await expect(card).toContainText('5/10');
            await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');

            await card.click();
            dialog = page.getByRole('dialog', { name: 'Edit Goal' });
            await dialog.getByLabel('Current progress').fill('12');
            await dialog.getByRole('button', { name: 'Save Changes' }).click();
            await expect(card).toContainText('12/10');
            await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
        });

        test('an Etsy-tracked goal syncs its value from Etsy', async ({ authenticatedPage: page }) => {
            await mockEtsyGoals(page, 4);
            await page.goto('/board');
            await page.getByRole('button', { name: 'Add Goal' }).click();
            const dialog = page.getByRole('dialog', { name: 'Add Goal' });
            await dialog.getByPlaceholder('Goal title').fill('Active listings');
            await dialog.getByPlaceholder('Target (e.g. 50)').fill('30');
            await dialog.getByRole('combobox').click();
            await page.getByRole('option', { name: 'Etsy — Active listings' }).click();
            await dialog.getByRole('button', { name: 'Add Goal' }).click();

            const card = goalCard(page, 'Active listings');
            await expect(card).toContainText('Etsy · Active listings');
            await expect(card).toContainText('4/30');
            const [goal] = await apiGetGoals();

            // The sync endpoint asks Etsy for the count; stand in for it by writing the value it would store
            await page.route('**/api/goals/*/etsy-sync', async (route) => {
                const res = await fetch(`${API_URL}/api/goals/${goal.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
                    body: JSON.stringify({ currentValue: 18 }),
                });
                await route.fulfill({ json: await res.json() });
            });
            await card.getByRole('button', { name: 'Sync from Etsy' }).click();

            await expect(card).toContainText('18/30');
            await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
        });

        test('a failed Etsy sync shows an error and keeps the value', async ({ authenticatedPage: page }) => {
            const etsySources = await mockEtsyGoals(page, 0);
            const goal = await apiCreateGoal(TOKEN, { title: 'Total sales', targetValue: 100, currentValue: 7 });
            etsySources.set(goal.id, 'etsy_sales_count');
            await page.route('**/api/goals/*/etsy-sync', (route) => route.fulfill({ status: 502, json: {} }));
            await page.goto('/board');

            const card = goalCard(page, 'Total sales');
            await card.getByRole('button', { name: 'Sync from Etsy' }).click();

            await expect(page.getByText('Error occured during syncing goal from Etsy! :(')).toBeVisible();
            await expect(card).toContainText('7/100');
            // The sync button doesn't open the edit dialog
            await expect(page.getByRole('dialog', { name: 'Edit Goal' })).toHaveCount(0);
        });
    });
