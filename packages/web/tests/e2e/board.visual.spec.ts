import { expect } from './fixtures';
import { MOCK_TOKEN_VISUAL_BOARD_DESKTOP, MOCK_TOKEN_VISUAL_BOARD_MOBILE } from './mocks/auth';
import { apiCleanupBoard, apiCreateGoal, apiCreateTask } from './utils/api-helpers';
import { expectNoHorizontalScroll, settle, visualTest } from './utils/visual-helpers';

const test = visualTest({ mobile: MOCK_TOKEN_VISUAL_BOARD_MOBILE, desktop: MOCK_TOKEN_VISUAL_BOARD_DESKTOP });

test.describe('Board page visual regression', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ authToken }) => {
        await apiCleanupBoard(authToken);
    });

    test('empty state', async ({ authenticatedPage: page }) => {
        await page.goto('/board');
        await page.waitForLoadState('networkidle');
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('board-empty.png', { fullPage: true });
    });

    test('populated state', async ({ authenticatedPage: page, authToken }) => {
        const goal = await apiCreateGoal(authToken, { title: 'Visual Goal', targetValue: 10, currentValue: 4 });
        await apiCreateTask(authToken, { title: 'Visual restock beads', importance: 'high', goalId: goal.id });
        await apiCreateTask(authToken, { title: 'Visual photograph pieces', subject: 'marketing' });
        await page.goto('/board');
        await expect(page.getByText('Visual restock beads').first()).toBeVisible({ timeout: 10000 });
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('board-populated.png', { fullPage: true });
    });
});
