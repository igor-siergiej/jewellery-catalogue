import { expect, test } from './fixtures';
import { MOCK_TOKEN_DESIGN_INVENTORY } from './mocks/auth';
import { apiCreateBead, apiCreateDesign, apiGetDesigns } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_DESIGN_INVENTORY;

test.use({ authToken: TOKEN });

test.describe.serial('Design inventory management', () => {
    test('designs page shows created designs', async ({ authenticatedPage: page }) => {
        await apiCreateDesign(TOKEN, { name: 'Listed Design', price: 5.0 });

        await page.goto('/designs');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Listed Design')).toBeVisible({ timeout: 10000 });
    });

    test('long design title truncates on one line without horizontal scroll', async ({ authenticatedPage: page }) => {
        const longName = 'A Very Long Design Title That Should Truncate Onto One Line Instead Of Overflowing';
        await apiCreateDesign(TOKEN, { name: longName, price: 5.0 });

        await page.setViewportSize({ width: 360, height: 800 });
        await page.goto('/designs');
        await page.waitForLoadState('networkidle');

        const card = page.getByRole('article', { name: longName });
        await expect(card).toBeVisible({ timeout: 10000 });
        const title = card.getByRole('heading', { name: longName });
        await expect(title).toHaveAttribute('title', longName);

        const cardBox = await card.boundingBox();
        const titleBox = await title.boundingBox();
        expect(cardBox).not.toBeNull();
        expect(titleBox).not.toBeNull();
        expect(titleBox!.width).toBeLessThanOrEqual(cardBox!.width);
        expect(titleBox!.height).toBeLessThan(30);

        const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );

        expect(overflow).toBeLessThanOrEqual(0);
    });

    test('delete design from designs page', async ({ authenticatedPage: page }) => {
        await apiCreateDesign(TOKEN, { name: 'Deletable Design', price: 2.0 });

        await page.goto('/designs');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Deletable Design')).toBeVisible({ timeout: 10000 });

        await page.getByRole('button', { name: /^More actions for / }).click();
        await page.getByRole('menuitem', { name: 'Delete' }).click();

        await expect(page.getByText('Delete Deletable Design?')).toBeVisible({ timeout: 5000 });
        await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();

        await expect(page.getByRole('article', { name: 'Deletable Design' })).not.toBeVisible({
            timeout: 10000,
        });
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

        await page.getByRole('button', { name: /^More actions for / }).click();
        await page.getByRole('menuitem', { name: 'Manage inventory' }).click();

        await expect(page.getByRole('dialog', { name: /^Stock for / })).toBeVisible({ timeout: 10000 });

        await page.locator('input[name="addQuantity"]').fill('3');

        await page.getByRole('button', { name: 'Produce designs' }).click();

        await expect(page.getByText('Design inventory updated')).toBeVisible({ timeout: 10000 });

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

        await page.getByRole('button', { name: /^More actions for / }).click();
        await page.getByRole('menuitem', { name: 'Manage inventory' }).click();

        await expect(page.getByRole('dialog', { name: /^Stock for / })).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('heading', { name: 'Variant to produce' })).toBeVisible();

        await page.locator('tr').filter({ hasText: 'Red' }).click();

        await page.locator('input[name="addQuantity"]').fill('2');
        await page.getByRole('button', { name: 'Produce designs' }).click();

        await expect(page.getByText('Design inventory updated')).toBeVisible({ timeout: 10000 });

        const designs = await apiGetDesigns(TOKEN);
        const design = designs.find((d) => d.name === 'Variant Production Design');
        const redVariant = design?.variants?.find((v: any) => v.id === 'v-1');
        expect((redVariant as any).totalQuantity).toBe(2);
    });
});
