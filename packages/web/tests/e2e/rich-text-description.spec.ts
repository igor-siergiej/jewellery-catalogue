import { expect, test } from './fixtures';
import { MOCK_TOKEN_RICH_TEXT } from './mocks/auth';
import { TEST_PNG } from './utils/add-design-form';
import { apiCreateBead, apiCreateDesign, apiGetDesigns } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_RICH_TEXT;
test.use({ authToken: TOKEN });

async function seedDesign(description = '') {
    const bead = await apiCreateBead(TOKEN, { name: 'Pearl Bead' });
    return apiCreateDesign(TOKEN, {
        name: 'Pearl Drops',
        designType: 'EARRINGS',
        materials: [{ ...bead, requiredQuantity: 2 }],
        lowStockThreshold: 1,
        description,
    });
}

test.describe
    .serial('Design description editor', () => {
        test('toolbar formatting is saved and rendered on the design page', async ({ authenticatedPage: page }) => {
            const design = await seedDesign();
            await page.goto(`/designs/${design.id}`);
            await page.getByRole('button', { name: 'Edit Details' }).click();
            const dialog = page.getByRole('dialog', { name: 'Edit Design Properties' });

            const editor = dialog.locator('.ProseMirror');
            await editor.click();
            await dialog.getByRole('button', { name: 'Heading 2' }).click();
            await page.keyboard.type('Care');
            await page.keyboard.press('Enter');
            await dialog.getByRole('button', { name: 'Bold' }).click();
            await page.keyboard.type('Keep dry');
            await dialog.getByRole('button', { name: 'Bold' }).click();
            await page.keyboard.press('Enter');
            await dialog.getByRole('button', { name: 'Bullet list' }).click();
            await page.keyboard.type('Freshwater pearls');
            await page.keyboard.press('Enter');
            await page.keyboard.type('Sterling hooks');

            await dialog.getByRole('button', { name: 'Save Changes' }).click();
            await expect(page.getByText('Design updated successfully!')).toBeVisible();

            await page.reload();
            await expect(page.getByRole('heading', { level: 2, name: 'Care' })).toBeVisible();
            await expect(page.locator('strong', { hasText: 'Keep dry' })).toBeVisible();
            await expect(page.getByRole('listitem').filter({ hasText: /Freshwater pearls|Sterling hooks/ })).toHaveText(
                ['Freshwater pearls', 'Sterling hooks']
            );

            const [saved] = await apiGetDesigns(TOKEN);
            expect(saved.description).toContain('<h2>Care</h2>');
            expect(saved.description).toContain('<strong>Keep dry</strong>');
            expect(saved.description).toMatch(/<ul>.*Freshwater pearls.*Sterling hooks.*<\/ul>/);
        });

        test('undo reverts typing but never wipes the saved description', async ({ authenticatedPage: page }) => {
            const design = await seedDesign('<p>Original copy.</p>');
            await page.goto(`/designs/${design.id}`);
            await page.getByRole('button', { name: 'Edit Details' }).click();
            const dialog = page.getByRole('dialog', { name: 'Edit Design Properties' });

            const editor = dialog.locator('.ProseMirror');
            await expect(editor).toHaveText('Original copy.');
            await expect(dialog.getByRole('button', { name: 'Undo' })).toBeDisabled();

            await editor.click();
            await page.keyboard.press('End');
            await page.keyboard.type(' Oops');
            await dialog.getByRole('button', { name: 'Undo' }).click();
            await expect(editor).toHaveText('Original copy.');
            await dialog.getByRole('button', { name: 'Redo' }).click();
            await expect(editor).toHaveText('Original copy. Oops');
        });

        test('an inserted image is uploaded and embedded in the description', async ({ authenticatedPage: page }) => {
            const design = await seedDesign();
            let uploads = 0;
            await page.route(/\/api\/images$/, (route) => {
                uploads++;
                return route.fulfill({ json: { imageId: 'e2e-inline-photo' } });
            });
            await page.goto(`/designs/${design.id}`);
            await page.getByRole('button', { name: 'Edit Details' }).click();
            const dialog = page.getByRole('dialog', { name: 'Edit Design Properties' });

            await dialog.locator('.ProseMirror').click();
            await page.keyboard.type('Worn by the sea.');
            await dialog.locator('input[type="file"][accept="image/*"]').last().setInputFiles(TEST_PNG('sea.png'));
            await expect(dialog.locator('.ProseMirror img')).toHaveAttribute('src', /\/api\/image\/e2e-inline-photo/);
            expect(uploads).toBe(1);

            await dialog.getByRole('button', { name: 'Save Changes' }).click();
            await expect(page.getByText('Design updated successfully!')).toBeVisible();

            const [saved] = await apiGetDesigns(TOKEN);
            expect(saved.description).toContain('/api/image/e2e-inline-photo');
        });

        test('a failed image upload leaves the description unchanged', async ({ authenticatedPage: page }) => {
            const design = await seedDesign();
            await page.route(/\/api\/images$/, (route) => route.fulfill({ status: 500, json: { message: 'boom' } }));
            await page.goto(`/designs/${design.id}`);
            await page.getByRole('button', { name: 'Edit Details' }).click();
            const dialog = page.getByRole('dialog', { name: 'Edit Design Properties' });

            await dialog.locator('.ProseMirror').click();
            await page.keyboard.type('No photo yet.');
            await dialog.locator('input[type="file"][accept="image/*"]').last().setInputFiles(TEST_PNG('sea.png'));
            await expect(dialog.getByRole('button', { name: 'Insert image' })).toBeEnabled();
            await expect(dialog.locator('.ProseMirror img')).toHaveCount(0);
            await expect(dialog.locator('.ProseMirror')).toContainText('No photo yet.');
        });
    });
