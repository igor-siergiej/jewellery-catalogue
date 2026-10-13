import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_DATA_EXPORT, MOCK_TOKEN_DATA_EXPORT_OTHER } from './mocks/auth';
import { apiCleanup, apiCreateBead, apiCreateDesign } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_DATA_EXPORT;

test.use({ authToken: TOKEN });

test.describe
    .serial('Data export from Settings', () => {
        // The authenticatedPage fixture clears this user's data on setup, so seed inside each test.
        const seed = async () => {
            await apiCleanup(MOCK_TOKEN_DATA_EXPORT_OTHER);
            await apiCreateBead(TOKEN, { name: 'Export Opal, 4mm' });
            await apiCreateBead(MOCK_TOKEN_DATA_EXPORT_OTHER, { name: 'Someone Else Bead' });
        };

        test.afterAll(async () => {
            await Promise.all([apiCleanup(TOKEN), apiCleanup(MOCK_TOKEN_DATA_EXPORT_OTHER)]);
        });

        test('downloads a materials CSV with only this user’s materials', async ({ authenticatedPage: page }) => {
            await seed();
            await page.goto('/settings');

            const downloadPromise = page.waitForEvent('download');
            await page.getByRole('button', { name: 'Materials (CSV)' }).click();
            const download = await downloadPromise;

            expect(download.suggestedFilename()).toMatch(/^materials-\d{4}-\d{2}-\d{2}\.csv$/);
            const content = await readFile((await download.path()) as string, 'utf8');
            expect(content.startsWith('﻿')).toBe(true);
            expect(content).toContain('Name,Brand,Type,Code,Stock,Unit');
            expect(content).toContain('"Export Opal, 4mm"');
            expect(content).not.toContain('Someone Else Bead');
        });

        test('downloads a designs CSV with one row per design', async ({ authenticatedPage: page }) => {
            await seed();
            await apiCreateDesign(TOKEN, { name: 'Export Hoops', price: 12.5, designType: 'EARRINGS' });
            await apiCreateDesign(MOCK_TOKEN_DATA_EXPORT_OTHER, { name: 'Someone Else Design' });
            await page.goto('/settings');

            const downloadPromise = page.waitForEvent('download');
            await page.getByRole('button', { name: 'Designs (CSV)' }).click();
            const download = await downloadPromise;

            expect(download.suggestedFilename()).toMatch(/^designs-\d{4}-\d{2}-\d{2}\.csv$/);
            const content = await readFile((await download.path()) as string, 'utf8');
            expect(content).toContain('Design,Variant,Price,Material cost,Stock');
            expect(content).toContain('Export Hoops,,12.5,');
            expect(content).not.toContain('Someone Else Design');
        });

        test('downloads a JSON backup', async ({ authenticatedPage: page }) => {
            await seed();
            await page.goto('/settings');

            const downloadPromise = page.waitForEvent('download');
            await page.getByRole('button', { name: 'Full backup (JSON)' }).click();
            const download = await downloadPromise;

            const backup = JSON.parse(await readFile((await download.path()) as string, 'utf8'));
            expect(backup.version).toBe(1);
            expect(backup.materials.map((m: { name: string }) => m.name)).toEqual(['Export Opal, 4mm']);
        });
    });
