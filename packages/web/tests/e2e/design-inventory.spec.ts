import { expect, test } from './fixtures';
import { MOCK_TOKEN_DESIGN_INVENTORY } from './mocks/auth';
import { apiCreateBead, apiCreateDesign, apiGetDesigns } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_DESIGN_INVENTORY;

test.use({ authToken: TOKEN });

test.describe
    .serial('Design inventory management', () => {
        test('designs page shows created designs', async ({ authenticatedPage: page }) => {
            await apiCreateDesign(TOKEN, { name: 'Listed Design', price: 5.0 });

            await page.goto('/designs');
            await page.waitForLoadState('networkidle');

            await expect(page.getByText('Listed Design')).toBeVisible({ timeout: 10000 });
        });

        test('delete design from designs page', async ({ authenticatedPage: page }) => {
            await apiCreateDesign(TOKEN, { name: 'Deletable Design', price: 2.0 });

            await page.goto('/designs');
            await page.waitForLoadState('networkidle');

            await expect(page.getByText('Deletable Design')).toBeVisible({ timeout: 10000 });

            await page.locator('[title="Delete Design"]').click();

            await expect(page.getByText('Delete Deletable Design?')).toBeVisible({ timeout: 5000 });
            await page.getByRole('button', { name: 'Delete' }).click();

            await expect(
                page.locator('[data-slot="item-title"]').filter({ hasText: 'Deletable Design' })
            ).not.toBeVisible({ timeout: 10000 });
        });

        test('produce simple design updates stock', async ({ authenticatedPage: page }) => {
            const bead = await apiCreateBead(TOKEN, {
                name: 'Produce Bead',
                quantity: 100,
                packs: 1,
                pricePerPack: 5.0,
            });

            await apiCreateDesign(TOKEN, {
                name: 'Producible Design',
                materials: [{ ...bead, requiredQuantity: 10 }],
                totalMaterialCosts: 10 * (bead as any).pricePerBead,
                price: 2.0,
            });

            await page.goto('/designs');
            await page.waitForLoadState('networkidle');

            await page.locator('[title="Manage Inventory"]').click();

            await expect(page.getByText('Manage Design Inventory')).toBeVisible({ timeout: 10000 });

            await page.locator('input[name="addQuantity"]').fill('3');

            await page.getByRole('button', { name: 'Produce Designs' }).click();

            await expect(page.getByText('Design inventory updated successfully!')).toBeVisible({ timeout: 10000 });

            const designs = await apiGetDesigns(TOKEN);
            const design = designs.find((d) => d.name === 'Producible Design');
            expect((design as any).totalQuantity).toBe(3);
        });

        test('produce variant design with pre-selected variant', async ({ authenticatedPage: page }) => {
            const bead1 = await apiCreateBead(TOKEN, {
                name: 'Red Bead',
                colour: 'red',
                quantity: 100,
                packs: 1,
                pricePerPack: 5.0,
            });
            const bead2 = await apiCreateBead(TOKEN, {
                name: 'Blue Bead',
                colour: 'blue',
                quantity: 100,
                packs: 1,
                pricePerPack: 5.0,
            });

            const requiredQuantity = 10;
            const pricePerBead = (bead1 as any).pricePerBead as number;

            await apiCreateDesign(TOKEN, {
                name: 'Variant Production Design',
                materials: [],
                totalMaterialCosts: requiredQuantity * pricePerBead,
                price: 2.0,
                lowStockThreshold: 2,
                variationGroups: [
                    {
                        id: 'vg-1',
                        name: 'Color',
                        required: requiredQuantity,
                        options: [
                            { id: 'opt-1', material: { ...bead1, requiredQuantity } },
                            { id: 'opt-2', material: { ...bead2, requiredQuantity } },
                        ],
                    },
                ],
                variants: [
                    {
                        id: 'v-1',
                        optionIds: ['opt-1'],
                        name: 'Red',
                        totalQuantity: 0,
                        totalMaterialCosts: requiredQuantity * pricePerBead,
                        price: 2.0,
                        lowStockThreshold: 2,
                    },
                    {
                        id: 'v-2',
                        optionIds: ['opt-2'],
                        name: 'Blue',
                        totalQuantity: 0,
                        totalMaterialCosts: requiredQuantity * pricePerBead,
                        price: 2.0,
                        lowStockThreshold: 2,
                    },
                ],
            });

            await page.goto('/designs');
            await page.waitForLoadState('networkidle');

            await page.locator('[title="Manage Inventory"]').click();

            await expect(page.getByText('Manage Design Inventory')).toBeVisible({ timeout: 10000 });
            await expect(page.getByRole('heading', { name: 'Select Variant to Produce' })).toBeVisible();

            await page.locator('tr').filter({ hasText: 'Red' }).click();

            await page.locator('input[name="addQuantity"]').fill('2');
            await page.getByRole('button', { name: 'Produce Designs' }).click();

            await expect(page.getByText('Design inventory updated successfully!')).toBeVisible({ timeout: 10000 });

            const designs = await apiGetDesigns(TOKEN);
            const design = designs.find((d) => d.name === 'Variant Production Design');
            const redVariant = design?.variants?.find((v: any) => v.id === 'v-1');
            expect((redVariant as any).totalQuantity).toBe(2);
        });
    });
