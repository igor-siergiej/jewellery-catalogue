import { expect, test } from './fixtures';
import { MOCK_TOKEN_BOARD_FAVOURITE } from './mocks/auth';
import { apiCreateTask, apiDeleteTask } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_BOARD_FAVOURITE;

test.use({ authToken: TOKEN });

test.describe
    .serial('Board task favouriting', () => {
        test('toggling favourite persists across reload @smoke', async ({ authenticatedPage: page }) => {
            const task = await apiCreateTask(TOKEN, { title: 'Favourite Me Task' });

            try {
                await page.goto('/board');
                await page.waitForLoadState('networkidle');

                await expect(page.getByText('Favourite Me Task')).toBeVisible({ timeout: 10000 });

                // Scoped to the `button` tag: dnd-kit's draggable wrapper also carries
                // role="button", which would otherwise ambiguously match getByRole here.
                await page.locator('button[aria-label="Favourite task"]').click();
                await expect(page.locator('button[aria-label="Unfavourite task"]')).toBeVisible({ timeout: 10000 });

                await page.reload();
                await page.waitForLoadState('networkidle');

                await expect(page.getByText('Favourite Me Task')).toBeVisible({ timeout: 10000 });
                await expect(page.locator('button[aria-label="Unfavourite task"]')).toBeVisible({ timeout: 10000 });
            } finally {
                await apiDeleteTask(TOKEN, task.id);
            }
        });
    });
