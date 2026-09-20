import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_DESIGN_FAVOURITE } from './mocks/auth';
import { apiCreateDesign, apiDeleteDesign } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_DESIGN_FAVOURITE;

test.use({ authToken: TOKEN });

function findDesignCard(page: Page, designName: string) {
    const title = page.locator('[data-slot="item-title"]').filter({ hasText: designName });
    return page.locator('[data-slot="item"]').filter({ has: title });
}

test.describe
    .serial('Design card favouriting', () => {
        test('toggling favourite persists across reload @smoke', async ({ authenticatedPage: page }) => {
            const design = await apiCreateDesign(TOKEN, { name: 'Favourite Me Design', price: 12.0 });

            try {
                await page.goto('/designs');
                await page.waitForLoadState('networkidle');

                const card = findDesignCard(page, 'Favourite Me Design');
                await expect(card).toBeVisible({ timeout: 10000 });

                await card.locator('button[aria-label="Favourite design"]').click();
                await expect(card.locator('button[aria-label="Unfavourite design"]')).toBeVisible({ timeout: 10000 });

                await page.reload();
                await page.waitForLoadState('networkidle');

                const reloadedCard = findDesignCard(page, 'Favourite Me Design');
                await expect(reloadedCard.locator('button[aria-label="Unfavourite design"]')).toBeVisible({
                    timeout: 10000,
                });
            } finally {
                await apiDeleteDesign(TOKEN, design.id);
            }
        });

        test('favourited designs are sorted to the top of the list @smoke', async ({ authenticatedPage: page }) => {
            const names = ['Sort Alpha Design', 'Sort Beta Design', 'Sort Gamma Design'];
            const created = [];

            for (const name of names) {
                created.push(await apiCreateDesign(TOKEN, { name, price: 7.5 }));
            }

            try {
                await page.goto('/designs');
                await page.waitForLoadState('networkidle');

                const titles = page.locator('[data-slot="item-title"]');
                await expect(titles).toHaveCount(names.length, { timeout: 10000 });

                const initialOrder = await titles.allTextContents();
                const lastName = initialOrder[initialOrder.length - 1];
                expect(initialOrder[0]).not.toBe(lastName);

                const lastCard = findDesignCard(page, lastName);
                await lastCard.locator('button[aria-label="Favourite design"]').click();
                await expect(lastCard.locator('button[aria-label="Unfavourite design"]')).toBeVisible({
                    timeout: 10000,
                });

                await expect(titles.first()).toHaveText(lastName);

                await page.reload();
                await page.waitForLoadState('networkidle');

                await expect(titles.first()).toHaveText(lastName, { timeout: 10000 });
            } finally {
                for (const design of created) {
                    await apiDeleteDesign(TOKEN, design.id);
                }
            }
        });
    });
