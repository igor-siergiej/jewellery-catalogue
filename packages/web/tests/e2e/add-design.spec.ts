import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_ADD_DESIGN } from './mocks/auth';
import { addSharedMaterial, TEST_PNG } from './utils/add-design-form';
import { apiCreateBead, apiGetDesigns, apiSetUserSettings } from './utils/api-helpers';
import { mockDraftImageUpload, stripDesignImageUploads, uploadedImageId } from './utils/upload-mocks';

const TOKEN = MOCK_TOKEN_ADD_DESIGN;
test.use({ authToken: TOKEN });

const PNG = TEST_PNG('ring.png');

async function seed() {
    // £12/h for 30 min = £6 labour, 20% margin
    await apiSetUserSettings(TOKEN, { hourlyWage: 12, profitMargin: 20 });
    await apiCreateBead(TOKEN, { name: 'Silver Spacer', pricePerPack: 5, quantity: 100 });
    await apiCreateBead(TOKEN, { name: 'Amethyst Bead', pricePerPack: 10, quantity: 20 });
    await apiCreateBead(TOKEN, { name: 'Quartz Bead', pricePerPack: 4, quantity: 20 });
}

async function openAddDesign(page: Page) {
    await seed();
    await stripDesignImageUploads(page);
    await mockDraftImageUpload(page);
    await page.goto('/addDesign');
    await expect(page.getByRole('heading', { name: 'Adding New Design' })).toBeVisible();
}

async function fillBasics(page: Page, name: string) {
    await page.getByPlaceholder('Enter design name').fill(name);
    await page.getByLabel('Time Spent Crafting').fill('00:30');
    await page.locator('form').getByRole('button', { name: 'Earrings' }).click();
    await page.locator('input[type="file"]').first().setInputFiles(PNG);
}

test.describe
    .serial('Add Design', () => {
        test('creates a simple design with materials, price, maker docs and stock alert', async ({
            authenticatedPage: page,
        }) => {
            await openAddDesign(page);
            await fillBasics(page, 'Spacer Studs');
            await addSharedMaterial(page, 'Silver Spacer', 10);

            // 10 × £0.05 = £0.50 materials, + £6 labour = £6.50, + 20% = £7.80
            await expect(page.getByText('£0.50').first()).toBeVisible();
            const finalPrice = page.getByPlaceholder('0.00');
            await expect(finalPrice).toHaveValue('7.8');

            await page.getByPlaceholder('Steps, measurements, gotchas').fill('Wrap twice, then crimp.');
            await page.getByPlaceholder('e.g., 5').fill('3');
            await page.locator('.ProseMirror').click();
            await page.keyboard.type('Dainty studs with silver spacers.');

            await page.getByRole('button', { name: 'Create Design' }).click();

            await expect(page.getByText('Added design successfully!')).toBeVisible();
            await expect(page).toHaveURL(/\/designs$/);
            await expect(page.getByText('Spacer Studs')).toBeVisible();

            const [design] = await apiGetDesigns(TOKEN);
            expect(design).toMatchObject({
                name: 'Spacer Studs',
                designType: 'EARRINGS',
                price: 7.8,
                totalMaterialCosts: 0.5,
                lowStockThreshold: 3,
                makingNotes: 'Wrap twice, then crimp.',
            });
            expect(design.description).toContain('Dainty studs with silver spacers.');
            expect(design.materials).toEqual([
                expect.objectContaining({ name: 'Silver Spacer', requiredQuantity: 10 }),
            ]);
        });

        test('overriding the final price is what gets saved', async ({ authenticatedPage: page }) => {
            await openAddDesign(page);
            await fillBasics(page, 'Override Price');
            await addSharedMaterial(page, 'Silver Spacer', 10);

            await page.getByPlaceholder('0.00').fill('15');
            await page.getByRole('button', { name: 'Create Design' }).click();
            await expect(page).toHaveURL(/\/designs$/);

            const [design] = await apiGetDesigns(TOKEN);
            expect(design.price).toBe(15);
        });

        test('variation groups generate one variant per option, each including shared materials', async ({
            authenticatedPage: page,
        }) => {
            await openAddDesign(page);
            await fillBasics(page, 'Gem Drops');
            await addSharedMaterial(page, 'Silver Spacer', 2);

            const variations = page.locator('div.grid:has(> div > h2:text-is("Variations"))');
            await variations.getByRole('button', { name: 'Add Variation Group' }).click();
            await variations.getByPlaceholder('Group name (e.g. Gemstone)').fill('Gemstone');
            await variations.getByPlaceholder('Qty').fill('1');

            await variations.getByRole('button', { name: 'Add Option' }).click();
            await variations.getByRole('combobox').nth(0).click();
            await page.getByRole('option', { name: 'Amethyst Bead' }).click();
            await variations.getByRole('button', { name: 'Add Option' }).click();
            await variations.getByRole('combobox').nth(1).click();
            await page.getByRole('option', { name: 'Quartz Bead' }).click();

            await expect(page.getByText('Shared Materials')).toBeVisible();
            await expect(page.getByText('Used in every variant')).toBeVisible();

            // shared 2 × £0.05 = £0.10; amethyst £0.50 → £0.60 → (0.60 + 6) × 1.2 = £7.92
            // quartz £0.20 → £0.30 → (0.30 + 6) × 1.2 = £7.56
            const amethyst = variations.getByRole('row', { name: /Amethyst Bead/ });
            await expect(amethyst.getByRole('cell').nth(1)).toHaveText('£0.60');
            await expect(amethyst.getByRole('cell').nth(2)).toHaveText('£7.92');
            const quartz = variations.getByRole('row', { name: /Quartz Bead/ });
            await expect(quartz.getByRole('cell').nth(1)).toHaveText('£0.30');
            await expect(quartz.getByRole('cell').nth(2)).toHaveText('£7.56');

            await page.getByRole('button', { name: 'Create Design' }).click();
            await expect(page).toHaveURL(/\/designs$/);

            const [design] = await apiGetDesigns(TOKEN);
            expect(design.variationGroups).toEqual([expect.objectContaining({ name: 'Gemstone', required: 1 })]);
            const variants = (design.variants ?? []).map((v) => ({
                name: v.name,
                totalMaterialCosts: v.totalMaterialCosts,
                price: v.price,
            }));
            expect(variants).toEqual(
                expect.arrayContaining([
                    { name: 'Amethyst Bead', totalMaterialCosts: 0.6, price: 7.92 },
                    { name: 'Quartz Bead', totalMaterialCosts: 0.3, price: 7.56 },
                ])
            );
            expect(variants).toHaveLength(2);
            // Design price is the cheapest variant
            expect(design.price).toBe(7.56);
        });

        test('uploaded images are sent with the design', async ({ authenticatedPage: page }) => {
            await openAddDesign(page);
            await fillBasics(page, 'Photo Studs');
            await expect(page.getByRole('img', { name: 'Preview' })).toBeVisible();
            await addSharedMaterial(page, 'Silver Spacer', 1);

            await page.getByRole('button', { name: 'Create Design' }).click();
            await expect(page).toHaveURL(/\/designs$/);

            const [design] = await apiGetDesigns(TOKEN);
            // The file goes either straight to the create request or via the draft autosave upload; both end up
            // as the same placeholder id.
            expect(design.imageIds).toEqual([uploadedImageId(PNG.name)]);
        });

        test('shows validation errors and creates nothing when required fields are missing', async ({
            authenticatedPage: page,
        }) => {
            await openAddDesign(page);
            await page.getByRole('button', { name: 'Create Design' }).click();

            await expect(page.getByText('Please enter the design name')).toBeVisible();
            await expect(page.getByText('Please enter the time required')).toBeVisible();
            await expect(page.getByText('Please add at least one material or variation group').first()).toBeVisible();
            await expect(page).toHaveURL(/\/addDesign/);
            expect(await apiGetDesigns(TOKEN)).toHaveLength(0);
        });

        test('a material row needs a material and a positive amount before it can be saved', async ({
            authenticatedPage: page,
        }) => {
            await openAddDesign(page);
            await page.locator('form').getByRole('button', { name: 'Add Material' }).click();

            const alerts: string[] = [];
            page.on('dialog', (dialog) => {
                alerts.push(dialog.message());
                void dialog.dismiss();
            });

            await page.getByRole('button', { name: 'Save material' }).click();
            await expect.poll(() => alerts).toEqual(['Please select a material']);

            await page.getByRole('combobox').filter({ hasText: 'Select material' }).click();
            await page.getByRole('option', { name: 'Silver Spacer' }).click();
            await page.getByRole('button', { name: 'Save material' }).click();
            await expect
                .poll(() => alerts)
                .toEqual(['Please select a material', 'Please enter a valid required amount']);
        });
    });
