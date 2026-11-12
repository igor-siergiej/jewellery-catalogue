import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';

import { expect, test } from './fixtures';
import { MOCK_TOKEN_A11Y } from './mocks/auth';
import { apiCreateBead, apiCreateDesign, apiCreateGoal, apiCreateTask } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_A11Y;

test.use({ authToken: TOKEN });

async function seed() {
    const bead = await apiCreateBead(TOKEN, { name: 'Amethyst Bead', colour: 'purple', quantity: 40 });
    await apiCreateBead(TOKEN, { name: 'Silver Spacer', colour: 'silver', quantity: 3, lowStockThreshold: 10 });

    const design = await apiCreateDesign(TOKEN, {
        name: 'Amethyst Drops',
        designType: 'EARRINGS',
        timeRequired: '1:30',
        materials: [{ ...bead, requiredQuantity: 6 }],
        totalMaterialCosts: 1.2,
        price: 14,
        lowStockThreshold: 2,
        description: '<p>Hand-wrapped amethyst drops.</p>',
    });

    await apiCreateDesign(TOKEN, { name: 'Copper Cuff', designType: 'BRACELET', lowStockThreshold: 1 });
    const goal = await apiCreateGoal(TOKEN, { title: 'Open the shop', targetValue: 10, currentValue: 3 });
    await apiCreateTask(TOKEN, { title: 'Photograph new drops', goalId: goal.id, dueDate: '2030-01-01' });

    return design;
}

/** Fails on serious or critical WCAG 2 A/AA violations; everything else, plus best-practice rules, is only logged. */
async function scan(page: Page, testInfo: TestInfo, label: string) {
    const axe = (tags: string[]) =>
        new AxeBuilder({ page })
            .withTags(tags)
            // Third-party editor: tiptap/ProseMirror markup is not ours to change
            .exclude('.ProseMirror')
            .analyze();

    const { violations } = await axe(['wcag2a', 'wcag2aa']);
    const { violations: bestPractice } = await axe(['best-practice']);

    const describe = (v: (typeof violations)[number]) =>
        `${v.id} (${v.impact}) ${v.help}\n${v.nodes.map((n) => `  ${n.target.join(' ')}\n    ${n.html.slice(0, 200)}`).join('\n')}`;

    const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    const logged = [...violations.filter((v) => !blocking.includes(v)), ...bestPractice];

    if (logged.length > 0) {
        const text = logged.map(describe).join('\n\n');
        console.log(`[a11y] ${label}: non-blocking\n${text}`);
        await testInfo.attach(`${label} non-blocking`, { body: text, contentType: 'text/plain' });
    }

    expect(blocking.map(describe), `${label}: serious or critical axe violations`).toEqual([]);
}

async function settle(page: Page) {
    await expect(page.locator('[data-slot="sidebar-inset"]')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/^Loading/)).toHaveCount(0);
}

test.describe('Accessibility (axe, WCAG 2 A and AA)', () => {
    // One user for the file; the fixture wipes its data per test, so tests run serially or they delete each other's seeded data
    test.describe.configure({ mode: 'serial' });

    for (const [label, path, ready] of [
        ['stock', '/home', 'Amethyst Drops'],
        ['designs', '/designs', 'Amethyst Drops'],
        ['materials', '/materials', 'Amethyst Bead'],
        ['listings', '/listings', null],
        ['board', '/board', 'Photograph new drops'],
        ['settings', '/settings', null],
        ['shopping list', '/shopping-list', null],
        ['add design', '/addDesign', null],
        ['add material', '/addMaterial', null],
    ] as const) {
        test(label, async ({ authenticatedPage: page }, testInfo) => {
            await seed();
            await page.goto(path);
            await settle(page);

            if (ready) await expect(page.getByText(ready).first()).toBeVisible();

            await scan(page, testInfo, label);
        });
    }

    test('logged out start page', async ({ page }, testInfo) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('heading').first()).toBeVisible();

        await scan(page, testInfo, 'logged out');
    });

    test('view design', async ({ authenticatedPage: page }, testInfo) => {
        const design = await seed();
        await page.goto(`/designs/${design.id}`);
        await expect(page.getByRole('heading', { name: 'Amethyst Drops' })).toBeVisible();
        await page.waitForLoadState('networkidle');

        await scan(page, testInfo, 'view design');
    });

    test('edit design dialog', async ({ authenticatedPage: page }, testInfo) => {
        const design = await seed();
        await page.goto(`/designs/${design.id}`);
        await page.getByRole('button', { name: 'Edit design' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.waitForLoadState('networkidle');

        await scan(page, testInfo, 'edit design dialog');
    });

    test('inventory dialog', async ({ authenticatedPage: page }, testInfo) => {
        const design = await seed();
        await page.goto(`/designs/${design.id}`);
        await page.getByRole('button', { name: 'Manage inventory' }).click();
        await expect(page.getByRole('dialog', { name: 'Stock for Amethyst Drops' })).toBeVisible();
        await page.waitForLoadState('networkidle');

        await scan(page, testInfo, 'inventory dialog');
    });

    test('inventory drawer at phone width', async ({ authenticatedPage: page }, testInfo) => {
        const design = await seed();
        await page.setViewportSize({ width: 412, height: 915 });
        await page.goto(`/designs/${design.id}`);
        await page.getByRole('button', { name: 'Manage inventory' }).click();
        await expect(page.locator('[data-vaul-drawer]')).toBeVisible();
        await page.waitForLoadState('networkidle');

        await scan(page, testInfo, 'inventory drawer');
    });
});
