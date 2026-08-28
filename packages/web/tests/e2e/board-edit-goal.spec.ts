import { expect, test } from './fixtures';
import { MOCK_TOKEN_EDIT_GOAL } from './mocks/auth';
import { apiCreateGoal, apiDeleteGoal } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_EDIT_GOAL;

test.use({ authToken: TOKEN });

test.describe
    .serial('Board goal editing', () => {
        test('editing a goal persists across reload @smoke', async ({ authenticatedPage: page }) => {
            const goal = await apiCreateGoal(TOKEN, { title: 'Sell more rings', targetValue: 10 });

            try {
                await page.goto('/board');
                await page.waitForLoadState('networkidle');

                await expect(page.getByText('Sell more rings')).toBeVisible({ timeout: 10000 });

                await page.getByRole('button', { name: 'Edit goal Sell more rings' }).click();
                await expect(page.getByText('Edit Goal')).toBeVisible({ timeout: 10000 });

                const titleInput = page.getByPlaceholder('Goal title');
                await titleInput.fill('Sell way more rings');

                const targetInput = page.getByPlaceholder('Target (e.g. 50)');
                await targetInput.fill('25');

                await page.getByRole('button', { name: 'Save Changes' }).click();
                await expect(page.getByText('Edit Goal')).not.toBeVisible({ timeout: 10000 });

                await expect(page.getByText('Sell way more rings')).toBeVisible({ timeout: 10000 });
                await expect(page.getByText('0/25')).toBeVisible({ timeout: 10000 });

                await page.reload();
                await page.waitForLoadState('networkidle');

                await expect(page.getByText('Sell way more rings')).toBeVisible({ timeout: 10000 });
                await expect(page.getByText('0/25')).toBeVisible({ timeout: 10000 });
            } finally {
                await apiDeleteGoal(TOKEN, goal.id);
            }
        });
    });
