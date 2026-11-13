import { expect, test } from './fixtures';
import { MOCK_TOKEN_DESIGN_TOKENS } from './mocks/auth';

test.use({ authToken: MOCK_TOKEN_DESIGN_TOKENS });

test.describe('Design tokens and base styles', () => {
    test('body uses IBM Plex Sans, brand background and tabular numbers', async ({ authenticatedPage: page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        const body = await page.evaluate(() => {
            const style = getComputedStyle(document.body);

            return {
                fontFamily: style.fontFamily,
                backgroundColor: style.backgroundColor,
                fontVariantNumeric: style.fontVariantNumeric,
            };
        });

        expect(body.fontFamily).toContain('IBM Plex Sans');
        expect(body.backgroundColor).toBe('rgb(247, 248, 253)');
        expect(body.fontVariantNumeric).toContain('tabular-nums');
    });

    test('enabled buttons show a pointer cursor', async ({ authenticatedPage: page }) => {
        await page.goto('/home');
        const button = page.locator('button:not(:disabled)').first();

        await expect(button).toBeVisible();
        await expect(button).toHaveCSS('cursor', 'pointer');
    });

    test('is light only', async ({ authenticatedPage: page }) => {
        await page.goto('/home');

        const result = await page.evaluate(() => {
            const selectors: string[] = [];

            for (const sheet of Array.from(document.styleSheets)) {
                const walk = (rules: CSSRuleList) => {
                    for (const rule of Array.from(rules)) {
                        if ('selectorText' in rule) selectors.push((rule as CSSStyleRule).selectorText);

                        if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules);
                    }
                };

                try {
                    walk(sheet.cssRules);
                } catch {
                    // cross-origin sheet
                }
            }

            return {
                hasDarkClass: document.documentElement.classList.contains('dark'),
                darkSelectors: selectors.filter((s) => /\.dark\b/.test(s)),
            };
        });

        expect(result.hasDarkClass).toBe(false);
        expect(result.darkSelectors).toEqual([]);
    });

    test('keyboard-focused Button shows a primary focus ring', async ({ authenticatedPage: page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        const button = page.locator('[data-slot="button"]:not(:disabled)').first();

        await expect(button).toBeVisible();
        await page.keyboard.press('Tab');

        for (let i = 0; i < 30; i++) {
            if (await button.evaluate((el) => el === document.activeElement)) break;

            await page.keyboard.press('Tab');
        }

        await expect(button).toBeFocused();

        await expect(button).toHaveCSS('box-shadow', /rgb\(91, 62, 150\) 0px 0px 0px 3px/);
    });

    test('focused Input shows a primary focus ring', async ({ authenticatedPage: page }) => {
        await page.goto('/addMaterial');
        await page.waitForLoadState('networkidle');

        const input = page.getByLabel('Name', { exact: true });

        await input.focus();

        await expect(input).toHaveCSS('box-shadow', /rgb\(91, 62, 150\) 0px 0px 0px 3px/);
    });

    test('a disabled Button shows a not-allowed cursor', async ({ authenticatedPage: page }) => {
        await page.route('**/api/user-settings', async (route) => {
            if (route.request().method() === 'GET') return route.fallback();

            await new Promise((resolve) => setTimeout(resolve, 3000));

            return route.fallback();
        });
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Save', exact: true }).click();

        const saving = page.getByRole('button', { name: 'Saving…' });

        await expect(saving).toBeDisabled();
        await expect(saving).toHaveCSS('cursor', 'not-allowed');
        await expect(saving).toHaveCSS('pointer-events', 'auto');
    });
});
