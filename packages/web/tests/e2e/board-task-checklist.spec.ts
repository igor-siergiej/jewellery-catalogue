import { expect, test } from './fixtures';
import { MOCK_TOKEN_TASK_CHECKLIST } from './mocks/auth';
import { apiCreateTask, apiDeleteTask } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_TASK_CHECKLIST;

test.use({ authToken: TOKEN });

test.describe
    .serial('Board task checklist', () => {
        test('checklist items added on a task can be ticked off and persist @smoke', async ({
            authenticatedPage: page,
        }) => {
            const task = await apiCreateTask(TOKEN, { title: 'Assemble bracelet order' });

            try {
                await page.goto('/board');
                await page.waitForLoadState('networkidle');

                await expect(page.getByText('Assemble bracelet order')).toBeVisible({ timeout: 10000 });

                await page.locator('button[aria-label="Edit task Assemble bracelet order"]').click();
                await expect(page.getByText('Edit Task')).toBeVisible({ timeout: 10000 });

                await page.getByPlaceholder('Add checklist item').fill('Cut wire');
                await page.getByRole('button', { name: 'Add', exact: true }).click();
                await page.getByPlaceholder('Add checklist item').fill('Polish clasp');
                await page.getByRole('button', { name: 'Add', exact: true }).click();

                await page.getByRole('button', { name: 'Save Changes' }).click();
                await expect(page.getByText('Edit Task')).not.toBeVisible({ timeout: 10000 });

                await expect(page.getByText('Checklist 0/2')).toBeVisible({ timeout: 10000 });

                await page.locator('button[aria-label="Check Cut wire"]').click();
                await expect(page.getByText('Checklist 1/2')).toBeVisible({ timeout: 10000 });

                await page.reload();
                await page.waitForLoadState('networkidle');

                await expect(page.getByText('Checklist 1/2')).toBeVisible({ timeout: 10000 });
                await expect(page.locator('button[aria-label="Uncheck Cut wire"]')).toBeVisible({ timeout: 10000 });
                await expect(page.getByText('Polish clasp')).toBeVisible({ timeout: 10000 });
            } finally {
                await apiDeleteTask(TOKEN, task.id);
            }
        });
    });
