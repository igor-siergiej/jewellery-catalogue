import path from 'node:path';

import { expect, test } from './fixtures';
import { MOCK_TOKEN_IMPORTS } from './mocks/auth';

test.use({ authToken: MOCK_TOKEN_IMPORTS });

test.describe
    .serial('Etsy bulk import flow', () => {
        test('upload → preview → start run → run detail reaches a terminal state', async ({
            authenticatedPage: page,
        }) => {
            await page.goto('/imports');
            await page.waitForLoadState('networkidle');
            await page.getByRole('button', { name: 'New import' }).click();
            await expect(page).toHaveURL(/\/imports\/new/);

            const csv = path.join(__dirname, 'fixtures', 'etsy-listings.csv');
            await page.locator('input[type="file"]').setInputFiles(csv);

            await expect(page.getByRole('button', { name: 'Start import' })).toBeVisible({ timeout: 15000 });
            await page.getByRole('button', { name: 'Start import' }).click();

            await expect(page).toHaveURL(/\/imports\/(?!new)[^/]+$/, { timeout: 10000 });

            // Terminal state can be completed, failed, or cancelled — image fetches to
            // i.etsystatic.com may fail in CI, but the run must still finish and report counts.
            await expect(page.getByText(/completed|failed|cancelled/).first()).toBeVisible({ timeout: 120000 });
            await expect(page.getByText(/of \d+ listings processed/)).toBeVisible();

            await page.goto('/imports');
            // Runs accumulate in the persistent e2e database across attempts — assert on the first row.
            await expect(page.getByRole('cell', { name: 'etsy-listings.csv' }).first()).toBeVisible({
                timeout: 10000,
            });
        });
    });
