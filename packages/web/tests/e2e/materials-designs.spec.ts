import { expect, test } from './fixtures';
import { MOCK_TOKEN } from './mocks/auth';
import { apiCreateBead, apiCreateDesign, apiGetDesigns, apiProduceDesignVariant } from './utils/api-helpers';

test.describe
    .serial('Material pricing and low stock variant flows', () => {
        test('material price change triggers "Update Design Prices?" dialog', async ({ authenticatedPage: page }) => {
            const bead = await apiCreateBead(MOCK_TOKEN, { name: 'Pricing Test Bead', pricePerPack: 5.0 });
            await apiCreateDesign(MOCK_TOKEN, {
                name: 'Pricing Test Design',
                materials: [{ ...bead, requiredQuantity: 10 }],
                totalMaterialCosts: 10 * (bead as any).pricePerBead,
                price: 2.0,
            });

            await page.goto('/materials');
            await page.waitForLoadState('networkidle');

            await page.locator(`tr:has-text("Pricing Test Bead") button:has(span:text("Edit material"))`).click();
            await page.waitForSelector('input[name="pricePerPack"]', { timeout: 10000 });

            await page.locator('input[name="pricePerPack"]').fill('9.99');
            await page.getByRole('button', { name: 'Update Material' }).click();

            await expect(page.getByText('Update Design Prices?')).toBeVisible({ timeout: 10000 });
            await expect(page.getByText(/1 design/)).toBeVisible();

            await page.getByRole('button', { name: 'Update Prices' }).click();

            await expect(page.getByText('Prices updated!')).toBeVisible({ timeout: 10000 });
        });

        test('skipping price dialog does not trigger price update', async ({ authenticatedPage: page }) => {
            const bead = await apiCreateBead(MOCK_TOKEN, { name: 'Skip Test Bead', pricePerPack: 5.0 });
            await apiCreateDesign(MOCK_TOKEN, {
                name: 'Skip Test Design',
                materials: [{ ...bead, requiredQuantity: 10 }],
                totalMaterialCosts: 10 * (bead as any).pricePerBead,
                price: 2.0,
            });

            await page.goto('/materials');
            await page.waitForLoadState('networkidle');

            await page.locator(`tr:has-text("Skip Test Bead") button:has(span:text("Edit material"))`).click();
            await page.waitForSelector('input[name="pricePerPack"]', { timeout: 10000 });

            await page.locator('input[name="pricePerPack"]').fill('9.99');
            await page.getByRole('button', { name: 'Update Material' }).click();

            await expect(page.getByText('Update Design Prices?')).toBeVisible({ timeout: 10000 });
            await page.getByRole('button', { name: 'Skip' }).click();

            await expect(page.getByText('Update Design Prices?')).not.toBeVisible();
            await expect(page.getByText('Prices updated!')).not.toBeVisible();
        });

        test('material cost update propagates to variant totalMaterialCosts', async ({ authenticatedPage: page }) => {
            const bead = await apiCreateBead(MOCK_TOKEN, {
                name: 'Variant Cost Bead',
                pricePerPack: 5.0,
                quantity: 100,
            });
            const initialPricePerBead = (bead as any).pricePerBead as number;
            const requiredQuantity = 10;
            const initialVariantCost = parseFloat((requiredQuantity * initialPricePerBead).toFixed(2));

            await apiCreateDesign(MOCK_TOKEN, {
                name: 'Variant Cost Design',
                materials: [],
                totalMaterialCosts: initialVariantCost,
                price: 2.0,
                lowStockThreshold: 2,
                variationGroups: [
                    {
                        id: 'vg-1',
                        name: 'Color',
                        required: requiredQuantity,
                        options: [
                            { id: 'opt-1', material: { ...bead, requiredQuantity } },
                            { id: 'opt-2', material: { ...bead, requiredQuantity } },
                        ],
                    },
                ],
                variants: [
                    {
                        id: 'v-1',
                        optionIds: ['opt-1'],
                        name: 'Red',
                        totalQuantity: 0,
                        totalMaterialCosts: initialVariantCost,
                        price: 2.0,
                        lowStockThreshold: 2,
                    },
                    {
                        id: 'v-2',
                        optionIds: ['opt-2'],
                        name: 'Blue',
                        totalQuantity: 0,
                        totalMaterialCosts: initialVariantCost,
                        price: 2.0,
                        lowStockThreshold: 2,
                    },
                ],
            });

            await page.goto('/materials');
            await page.waitForLoadState('networkidle');

            await page.locator(`tr:has-text("Variant Cost Bead") button:has(span:text("Edit material"))`).click();
            await page.waitForSelector('input[name="pricePerPack"]', { timeout: 10000 });

            await page.locator('input[name="pricePerPack"]').fill('20.00');
            await page.getByRole('button', { name: 'Update Material' }).click();

            await expect(page.getByText('Update Design Prices?')).toBeVisible({ timeout: 10000 });
            await page.getByRole('button', { name: 'Update Prices' }).click();
            await expect(page.getByText('Prices updated!')).toBeVisible({ timeout: 10000 });

            const designs = await apiGetDesigns(MOCK_TOKEN);
            const design = designs.find((d) => d.name === 'Variant Cost Design');

            expect(design).toBeTruthy();
            for (const variant of design!.variants!) {
                expect(variant.totalMaterialCosts).toBeGreaterThan(initialVariantCost);
            }
        });

        test('low stock page edit button pre-selects variant in production dialog', async ({
            authenticatedPage: page,
        }) => {
            const bead1 = await apiCreateBead(MOCK_TOKEN, {
                name: 'Ruby Bead',
                colour: 'ruby',
                pricePerPack: 5.0,
            });
            const bead2 = await apiCreateBead(MOCK_TOKEN, {
                name: 'Sapphire Bead',
                colour: 'sapphire',
                pricePerPack: 5.0,
            });

            const design = await apiCreateDesign(MOCK_TOKEN, {
                name: 'Variant Select Design',
                materials: [],
                totalMaterialCosts: 0.5,
                price: 2.0,
                lowStockThreshold: 5,
                variationGroups: [buildVariantGroup(bead1, bead2, 10)],
                variants: [
                    buildVariant('v-1', 'opt-1', bead1.name, 0, 0.5, 5),
                    buildVariant('v-2', 'opt-2', bead2.name, 0, 0.5, 5),
                ],
            });

            await page.goto('/home');
            await page.waitForLoadState('networkidle');

            const variant1RowName = `${design.name} — ${bead1.name}`;
            const variant1Row = page.locator('tr').filter({ hasText: variant1RowName });
            await expect(variant1Row).toBeVisible({ timeout: 10000 });

            await variant1Row.locator('button:has(span:text("Edit design"))').click();

            await expect(page.getByText('Manage Design Inventory')).toBeVisible({ timeout: 10000 });
            await expect(page.getByRole('heading', { name: 'Select Variant to Produce' })).toBeVisible();

            const selectedBadge = page.locator(`tr:has-text("${bead1.name}")`).filter({ hasText: 'Selected' });
            await expect(selectedBadge).toBeVisible();
        });

        test('low stock dashboard shows only the low-stock variant row, not the in-stock one', async ({
            authenticatedPage: page,
        }) => {
            const bead1 = await apiCreateBead(MOCK_TOKEN, {
                name: 'Amber Bead',
                colour: 'amber',
                quantity: 100,
                packs: 1,
                pricePerPack: 5.0,
            });
            const bead2 = await apiCreateBead(MOCK_TOKEN, {
                name: 'Coral Bead',
                colour: 'coral',
                quantity: 100,
                packs: 1,
                pricePerPack: 5.0,
            });

            const design = await apiCreateDesign(MOCK_TOKEN, {
                name: 'Per Variant Stock Design',
                materials: [],
                totalMaterialCosts: 0.5,
                price: 2.0,
                lowStockThreshold: 5,
                variationGroups: [buildVariantGroup(bead1, bead2, 10)],
                variants: [
                    buildVariant('v-1', 'opt-1', bead1.name, 0, 0.5, 5),
                    buildVariant('v-2', 'opt-2', bead2.name, 0, 0.5, 5),
                ],
            });

            // Produce 5 of variant 1 so it's no longer low stock (totalQuantity = 5 = threshold)
            await apiProduceDesignVariant(MOCK_TOKEN, design.id, 'v-1', 5);

            await page.goto('/home');
            await page.waitForLoadState('networkidle');

            const v2RowName = `${design.name} — ${bead2.name}`;
            const v1RowName = `${design.name} — ${bead1.name}`;

            await expect(page.locator('tr').filter({ hasText: v2RowName })).toBeVisible({ timeout: 10000 });
            await expect(page.locator('tr').filter({ hasText: v1RowName })).not.toBeVisible();
        });
    });

type BeadResult = Record<string, unknown> & { id: string; name: string };

function buildVariantGroup(bead1: BeadResult, bead2: BeadResult, requiredQuantity: number) {
    return {
        id: 'vg-1',
        name: 'Color',
        required: requiredQuantity,
        options: [
            { id: 'opt-1', material: { ...bead1, requiredQuantity } },
            { id: 'opt-2', material: { ...bead2, requiredQuantity } },
        ],
    };
}

function buildVariant(
    id: string,
    optionId: string,
    name: string,
    totalQuantity: number,
    totalMaterialCosts: number,
    lowStockThreshold: number
) {
    return {
        id,
        optionIds: [optionId],
        name,
        totalQuantity,
        totalMaterialCosts,
        price: 2.0,
        lowStockThreshold,
    };
}
