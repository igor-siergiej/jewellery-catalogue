import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ANALYTICS_WEBSITE_ID, mockAnalytics } from './mocks/analytics';
import {
    MOCK_TOKEN_ANALYTICS_DESIGN_VIEWED,
    MOCK_TOKEN_ANALYTICS_EVENTS,
    MOCK_TOKEN_ANALYTICS_FAVOURITE,
} from './mocks/auth';
import { apiCreateDesign } from './utils/api-helpers';

const POLL = { timeout: 15000 };

// Unique per run: a design left over from an earlier run would make the
// name ambiguous on the Designs page.
const uniqueName = (label: string) => `${label} ${Date.now().toString(36)}`;

const designCard = (page: Page, name: string) =>
    page.locator('[data-slot="item"]').filter({ has: page.getByText(name) });

// Not tagged @smoke: these flows need a signed-in app and seeded data, so they
// only run against the local stack. The post-deploy smoke covers the page view
// (tests/e2e/analytics.spec.ts).
// Each test has its own token: the fixture wipes the catalogue it is given, so
// tests sharing one would delete each other's data.
test.describe
    .serial('Given the analytics events', () => {
        test.describe('when the user searches', () => {
            test.use({ authToken: MOCK_TOKEN_ANALYTICS_EVENTS });

            test('search_performed reaches the tracker', async ({ authenticatedPage: page }) => {
                const hits = await mockAnalytics(page);

                await page.goto('/designs');
                await page.getByPlaceholder('Search designs...').fill('ring');

                await expect
                    .poll(() => hits.find((h) => h.payload.name === 'search_performed')?.payload.data?.scope, POLL)
                    .toBe('designs');

                const data = hits.find((h) => h.payload.name === 'search_performed')?.payload.data;
                expect(typeof data?.results).toBe('number');
            });
        });

        test.describe('when a design is opened', () => {
            test.use({ authToken: MOCK_TOKEN_ANALYTICS_DESIGN_VIEWED });

            test('design_viewed carries its id and source', async ({ authenticatedPage: page }) => {
                const name = uniqueName('Analytics Event Ring');
                const design = await apiCreateDesign(MOCK_TOKEN_ANALYTICS_DESIGN_VIEWED, { name });
                const hits = await mockAnalytics(page);

                await page.goto('/designs');
                await page.getByText(name).click();

                await expect
                    .poll(() => hits.find((h) => h.payload.name === 'design_viewed')?.payload.data, POLL)
                    .toEqual({ designId: design.id, source: 'designs' });
            });
        });

        test.describe('when a design is favourited', () => {
            test.use({ authToken: MOCK_TOKEN_ANALYTICS_FAVOURITE });

            test('favourite_added reaches the tracker', async ({ authenticatedPage: page }) => {
                const name = uniqueName('Analytics Favourite Ring');
                const design = await apiCreateDesign(MOCK_TOKEN_ANALYTICS_FAVOURITE, { name });
                const hits = await mockAnalytics(page);

                await page.goto('/designs');
                await designCard(page, name).getByRole('button', { name: 'Favourite design' }).click();

                await expect
                    .poll(() => hits.find((h) => h.payload.name === 'favourite_added')?.payload.data, POLL)
                    .toEqual({ designId: design.id });
                expect(hits.every((h) => h.payload.website === ANALYTICS_WEBSITE_ID)).toBe(true);
            });
        });
    });
