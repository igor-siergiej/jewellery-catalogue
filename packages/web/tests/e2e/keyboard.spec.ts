import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { MOCK_TOKEN_KEYBOARD } from './mocks/auth';
import { apiCreateBead, apiCreateDesign, apiCreateDraft } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_KEYBOARD;

test.use({ authToken: TOKEN });

// Every test wipes the shared user's data in its fixture, so parallel tests would delete each other's seeded design
test.describe.configure({ mode: 'serial' });

async function seed() {
    const bead = await apiCreateBead(TOKEN, { name: 'Amethyst Bead', quantity: 40 });

    const design = await apiCreateDesign(TOKEN, {
        name: 'Amethyst Drops',
        designType: 'EARRINGS',
        materials: [{ ...bead, requiredQuantity: 6 }],
        totalMaterialCosts: 1.2,
        price: 14,
        lowStockThreshold: 2,
    });

    return design;
}

/** Presses Tab until the focused element matches `selector`, returning what was focused on the way (name or text). */
async function tabTo(page: Page, selector: string, max = 40) {
    const visited: string[] = [];

    for (let i = 0; i < max; i++) {
        await page.keyboard.press('Tab');

        const { matches, label } = await page.evaluate((sel) => {
            const el = document.activeElement as HTMLElement | null;

            return {
                matches: !!el?.matches(sel),
                label: el?.getAttribute('aria-label') ?? el?.textContent?.trim() ?? '',
            };
        }, selector);

        visited.push(label);

        if (matches) return visited;
    }

    throw new Error(`Never focused ${selector} in ${max} Tab presses: ${visited.join(' > ')}`);
}

async function expectFocusRing(locator: Locator) {
    const ring = await locator.evaluate((el) => {
        const style = getComputedStyle(el);

        return { outlineStyle: style.outlineStyle, boxShadow: style.boxShadow };
    });

    expect(ring.outlineStyle !== 'none' || ring.boxShadow !== 'none').toBe(true);
}

test.describe('Keyboard', () => {
    // One user for the file; the fixture wipes its data per test, so tests must not run in parallel
    test.describe.configure({ mode: 'default' });

    test('Tab reaches the first sidebar link with a visible focus ring', async ({ authenticatedPage: page }) => {
        await seed();
        await page.goto('/home');
        await expect(page.getByRole('link', { name: 'Amethyst Drops' })).toBeVisible();

        await tabTo(page, '[data-slot="sidebar"] a');

        const focused = page.locator(':focus');
        await expect(focused).toHaveAttribute('aria-label', 'Stock');
        await expectFocusRing(focused);
    });

    test('Tab reaches Add design before the first ledger row, and Enter opens the design', async ({
        authenticatedPage: page,
    }) => {
        const design = await seed();
        await page.goto('/home');
        await expect(page.getByRole('link', { name: 'Amethyst Drops' })).toBeVisible();

        const visited = await tabTo(page, 'table a');

        expect(visited).toContain('Add design');
        expect(visited.indexOf('Add design')).toBeLessThan(visited.length - 1);
        await expect(page.locator(':focus')).toHaveText(/Amethyst Drops/);

        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(`/designs/${design.id}`);
    });

    test('Tab reaches a design card name link on the Designs page and Enter opens the design', async ({
        authenticatedPage: page,
    }) => {
        const design = await seed();
        await page.goto('/designs');
        await expect(page.getByRole('article', { name: 'Amethyst Drops', exact: true })).toBeVisible();

        await tabTo(page, 'article a');

        const focused = page.locator(':focus');
        await expect(focused).toHaveText('Amethyst Drops');
        await expect(focused).toHaveAttribute('href', `/designs/${design.id}`);

        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(`/designs/${design.id}`);
    });

    test('Escape closes the inventory dialog and returns focus to its trigger', async ({ authenticatedPage: page }) => {
        const design = await seed();
        await page.goto(`/designs/${design.id}`);
        const trigger = page.getByRole('button', { name: 'Manage inventory' });
        await expect(trigger).toBeVisible();

        await trigger.focus();
        await page.keyboard.press('Enter');

        const dialog = page.getByRole('dialog', { name: 'Stock for Amethyst Drops' });
        await expect(dialog).toBeVisible();
        await expect(page.locator('[data-vaul-drawer]')).toHaveCount(0);

        await page.keyboard.press('Escape');

        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
    });

    test('Escape closes the edit dialog and returns focus to its trigger', async ({ authenticatedPage: page }) => {
        const design = await seed();
        await page.goto(`/designs/${design.id}`);
        const trigger = page.getByRole('button', { name: 'Edit design' });
        await expect(trigger).toBeVisible();

        await trigger.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('dialog')).toBeVisible();

        await page.keyboard.press('Escape');

        await expect(page.getByRole('dialog')).toBeHidden();
        await expect(trigger).toBeFocused();
    });

    test('at 412px the inventory dialog is a bottom sheet; Escape closes it and returns focus', async ({
        authenticatedPage: page,
    }) => {
        const design = await seed();
        await page.setViewportSize({ width: 412, height: 915 });
        await page.goto(`/designs/${design.id}`);
        const trigger = page.getByRole('button', { name: 'Manage inventory' });
        await expect(trigger).toBeVisible();

        await trigger.focus();
        await page.keyboard.press('Enter');

        const drawer = page.locator('[data-vaul-drawer]');
        await expect(drawer).toBeVisible();
        await expect(drawer.getByRole('heading', { name: 'Stock for Amethyst Drops' })).toBeVisible();
        await expect(drawer).toBeFocused();

        await page.keyboard.press('Escape');

        await expect(drawer).toBeHidden();
        await expect(trigger).toBeFocused();
    });

    test('Tab reaches a draft card link on the Designs page and Enter opens the draft', async ({
        authenticatedPage: page,
    }) => {
        const draft = await apiCreateDraft(TOKEN, { name: 'Unfinished Hoops', type: 'design', data: {} });
        await page.goto('/designs');
        await expect(page.getByRole('link', { name: 'Unfinished Hoops' })).toBeVisible();

        await tabTo(page, 'main a[href*="draftId"]');

        await expect(page.locator(':focus')).toHaveText('Unfinished Hoops');
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`/addDesign\\?draftId=${draft.id}`));
    });

    test.describe('dialogs opened from a menu', () => {
        const openMenuItem = async (page: Page, trigger: Locator, item: string) => {
            await trigger.focus();
            await page.keyboard.press('Enter');
            const items = page.getByRole('menuitem');
            await expect(items.first()).toBeFocused();
            const names = (await items.allInnerTexts()).map((name) => name.trim());

            for (let i = 1; i <= names.indexOf(item); i++) {
                await page.keyboard.press('ArrowDown');
                await expect(items.nth(i)).toBeFocused();
            }

            await page.keyboard.press('Enter');
        };

        test('Manage inventory from a design card returns focus to More actions', async ({
            authenticatedPage: page,
        }) => {
            await seed();
            await page.goto('/designs');
            const trigger = page.getByRole('button', { name: 'More actions for Amethyst Drops' });

            await openMenuItem(page, trigger, 'Manage inventory');
            await expect(page.getByRole('dialog', { name: 'Stock for Amethyst Drops' })).toBeVisible();
            await page.keyboard.press('Escape');

            await expect(page.getByRole('dialog')).toBeHidden();
            await expect(trigger).toBeFocused();
        });

        test('Manage inventory from a design card on a phone returns focus to More actions', async ({
            authenticatedPage: page,
        }) => {
            await seed();
            await page.setViewportSize({ width: 412, height: 915 });
            await page.goto('/designs');
            const trigger = page.getByRole('button', { name: 'More actions for Amethyst Drops' });

            await openMenuItem(page, trigger, 'Manage inventory');
            await expect(page.locator('[data-vaul-drawer]')).toBeVisible();
            await page.keyboard.press('Escape');

            await expect(page.locator('[data-vaul-drawer]')).toBeHidden();
            await expect(trigger).toBeFocused();
        });

        test('Delete from a design card returns focus to More actions', async ({ authenticatedPage: page }) => {
            await seed();
            await page.goto('/designs');
            const trigger = page.getByRole('button', { name: 'More actions for Amethyst Drops' });

            await openMenuItem(page, trigger, 'Delete');
            await expect(page.getByRole('alertdialog')).toBeVisible();
            await page.keyboard.press('Escape');

            await expect(page.getByRole('alertdialog')).toBeHidden();
            await expect(trigger).toBeFocused();
        });

        test('Edit from a material row returns focus to More actions', async ({ authenticatedPage: page }) => {
            await seed();
            await page.goto('/materials');
            const trigger = page.getByRole('button', { name: 'More actions for Amethyst Bead' });

            await openMenuItem(page, trigger, 'Edit');
            await expect(page.getByRole('dialog')).toBeVisible();
            await page.keyboard.press('Escape');

            await expect(page.getByRole('dialog')).toBeHidden();
            await expect(trigger).toBeFocused();
        });

        test('Delete from a material row returns focus to More actions', async ({ authenticatedPage: page }) => {
            await seed();
            await page.goto('/materials');
            const trigger = page.getByRole('button', { name: 'More actions for Amethyst Bead' });

            await openMenuItem(page, trigger, 'Delete');
            await expect(page.getByRole('alertdialog')).toBeVisible();
            await page.keyboard.press('Escape');

            await expect(page.getByRole('alertdialog')).toBeHidden();
            await expect(trigger).toBeFocused();
        });
    });
});
