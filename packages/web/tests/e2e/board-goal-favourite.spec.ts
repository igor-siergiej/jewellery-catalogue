import { expect, test } from './fixtures';
import { MOCK_TOKEN_GOAL_FAVOURITE } from './mocks/auth';
import { apiCreateGoal, apiDeleteGoal } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_GOAL_FAVOURITE;

test.use({ authToken: TOKEN });

test.describe
    .serial('Board goal favouriting', () => {
        test('toggling favourite persists across reload @smoke', async ({ authenticatedPage: page }) => {
            const goal = await apiCreateGoal(TOKEN, { title: 'Favourite Me Goal', targetValue: 5 });

            try {
                await page.goto('/board');
                await page.waitForLoadState('networkidle');

                await expect(page.getByText('Favourite Me Goal')).toBeVisible({ timeout: 10000 });

                await page.locator('button[aria-label="Favourite goal"]').click();
                await expect(page.locator('button[aria-label="Unfavourite goal"]')).toBeVisible({ timeout: 10000 });

                await page.reload();
                await page.waitForLoadState('networkidle');

                await expect(page.getByText('Favourite Me Goal')).toBeVisible({ timeout: 10000 });
                await expect(page.locator('button[aria-label="Unfavourite goal"]')).toBeVisible({ timeout: 10000 });
            } finally {
                await apiDeleteGoal(TOKEN, goal.id);
            }
        });
    });
