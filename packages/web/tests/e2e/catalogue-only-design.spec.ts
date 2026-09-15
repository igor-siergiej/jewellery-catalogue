import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_CATALOGUE_ONLY } from './mocks/auth';
import { apiCreateBead, apiCreateDesign, apiDeleteDesign, apiGetDesigns } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_CATALOGUE_ONLY;
const API_URL = process.env.E2E_API_SERVICE_URL || 'http://localhost:3001';

test.use({ authToken: TOKEN });

function findDesignCard(page: Page, designName: string) {
    const title = page.locator('[data-slot="item-title"]').filter({ hasText: designName });
    return page.locator('[data-slot="item"]').filter({ has: title });
}

test.describe
    .serial('Catalogue-only designs', () => {
        test('marking a design catalogue-only persists, shows on the card, and blocks Etsy push @smoke', async ({
            authenticatedPage: page,
        }) => {
            const bead = await apiCreateBead(TOKEN, { name: 'Catalogue Only Bead' });
            const design = await apiCreateDesign(TOKEN, {
                name: 'Catalogue Only Design',
                price: 10.0,
                materials: [{ ...bead, requiredQuantity: 1 }],
                totalMaterialCosts: (bead as { pricePerBead: number }).pricePerBead,
            });

            try {
                // designType is required by the edit form's validation but isn't part of
                // apiCreateDesign's input shape, so set it via a follow-up PUT.
                const linkRes = await fetch(`${API_URL}/api/designs/${design.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
                    body: JSON.stringify({ designType: 'RING' }),
                });
                expect(linkRes.ok).toBe(true);

                await page.goto(`/designs/${design.id}`);
                await page.waitForLoadState('networkidle');

                await page.getByRole('button', { name: 'Edit Details' }).click();
                await expect(page.getByText('Edit Design Properties')).toBeVisible({ timeout: 10000 });

                await page.getByRole('checkbox', { name: 'Catalogue only' }).click();
                // Required by the form's validation despite being labeled optional.
                await page.getByRole('spinbutton', { name: 'Low Stock Threshold (Optional)' }).fill('5');

                const patchResponse = page.waitForResponse(
                    (res) => res.url().includes(`/api/designs/${design.id}`) && res.request().method() === 'PATCH'
                );
                await page.getByRole('button', { name: 'Save Changes' }).click();
                await patchResponse;

                await expect(page.getByText('Design updated successfully!')).toBeVisible({ timeout: 10000 });
                await expect(page.getByText('Catalogue only')).toBeVisible();

                const designs = await apiGetDesigns(TOKEN);
                const updated = designs.find((d) => d.id === design.id);
                expect((updated as { catalogueOnly?: boolean })?.catalogueOnly).toBe(true);

                await page.goto('/designs');
                await page.waitForLoadState('networkidle');
                const card = findDesignCard(page, 'Catalogue Only Design');
                await expect(card).toBeVisible({ timeout: 10000 });
                await expect(card.getByText('Catalogue only')).toBeVisible();

                const pushRes = await fetch(`${API_URL}/api/designs/${design.id}/etsy-push`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
                    body: JSON.stringify({}),
                });
                expect(pushRes.status).toBe(400);
                const body = await pushRes.json();
                expect(JSON.stringify(body)).toContain('catalogue-only');
            } finally {
                await apiDeleteDesign(TOKEN, design.id);
            }
        });
    });
