import { expect, type Page } from '@playwright/test';
import { test } from '../fixtures';

export const visualTest = (tokens: { mobile: string; desktop: string }) =>
    test.extend({
        authToken: async ({ browserName: _browserName }, use, testInfo) => {
            await use(testInfo.project.name === 'mobile-visual' ? tokens.mobile : tokens.desktop);
        },
    });

export const settle = async (page: Page) => {
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.evaluate(() => document.fonts.check('16px Delius'))).toBe(true);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
};

export const expectNoHorizontalScroll = async (page: Page) => {
    const offenders = await page.evaluate(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const hasScrollableAncestor = (el: Element) => {
            for (let node = el.parentElement; node; node = node.parentElement) {
                if (['auto', 'scroll'].includes(getComputedStyle(node).overflowX)) return true;
            }
            return false;
        };
        const found: string[] = [];
        if (document.documentElement.scrollWidth > viewportWidth) found.push('document');
        for (const el of document.body.querySelectorAll('*')) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.right <= viewportWidth + 1) continue;
            if (getComputedStyle(el).position === 'fixed' || hasScrollableAncestor(el)) continue;
            found.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
        }
        return found.slice(0, 5);
    });
    expect(offenders, 'content overflows the viewport horizontally').toEqual([]);
};
