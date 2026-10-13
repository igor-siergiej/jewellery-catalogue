import { expect, test } from './fixtures';
import { MOCK_TOKEN_VIEW_DESIGN, MOCK_TOKEN_VIEW_DESIGN_OTHER } from './mocks/auth';
import { TEST_PNG } from './utils/add-design-form';
import {
    apiCleanup,
    apiCreateBead,
    apiCreateDesign,
    apiGetDesigns,
    apiGetMaterials,
    apiProduceDesignVariant,
} from './utils/api-helpers';
import { stripDesignEditImageUploads, uploadedImageId } from './utils/upload-mocks';

const TOKEN = MOCK_TOKEN_VIEW_DESIGN;
test.use({ authToken: TOKEN });

async function seedSimpleDesign(beadQuantity = 100) {
    const bead = await apiCreateBead(TOKEN, {
        name: 'Silver Spacer',
        colour: 'red',
        quantity: beadQuantity,
        pricePerPack: 5,
    });
    return apiCreateDesign(TOKEN, {
        name: 'Spacer Ring',
        designType: 'RING',
        timeRequired: '0:30',
        materials: [{ ...bead, requiredQuantity: 10 }],
        totalMaterialCosts: 0.5,
        price: 7.8,
        lowStockThreshold: 3,
        description: '<p>Hand-wrapped silver ring.</p>',
    });
}

test.describe
    .serial('View design', () => {
        test('shows the details of a simple design', async ({ authenticatedPage: page }) => {
            const design = await seedSimpleDesign();
            await page.goto(`/designs/${design.id}`);

            await expect(page.getByRole('heading', { level: 1, name: 'Spacer Ring' })).toBeVisible();
            await expect(page.getByText('Rings', { exact: true })).toBeVisible();
            await expect(page.getByText('£7.80')).toBeVisible();
            await expect(page.getByText('0 in stock')).toBeVisible();
            // 100 beads / 10 per design
            await expect(page.getByTestId('can-make')).toHaveText('Can make 10');
            await expect(page.getByText('£0.50')).toBeVisible();
            await expect(page.getByText('Hand-wrapped silver ring.')).toBeVisible();

            const material = page.getByRole('row', { name: /Silver Spacer/ });
            await expect(material).toContainText('Bead');
            await expect(material).toContainText('red');
            await expect(material).toContainText('10 pcs');
            await material.getByRole('link', { name: 'Silver Spacer' }).click();
            await expect(page).toHaveURL(/\/materials$/);
        });

        test('shows a variant design with per-variant prices and what can be made', async ({
            authenticatedPage: page,
        }) => {
            const amethyst = await apiCreateBead(TOKEN, { name: 'Amethyst Bead', quantity: 20, pricePerPack: 10 });
            const quartz = await apiCreateBead(TOKEN, { name: 'Quartz Bead', quantity: 4, pricePerPack: 4 });
            const design = await apiCreateDesign(TOKEN, {
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
                        name: 'Amethyst Bead',
                        totalQuantity: 0,
                        totalMaterialCosts: 1,
                        price: 9,
                    },
                    {
                        id: 'v-2',
                        optionIds: ['opt-2'],
                        name: 'Quartz Bead',
                        totalQuantity: 0,
                        totalMaterialCosts: 0.4,
                        price: 8,
                    },
                ],
            });
            // Uses 8 of the 20 amethyst beads
            await apiProduceDesignVariant(TOKEN, design.id, 'v-1', 4);
            await page.goto(`/designs/${design.id}`);

            const amethystRow = page.getByRole('row', { name: /Amethyst Bead/ });
            await expect(amethystRow.getByRole('cell')).toHaveText(['Amethyst Bead', '£1.00', '£9.00', '4', '6']);
            const quartzRow = page.getByRole('row', { name: /Quartz Bead/ });
            await expect(quartzRow.getByRole('cell')).toHaveText(['Quartz Bead', '£0.40', '£8.00', '0', '2']);
            await expect(page.getByTestId('can-make')).toHaveText('Can make up to 6');
        });

        test('editing design properties persists across reload', async ({ authenticatedPage: page }) => {
            const design = await seedSimpleDesign();
            await stripDesignEditImageUploads(page);
            await page.goto(`/designs/${design.id}`);

            await page.getByRole('button', { name: 'Edit Details' }).click();
            const dialog = page.getByRole('dialog', { name: 'Edit Design Properties' });
            await dialog.getByPlaceholder('Enter design name').fill('Renamed Ring');
            await dialog.getByRole('button', { name: 'Necklaces' }).click();
            await dialog.getByPlaceholder('e.g., 5').fill('7');
            await dialog.getByPlaceholder('Steps, measurements, gotchas').fill('Use the round pliers.');
            await dialog.locator('input[type="file"]').first().setInputFiles(TEST_PNG('second.png'));
            await dialog.getByRole('button', { name: 'Save Changes' }).click();
            await expect(dialog).toBeHidden();

            await page.reload();
            await expect(page.getByRole('heading', { level: 1, name: 'Renamed Ring' })).toBeVisible();
            await expect(page.getByText('Necklaces', { exact: true })).toBeVisible();
            await expect(page.getByText('Use the round pliers.')).toBeVisible();

            const [saved] = await apiGetDesigns(TOKEN);
            expect(saved).toMatchObject({ name: 'Renamed Ring', designType: 'NECKLACE', lowStockThreshold: 7 });
            expect(saved.imageIds).toEqual(['test-placeholder', uploadedImageId('second.png')]);
        });

        test('cancelling the edit dialog keeps the design unchanged', async ({ authenticatedPage: page }) => {
            const design = await seedSimpleDesign();
            await page.goto(`/designs/${design.id}`);

            await page.getByRole('button', { name: 'Edit Details' }).click();
            const dialog = page.getByRole('dialog', { name: 'Edit Design Properties' });
            await dialog.getByPlaceholder('Enter design name').fill('Not Saved');
            await dialog.getByRole('button', { name: 'Cancel' }).click();

            await expect(dialog).toBeHidden();
            await expect(page.getByRole('heading', { level: 1, name: 'Spacer Ring' })).toBeVisible();
            expect((await apiGetDesigns(TOKEN))[0].name).toBe('Spacer Ring');
        });

        test('producing from the view page uses up materials', async ({ authenticatedPage: page }) => {
            const design = await seedSimpleDesign();
            await page.goto(`/designs/${design.id}`);

            await page.getByRole('button', { name: 'Manage Inventory' }).click();
            const dialog = page.getByRole('dialog', { name: 'Manage Design Inventory' });
            await expect(dialog.getByText('Maximum: 10 designs')).toBeVisible();
            await dialog.locator('input[name="addQuantity"]').fill('3');
            await expect(dialog.getByText('New Design Stock: 3 (+3)')).toBeVisible();
            await expect(dialog.getByText(/Silver Spacer: 100\.00 pcs → 70\.00 pcs/)).toBeVisible();
            await dialog.getByRole('button', { name: 'Produce Designs' }).click();

            await expect(page.getByText('3 in stock')).toBeVisible();
            await expect(page.getByTestId('can-make')).toHaveText('Can make 7');
            const [bead] = await apiGetMaterials(TOKEN);
            expect(bead.totalQuantity).toBe(70);
        });

        test('cannot produce without enough materials', async ({ authenticatedPage: page }) => {
            const design = await seedSimpleDesign(5);
            await page.goto(`/designs/${design.id}`);

            await expect(page.getByTestId('can-make')).toHaveText('Can make 0');
            await page.getByRole('button', { name: 'Manage Inventory' }).click();
            const dialog = page.getByRole('dialog', { name: 'Manage Design Inventory' });
            await expect(dialog.getByText('Cannot Produce')).toBeVisible();
            await expect(dialog.getByRole('button', { name: 'Produce Designs' })).toBeDisabled();
        });

        test('an unknown design id shows "Design not found"', async ({ authenticatedPage: page }) => {
            await page.goto('/designs/000000000000000000000000');
            await expect(page.getByText('Design not found')).toBeVisible();
        });

        test('another user\'s design shows "Design not found"', async ({ authenticatedPage: page }) => {
            await apiCleanup(MOCK_TOKEN_VIEW_DESIGN_OTHER);
            const theirs = await apiCreateDesign(MOCK_TOKEN_VIEW_DESIGN_OTHER, { name: 'Not Yours' });

            await page.goto(`/designs/${theirs.id}`);
            await expect(page.getByText('Design not found')).toBeVisible();
            await expect(page.getByText('Not Yours')).toHaveCount(0);
        });
    });
