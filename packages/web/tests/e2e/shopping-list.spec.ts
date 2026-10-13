import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_SHOPPING_LIST } from './mocks/auth';
import { apiCreateBead, apiCreateDesign } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_SHOPPING_LIST;
test.use({ authToken: TOKEN });

async function seedTwoDesignsSharingABead() {
    // One 50-bead pack at £5 in stock
    const bead = await apiCreateBead(TOKEN, {
        name: 'Shared Bead',
        brand: 'BeadCo',
        purchaseUrl: 'http://example.com/shared-bead',
        quantity: 50,
        packs: 1,
        pricePerPack: 5,
    });
    await apiCreateDesign(TOKEN, { name: 'Big Bracelet', materials: [{ ...bead, requiredQuantity: 20 }] });
    await apiCreateDesign(TOKEN, { name: 'Small Ring', materials: [{ ...bead, requiredQuantity: 10 }] });
}

async function addTarget(page: Page, design: string, quantity: number) {
    await page.getByRole('button', { name: 'Add item', exact: true }).click();
    const row = page.getByTestId('shopping-target').last();
    await row.getByRole('combobox', { name: 'Design' }).selectOption({ label: design });
    await row.getByRole('spinbutton', { name: 'Quantity' }).fill(String(quantity));
}

test.describe
    .serial('Shopping list', () => {
        test('nothing to build until an item with a quantity is added', async ({ authenticatedPage: page }) => {
            await seedTwoDesignsSharingABead();
            await page.goto('/shopping-list');

            const build = page.getByRole('button', { name: 'Build list', exact: true });
            await expect(build).toBeDisabled();
            await addTarget(page, 'Small Ring', 0);
            await expect(build).toBeDisabled();
            await page.getByTestId('shopping-target').getByRole('spinbutton', { name: 'Quantity' }).fill('1');
            await expect(build).toBeEnabled();
        });

        test('combines what several designs need and removing an item rebuilds it', async ({
            authenticatedPage: page,
        }) => {
            await seedTwoDesignsSharingABead();
            await page.goto('/shopping-list');

            // 2 × 20 + 3 × 10 = 70 needed, 50 in stock: short 20, so one more pack
            await addTarget(page, 'Big Bracelet', 2);
            await addTarget(page, 'Small Ring', 3);
            await page.getByRole('button', { name: 'Build list', exact: true }).click();

            const result = page.getByTestId('shopping-list-result');
            await expect(result.getByText('Estimated cost £5.00')).toBeVisible();
            await expect(result.getByText('Materials you need to buy are listed first.')).toBeVisible();
            const line = result.getByRole('row', { name: /Shared Bead/ });
            await expect(line.getByRole('cell')).toHaveText([
                'Shared Bead',
                '70 pcs',
                '50 pcs',
                '20 pcs',
                '1 × 50 pcs',
                '£5.00',
            ]);
            await expect(line.getByRole('link', { name: 'Shared Bead' })).toHaveAttribute(
                'href',
                'http://example.com/shared-bead'
            );

            await page.getByTestId('shopping-target').last().getByRole('button', { name: 'Remove' }).click();
            await expect(page.getByTestId('shopping-target')).toHaveCount(1);
            await page.getByRole('button', { name: 'Build list', exact: true }).click();
            await expect(result.getByText('You already have everything you need.')).toBeVisible();
            await expect(result.getByText('Estimated cost £0.00')).toBeVisible();
        });

        test('the variant picked decides which materials are needed', async ({ authenticatedPage: page }) => {
            const amethyst = await apiCreateBead(TOKEN, { name: 'Amethyst Bead', quantity: 10, packs: 1 });
            const quartz = await apiCreateBead(TOKEN, { name: 'Quartz Bead', quantity: 10, packs: 1 });
            await apiCreateDesign(TOKEN, {
                name: 'Gem Drops',
                variationGroups: [
                    {
                        id: 'vg-1',
                        name: 'Gemstone',
                        required: 2,
                        options: [
                            { id: 'opt-1', material: { ...amethyst, requiredQuantity: 2 } },
                            { id: 'opt-2', material: { ...quartz, requiredQuantity: 2 } },
                        ],
                    },
                ],
                variants: [
                    {
                        id: 'v-1',
                        optionIds: ['opt-1'],
                        name: 'Amethyst',
                        totalQuantity: 0,
                        totalMaterialCosts: 0,
                        price: 1,
                    },
                    {
                        id: 'v-2',
                        optionIds: ['opt-2'],
                        name: 'Quartz',
                        totalQuantity: 0,
                        totalMaterialCosts: 0,
                        price: 1,
                    },
                ],
            });
            await page.goto('/shopping-list');

            await addTarget(page, 'Gem Drops', 1);
            const target = page.getByTestId('shopping-target');
            await expect(target.getByRole('combobox', { name: 'Variant' })).toHaveValue('v-1');
            await page.getByRole('button', { name: 'Build list', exact: true }).click();
            const result = page.getByTestId('shopping-list-result');
            await expect(result.getByRole('row', { name: /Amethyst Bead/ })).toBeVisible();
            await expect(result.getByRole('row', { name: /Quartz Bead/ })).toHaveCount(0);

            await target.getByRole('combobox', { name: 'Variant' }).selectOption({ label: 'Quartz' });
            await page.getByRole('button', { name: 'Build list', exact: true }).click();
            await expect(result.getByRole('row', { name: /Quartz Bead/ })).toBeVisible();
            await expect(result.getByRole('row', { name: /Amethyst Bead/ })).toHaveCount(0);
        });

        test('the list can be copied and downloaded', async ({ authenticatedPage: page, context }) => {
            await context.grantPermissions(['clipboard-read', 'clipboard-write']);
            await seedTwoDesignsSharingABead();
            await page.goto('/shopping-list');
            await addTarget(page, 'Big Bracelet', 5);
            await page.getByRole('button', { name: 'Build list', exact: true }).click();

            // 100 needed, 50 in stock: one more pack
            const result = page.getByTestId('shopping-list-result');
            await result.getByRole('button', { name: 'Copy' }).click();
            await expect(result.getByRole('button', { name: 'Copied' })).toBeVisible();
            expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
                'Shared Bead (BeadCo): 1 pack(s) of 50 pcs, £5.00 - http://example.com/shared-bead\nTotal: £5.00'
            );

            const downloadPromise = page.waitForEvent('download');
            await result.getByRole('button', { name: 'Download CSV' }).click();
            const download = await downloadPromise;
            expect(download.suggestedFilename()).toBe('shopping-list.csv');
            const csv = await readFile((await download.path()) as string, 'utf8');
            const [header, row] = csv.split('\n');
            expect(header).toBe(
                '"Material","Brand","Unit","Required","In stock","Shortfall","Pack size","Packs to buy","Price per pack","Estimated cost","Purchase URL"'
            );
            expect(row).toBe(
                '"Shared Bead","BeadCo","pcs","100","50","50","50","1","5","5","http://example.com/shared-bead"'
            );
        });

        test('a failed build shows an error', async ({ authenticatedPage: page }) => {
            await seedTwoDesignsSharingABead();
            await page.route('**/api/shopping-list', (route) => route.fulfill({ status: 500, json: {} }));
            await page.goto('/shopping-list');
            await addTarget(page, 'Small Ring', 1);
            await page.getByRole('button', { name: 'Build list', exact: true }).click();

            await expect(page.getByText("Couldn't build the list.")).toBeVisible();
            await expect(page.getByTestId('shopping-list-result')).toHaveCount(0);
        });
    });
