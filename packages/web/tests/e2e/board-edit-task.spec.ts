import { expect, test } from './fixtures';
import { MOCK_TOKEN_EDIT_TASK } from './mocks/auth';
import { apiCreateTask, apiDeleteTask } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_EDIT_TASK;

test.use({ authToken: TOKEN });

test.describe.serial('Board task editing', () => {
    test('editing a task persists across reload', async ({ authenticatedPage: page }) => {
        const task = await apiCreateTask(TOKEN, { title: 'Restock beads' });

        try {
            await page.goto('/board');
            await page.waitForLoadState('networkidle');

            await expect(page.getByText('Restock beads')).toBeVisible({ timeout: 10000 });

            await page.locator('button[aria-label="Edit task Restock beads"]').click();
            await expect(page.getByText('Edit task', { exact: true })).toBeVisible({ timeout: 10000 });

            await page.getByLabel('Title').fill('Restock beads and clasps');

            await page.getByRole('button', { name: 'Save changes' }).click();
            await expect(page.getByText('Edit task', { exact: true })).not.toBeVisible({ timeout: 10000 });

            await expect(page.getByText('Restock beads and clasps')).toBeVisible({ timeout: 10000 });

            await page.reload();
            await page.waitForLoadState('networkidle');

            await expect(page.getByText('Restock beads and clasps')).toBeVisible({ timeout: 10000 });
        } finally {
            await apiDeleteTask(TOKEN, task.id);
        }
    });
});
