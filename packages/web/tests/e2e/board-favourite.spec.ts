import { expect, test } from './fixtures';
import { MOCK_TOKEN_BOARD_FAVOURITE } from './mocks/auth';
import { apiCreateTask } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_BOARD_FAVOURITE;

test.use({ authToken: TOKEN });

test.describe
    .serial('Board task favouriting', () => {
        test('toggling favourite persists across reload @smoke', async ({ authenticatedPage: page }) => {
            await apiCreateTask(TOKEN, { title: 'Favourite Me Task' });

            await page.goto('/board');
            await page.waitForLoadState('networkidle');

            await expect(page.getByText('Favourite Me Task')).toBeVisible({ timeout: 10000 });

            await page.getByRole('button', { name: 'Favourite task' }).click();
            await expect(page.getByRole('button', { name: 'Unfavourite task' })).toBeVisible({ timeout: 10000 });

            await page.reload();
            await page.waitForLoadState('networkidle');

            await expect(page.getByText('Favourite Me Task')).toBeVisible({ timeout: 10000 });
            await expect(page.getByRole('button', { name: 'Unfavourite task' })).toBeVisible({ timeout: 10000 });
        });
    });
