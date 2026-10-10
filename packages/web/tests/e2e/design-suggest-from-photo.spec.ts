import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_SUGGEST_FROM_PHOTO } from './mocks/auth';
import { apiCleanup, apiCreateBead } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_SUGGEST_FROM_PHOTO;

test.use({ authToken: TOKEN });

// 1x1 transparent PNG
const PHOTO = {
    name: 'piece.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
    ),
};

const uploadPhoto = async (page: Page) => {
    await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles(PHOTO);
};

test.describe
    .serial('Suggest a design from a photo', () => {
        test.beforeEach(async () => {
            await apiCleanup(TOKEN);
        });

        test.afterAll(async () => {
            await apiCleanup(TOKEN);
        });

        test('pre-fills name, type and owned materials, and lists items not in stock', async ({
            authenticatedPage: page,
        }) => {
            const bead = await apiCreateBead(TOKEN, { name: 'Suggest Opal Bead' });
            await page.route('**/api/designs/suggest-from-photo', (route) =>
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        name: 'Opal Drop Earrings',
                        designType: 'EARRINGS',
                        materials: [{ materialId: bead.id, quantity: 4, confidence: 0.85 }],
                        notInStock: [{ description: 'gold ear hooks' }],
                    }),
                })
            );

            await page.goto('/addDesign');
            const suggestButton = page.getByRole('button', { name: 'Suggest from photo', exact: true });
            await expect(suggestButton).toBeDisabled();

            await uploadPhoto(page);
            await suggestButton.click();

            await expect(page.getByPlaceholder('Enter design name')).toHaveValue('Opal Drop Earrings');
            const panel = page.getByTestId('photo-suggestion');
            await expect(panel).toContainText('Suggest Opal Bead × 4 (85% sure)');
            await expect(panel).toContainText('gold ear hooks');
            await expect(panel.getByRole('link', { name: 'add material?' })).toHaveAttribute('href', '/addMaterial');
            await expect(page.getByText('Suggest Opal Bead').first()).toBeVisible();

            // Everything stays editable before saving.
            await page.getByPlaceholder('Enter design name').fill('My Own Name');
            await expect(page.getByPlaceholder('Enter design name')).toHaveValue('My Own Name');
        });

        test('leaves the form untouched when the suggestion fails validation', async ({ authenticatedPage: page }) => {
            await page.route('**/api/designs/suggest-from-photo', (route) =>
                route.fulfill({
                    status: 502,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'AI output failed validation after 2 attempts' }),
                })
            );

            await page.goto('/addDesign');
            await page.getByPlaceholder('Enter design name').fill('Typed By Hand');
            await uploadPhoto(page);
            await page.getByRole('button', { name: 'Suggest from photo', exact: true }).click();

            await expect(page.getByText("Couldn't get a suggestion from the photo.")).toBeVisible();
            await expect(page.getByPlaceholder('Enter design name')).toHaveValue('Typed By Hand');
            await expect(page.getByTestId('photo-suggestion')).toHaveCount(0);
        });
    });
