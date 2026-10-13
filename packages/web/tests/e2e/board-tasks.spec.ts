import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_BOARD_TASKS } from './mocks/auth';
import { apiCleanupBoard, apiCreateTask } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_BOARD_TASKS;
test.use({ authToken: TOKEN });

const API_URL = process.env.E2E_API_SERVICE_URL || 'http://localhost:3001';

type ApiTask = { id: string; title: string; status: string; dueDate?: string; [key: string]: unknown };

async function apiGetTasks(): Promise<ApiTask[]> {
    const res = await fetch(`${API_URL}/api/tasks`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    return res.json();
}

const column = (page: Page, label: string) => page.locator(`xpath=//span[normalize-space()='${label}']/../..`);

const card = (page: Page, title: string) =>
    page.locator('div[aria-roledescription="draggable"]').filter({ hasText: title });

/** Drags with small mouse steps so dnd-kit's pointer sensor registers a drag, not a click. */
async function dragTo(page: Page, source: Locator, target: Locator) {
    const from = await source.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) throw new Error('drag source or target not visible');
    await page.mouse.move(from.x + 10, from.y + 10);
    await page.mouse.down();
    await page.mouse.move(from.x + 30, from.y + 30, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + 40, { steps: 15 });
    await page.mouse.up();
}

test.describe
    .serial('Board tasks', () => {
        test.beforeEach(() => apiCleanupBoard(TOKEN));

        test('adding a task with every field puts it in To Do', async ({ authenticatedPage: page }) => {
            await page.goto('/board');
            await page.getByRole('button', { name: 'Add Task' }).click();
            const dialog = page.getByRole('dialog', { name: 'Add Task' });

            await expect(dialog.getByRole('button', { name: 'Add Task' })).toBeDisabled();
            await dialog.getByPlaceholder('Task title').fill('Photograph new rings');
            await dialog.getByRole('combobox').nth(0).click();
            await page.getByRole('option', { name: 'marketing' }).click();
            await dialog.getByRole('combobox').nth(1).click();
            await page.getByRole('option', { name: 'high' }).click();
            await dialog.getByRole('combobox').nth(2).click();
            await page.getByRole('option', { name: 'weekly' }).click();

            await dialog.getByRole('button', { name: 'Due date (optional)' }).click();
            const today = page.getByRole('button', { name: /^Today,/ });
            const dayLabel = await today.getAttribute('data-day');
            await today.click();
            await page.keyboard.press('Escape');

            await dialog.getByPlaceholder('Description (optional)').fill('Natural light, white card.');
            await dialog.getByPlaceholder('Add checklist item').fill('Charge camera');
            await dialog.getByPlaceholder('Add checklist item').press('Enter');
            await dialog.getByRole('button', { name: 'Add Task' }).click();
            await expect(dialog).toBeHidden();

            const added = card(page, 'Photograph new rings');
            await expect(column(page, 'To Do').locator(added)).toBeVisible();
            await expect(added).toContainText('Natural light, white card.');
            await expect(added).toContainText('marketing');
            await expect(added).toContainText('high');
            await expect(added).toContainText(dayLabel as string);
            await expect(added.getByRole('checkbox', { name: 'Check Charge camera' })).toBeVisible();

            await page.reload();
            await expect(card(page, 'Photograph new rings')).toBeVisible();
            const [task] = await apiGetTasks();
            expect(task).toMatchObject({
                title: 'Photograph new rings',
                status: 'todo',
                subject: 'marketing',
                importance: 'high',
                recurrence: 'weekly',
                description: 'Natural light, white card.',
                checklist: [expect.objectContaining({ text: 'Charge camera', done: false })],
            });
        });

        test('cancelling Add Task creates nothing', async ({ authenticatedPage: page }) => {
            await page.goto('/board');
            await page.getByRole('button', { name: 'Add Task' }).click();
            const dialog = page.getByRole('dialog', { name: 'Add Task' });
            await dialog.getByPlaceholder('Task title').fill('Never mind');
            await dialog.getByRole('button', { name: 'Cancel' }).click();

            await expect(dialog).toBeHidden();
            expect(await apiGetTasks()).toHaveLength(0);
        });

        test('dragging a task across columns updates its status', async ({ authenticatedPage: page }) => {
            await apiCreateTask(TOKEN, { title: 'Restock clasps' });
            await page.goto('/board');

            await dragTo(page, card(page, 'Restock clasps'), column(page, 'In Progress'));
            await expect(column(page, 'In Progress').locator(card(page, 'Restock clasps'))).toBeVisible();
            await expect.poll(async () => (await apiGetTasks())[0].status).toBe('in_progress');

            await dragTo(page, card(page, 'Restock clasps'), column(page, 'Done'));
            await expect(column(page, 'Done').locator(card(page, 'Restock clasps'))).toBeVisible();
            await expect.poll(async () => (await apiGetTasks())[0].status).toBe('done');

            await page.reload();
            await expect(column(page, 'Done').locator(card(page, 'Restock clasps'))).toBeVisible();
        });

        test('completing a recurring task schedules the next one', async ({ authenticatedPage: page }) => {
            await apiCreateTask(TOKEN, { title: 'Weekly stock check', recurrence: 'weekly', dueDate: '2026-03-02' });
            await page.goto('/board');

            await dragTo(page, card(page, 'Weekly stock check'), column(page, 'Done'));

            await expect(column(page, 'Done').locator(card(page, 'Weekly stock check'))).toBeVisible();
            await expect(column(page, 'To Do').locator(card(page, 'Weekly stock check'))).toBeVisible();
            const tasks = await apiGetTasks();
            const next = tasks.find((t) => t.status === 'todo');
            expect(next?.dueDate?.slice(0, 10)).toBe('2026-03-09');
        });

        test('subject tabs and importance badges filter the board', async ({ authenticatedPage: page }) => {
            await apiCreateTask(TOKEN, { title: 'Post on Instagram', subject: 'marketing', importance: 'low' });
            await apiCreateTask(TOKEN, { title: 'Design a new ring', subject: 'product', importance: 'high' });
            await apiCreateTask(TOKEN, { title: 'File VAT return', subject: 'finance', importance: 'high' });
            await page.goto('/board');

            await expect(page.getByRole('tab', { name: 'All (3)' })).toBeVisible();
            await page.getByRole('tab', { name: 'marketing (1)' }).click();
            await expect(card(page, 'Post on Instagram')).toBeVisible();
            await expect(card(page, 'Design a new ring')).toHaveCount(0);

            await page.getByRole('tab', { name: 'All (3)' }).click();
            // The filter bar renders before the columns, so its badge is the first "high"
            const highBadge = page.getByText('high', { exact: true }).first();
            await highBadge.click();
            await expect(card(page, 'Design a new ring')).toBeVisible();
            await expect(card(page, 'File VAT return')).toBeVisible();
            await expect(card(page, 'Post on Instagram')).toHaveCount(0);

            await highBadge.click();
            await expect(card(page, 'Post on Instagram')).toBeVisible();
        });
    });
