import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { MOCK_TOKEN_COPY_HYGIENE } from './mocks/auth';
import { apiCreateBead, apiCreateDesign } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_COPY_HYGIENE;

const AUTHENTICATED_ROUTES = [
    '/home',
    '/designs',
    '/materials',
    '/listings',
    '/board',
    '/settings',
    '/shopping-list',
    '/addDesign',
    '/addMaterial',
];

const expectCleanCopy = async (page: Page) => {
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);

    const bodyText = await page.evaluate(() => document.body.innerText);

    expect(bodyText, 'em dash in page text').not.toContain('—');

    const labels = [
        ...(await page.getByRole('heading').allInnerTexts()),
        ...(await page.getByRole('button').allInnerTexts()),
    ];

    expect(
        labels.map((label) => label.trim()).filter((label) => /!$/.test(label)),
        'heading or button ending in an exclamation mark'
    ).toEqual([]);

    const uppercase = await page.evaluate(() =>
        [...document.body.querySelectorAll('*')]
            .filter((el) => getComputedStyle(el).textTransform === 'uppercase')
            .map((el) => `${el.tagName.toLowerCase()}: ${(el.textContent ?? '').trim().slice(0, 40)}`)
    );

    expect(uppercase, 'elements with text-transform: uppercase').toEqual([]);
};

test.describe('Copy hygiene', () => {
    test.use({ authToken: TOKEN });
    test.describe.configure({ mode: 'serial' });

    for (const route of AUTHENTICATED_ROUTES) {
        test(`${route} has no em dashes, shouting or exclamation marks`, async ({ authenticatedPage: page }) => {
            await apiCreateBead(TOKEN, { name: 'Hygiene Bead' });
            await apiCreateDesign(TOKEN, { name: 'Hygiene Design' });
            await page.goto(route);
            await expect(page.locator('[data-sidebar="menu"]')).toBeVisible();
            await expectCleanCopy(page);
        });
    }
});

test('/ (logged out) has no em dashes, shouting or exclamation marks', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expectCleanCopy(page);
});
