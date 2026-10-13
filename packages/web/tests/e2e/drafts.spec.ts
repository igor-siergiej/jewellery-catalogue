import { expect, test } from './fixtures';
import { MOCK_TOKEN_DRAFTS } from './mocks/auth';
import { addSharedMaterial, TEST_PNG } from './utils/add-design-form';
import { apiCreateBead, apiCreateDraft, apiGetDesigns, apiGetDrafts, apiGetMaterials } from './utils/api-helpers';
import { mockDraftImageUpload, stripDesignImageUploads, uploadedImageId } from './utils/upload-mocks';

const TOKEN = MOCK_TOKEN_DRAFTS;
test.use({ authToken: TOKEN });

const PNG = TEST_PNG('draft.png');

const waitForDraft = (name: string, predicate: (data: Record<string, unknown>) => boolean = () => true) =>
    expect
        .poll(
            async () => {
                const drafts = await apiGetDrafts(TOKEN);
                return drafts.some((d) => d.name === name && predicate((d.data ?? {}) as Record<string, unknown>));
            },
            { timeout: 15000 }
        )
        .toBe(true);

test.describe
    .serial('Drafts', () => {
        test('a design in progress autosaves and can be resumed from the designs page', async ({
            authenticatedPage: page,
        }) => {
            await apiCreateBead(TOKEN, { name: 'Silver Spacer' });
            await mockDraftImageUpload(page);
            await page.goto('/addDesign');

            await page.getByPlaceholder('Enter design name').fill('Draft Ring');
            await page.getByLabel('Time Spent Crafting').fill('01:15');
            await addSharedMaterial(page, 'Silver Spacer', 4);
            await page.locator('input[type="file"]').first().setInputFiles(PNG);

            await expect(page.getByText('Draft saved')).toBeVisible({ timeout: 10000 });
            await waitForDraft('Draft Ring', (data) => Array.isArray(data.materials) && data.materials.length === 1);
            const [draft] = await apiGetDrafts(TOKEN);
            expect(draft).toMatchObject({ type: 'design', imageId: uploadedImageId(PNG.name) });

            await page.goto('/designs');
            const card = page.getByText('Draft Ring');
            await expect(card).toBeVisible();
            await card.click();

            await expect(page).toHaveURL(new RegExp(`/addDesign\\?draftId=${draft.id}`));
            await expect(page.getByPlaceholder('Enter design name')).toHaveValue('Draft Ring');
            await expect(page.getByLabel('Time Spent Crafting')).toHaveValue('01:15');
            await expect(page.locator('form').getByText('Silver Spacer')).toBeVisible();
            await expect(page.locator('form').getByText('4 pcs')).toBeVisible();
            // The draft's image comes back as an uploaded image id (a thumbnail with a remove button), not a
            // local file preview
            const images = page.locator('div.grid:has(> div > h2:text-is("Upload Images"))');
            await expect(images.getByRole('img', { name: 'Preview' })).toHaveCount(0);
            await expect(images.getByRole('button')).toHaveCount(2);
        });

        test('creating a design from a resumed draft removes the draft', async ({ authenticatedPage: page }) => {
            const bead = await apiCreateBead(TOKEN, { name: 'Silver Spacer' });
            const draft = await apiCreateDraft(TOKEN, {
                type: 'design',
                name: 'Finish Me',
                data: {
                    name: 'Finish Me',
                    timeRequired: '00:30',
                    materials: [{ ...bead, requiredQuantity: 2 }],
                    description: '',
                    makingNotes: '',
                    variationGroups: [],
                    variants: [],
                    images: [],
                    diagramImages: [],
                    totalMaterialCosts: 0,
                },
                imageId: 'e2e-draft-image',
            });
            await stripDesignImageUploads(page);

            await page.goto(`/addDesign?draftId=${draft.id}`);
            await expect(page.getByPlaceholder('Enter design name')).toHaveValue('Finish Me');
            await page.getByRole('button', { name: 'Create Design' }).click();

            await expect(page.getByText('Added design successfully!')).toBeVisible();
            await expect(page).toHaveURL(/\/designs$/);
            const designs = await apiGetDesigns(TOKEN);
            expect(designs.map((d) => d.name)).toEqual(['Finish Me']);
            expect(designs[0].imageIds).toEqual(['e2e-draft-image']);
            expect(await apiGetDrafts(TOKEN)).toHaveLength(0);
            await expect(page.getByText('Draft', { exact: true })).toHaveCount(0);
        });

        test('deleting a design draft asks for confirmation', async ({ authenticatedPage: page }) => {
            await apiCreateDraft(TOKEN, { type: 'design', name: 'Throwaway Idea', data: { name: 'Throwaway Idea' } });
            await page.goto('/designs');
            await expect(page.getByText('Throwaway Idea', { exact: true })).toBeVisible();

            await page.getByTitle('Delete Draft').click();
            const dialog = page.getByRole('alertdialog');
            await expect(dialog).toContainText('Delete draft "Throwaway Idea"?');
            await dialog.getByRole('button', { name: 'Cancel' }).click();
            await expect(page.getByText('Throwaway Idea', { exact: true })).toBeVisible();
            expect(await apiGetDrafts(TOKEN)).toHaveLength(1);

            await page.getByTitle('Delete Draft').click();
            await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
            await expect(page.getByText('Throwaway Idea', { exact: true })).toHaveCount(0);
            expect(await apiGetDrafts(TOKEN)).toHaveLength(0);
        });

        test('a material in progress autosaves, resumes from the materials page and is removed on submit', async ({
            authenticatedPage: page,
        }) => {
            await page.goto('/addMaterial');
            await page.locator('input[name="name"]').fill('Half-done Bead');
            await page.locator('input[name="brand"]').fill('DraftBrand');
            await page.getByRole('button', { name: 'Bead' }).click();
            await page.locator('input[name="colour"]').fill('green');

            await expect(page.getByText('Draft saved')).toBeVisible({ timeout: 10000 });
            await waitForDraft('Half-done Bead', (data) => data.colour === 'green');

            await page.goto('/materials');
            await expect(page.getByText('Material Drafts')).toBeVisible();
            const row = page.getByRole('row', { name: /Half-done Bead/ });
            await row.getByRole('button', { name: 'Resume' }).click();

            await expect(page).toHaveURL(/\/addMaterial\?draftId=/);
            await expect(page.locator('input[name="name"]')).toHaveValue('Half-done Bead');
            await expect(page.locator('input[name="brand"]')).toHaveValue('DraftBrand');
            await expect(page.locator('input[name="colour"]')).toHaveValue('green');

            await page.locator('input[name="purchaseUrl"]').fill('http://example.com');
            await page.locator('input[name="diameter"]').fill('4');
            await page.locator('input[name="quantity"]').fill('100');
            await page.locator('input[name="pricePerPack"]').fill('5.00');
            await page.locator('input[name="packs"]').fill('1');
            await page.getByRole('button', { name: 'Add Material!' }).click();

            await expect(page.getByText('Added material successfully!')).toBeVisible();
            expect((await apiGetMaterials(TOKEN)).map((m) => m.name)).toEqual(['Half-done Bead']);
            await expect.poll(async () => (await apiGetDrafts(TOKEN)).length).toBe(0);

            await page.goto('/materials');
            await expect(page.getByText('Material Drafts')).toHaveCount(0);
        });

        test('deleting a material draft asks for confirmation', async ({ authenticatedPage: page }) => {
            await apiCreateDraft(TOKEN, { type: 'material', name: 'Old Chain Idea', data: { name: 'Old Chain Idea' } });
            await page.goto('/materials');

            const row = page.getByRole('row', { name: /Old Chain Idea/ });
            await row.getByRole('button', { name: 'Delete draft' }).click();
            await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
            await expect(row).toBeVisible();

            await row.getByRole('button', { name: 'Delete draft' }).click();
            await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
            await expect(page.getByText('Material Drafts')).toHaveCount(0);
            expect(await apiGetDrafts(TOKEN)).toHaveLength(0);
        });
    });
