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

    test('focus ring survives shadow-xs on a keyboard-focused control', async ({ authenticatedPage: page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        const boxShadow = await page.evaluate(() => {
            const el = document.createElement('button');

            el.className = 'shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring';
            el.textContent = 'probe';
            document.body.append(el);
            el.focus({ focusVisible: true } as FocusOptions);

            const value = getComputedStyle(el).boxShadow;

            el.remove();

            return value;
        });

        expect(boxShadow).not.toBe('none');
        expect(boxShadow).toContain('rgb(91, 62, 150)');
        expect(boxShadow).toContain('3px');
    });

    test('disabled buttons show not-allowed cursor', async ({ authenticatedPage: page }) => {
        await page.goto('/home');
        await page.waitForLoadState('networkidle');

        const cursor = await page.evaluate(() => {
            const el = document.createElement('button');

            el.disabled = true;
            el.className =
                'inline-flex disabled:cursor-not-allowed disabled:opacity-50 not-disabled:hover:bg-primary/90';
            el.textContent = 'probe';
            document.body.append(el);

            const value = getComputedStyle(el).cursor;

            el.remove();

            return value;
        });

        expect(cursor).toBe('not-allowed');
    });
});
