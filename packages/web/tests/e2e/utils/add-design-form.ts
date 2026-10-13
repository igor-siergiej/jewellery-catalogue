import type { Page } from '@playwright/test';

export const TEST_PNG = (name: string) => ({
    name,
    mimeType: 'image/png',
    buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'base64'
    ),
});

/** Adds a row to the Add Design shared materials table and saves it. */
export async function addSharedMaterial(page: Page, materialName: string, quantity: number) {
    await page.locator('form').getByRole('button', { name: 'Add Material' }).click();
    await page.getByRole('combobox').filter({ hasText: 'Select material' }).click();
    await page.getByRole('option', { name: materialName }).click();
    await page.getByPlaceholder('0', { exact: true }).fill(String(quantity));
    await page.getByRole('button', { name: 'Save material' }).click();
}
