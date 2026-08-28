import { expect, test } from './fixtures';
import { MOCK_TOKEN_GOAL_DATE } from './mocks/auth';
import { apiCreateGoal, apiDeleteGoal } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_GOAL_DATE;

test.use({ authToken: TOKEN });

test.describe
    .serial('Board goal target date', () => {
        test('setting a target date persists across reload @smoke', async ({ authenticatedPage: page }) => {
            const goal = await apiCreateGoal(TOKEN, { title: 'Ship winter collection', targetValue: 5 });

            try {
                await page.goto('/board');
                await page.waitForLoadState('networkidle');

                await expect(page.getByText('Ship winter collection')).toBeVisible({ timeout: 10000 });

                await page.getByRole('button', { name: 'Edit goal Ship winter collection' }).click();
                await expect(page.getByText('Edit Goal')).toBeVisible({ timeout: 10000 });

                await page.getByRole('button', { name: 'Optional' }).click();

                const firstDay = page.locator('[data-day]').first();
                const dayLabel = await firstDay.getAttribute('data-day');
                await firstDay.click();

                await page.getByRole('button', { name: 'Save Changes' }).click();
                await expect(page.getByText('Edit Goal')).not.toBeVisible({ timeout: 10000 });

                await expect(page.getByText(`Target: ${dayLabel}`)).toBeVisible({ timeout: 10000 });

                await page.reload();
                await page.waitForLoadState('networkidle');

                await expect(page.getByText(`Target: ${dayLabel}`)).toBeVisible({ timeout: 10000 });
            } finally {
                await apiDeleteGoal(TOKEN, goal.id);
            }
        });
    });
