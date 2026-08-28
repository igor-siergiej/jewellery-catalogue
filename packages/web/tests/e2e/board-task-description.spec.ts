import { expect, test } from './fixtures';
import { MOCK_TOKEN_TASK_DESCRIPTION } from './mocks/auth';
import { apiCreateTask, apiDeleteTask } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_TASK_DESCRIPTION;

test.use({ authToken: TOKEN });

test.describe
    .serial('Board task description', () => {
        test('setting a description persists across reload @smoke', async ({ authenticatedPage: page }) => {
            const task = await apiCreateTask(TOKEN, { title: 'Photograph new earrings' });

            try {
                await page.goto('/board');
                await page.waitForLoadState('networkidle');

                await expect(page.getByText('Photograph new earrings')).toBeVisible({ timeout: 10000 });

                await page.locator('button[aria-label="Edit task Photograph new earrings"]').click();
                await expect(page.getByText('Edit Task')).toBeVisible({ timeout: 10000 });

                await page.getByLabel('Description').fill('Use the lightbox, natural light preferred');

                await page.getByRole('button', { name: 'Save Changes' }).click();
                await expect(page.getByText('Edit Task')).not.toBeVisible({ timeout: 10000 });

                await expect(page.getByText('Use the lightbox, natural light preferred')).toBeVisible({
                    timeout: 10000,
                });

                await page.reload();
                await page.waitForLoadState('networkidle');

                await expect(page.getByText('Use the lightbox, natural light preferred')).toBeVisible({
                    timeout: 10000,
                });
            } finally {
                await apiDeleteTask(TOKEN, task.id);
            }
        });
    });
