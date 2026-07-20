import { expect, test } from './fixtures';
import { MOCK_TOKEN_DESIGN_EDIT_NO_PUSH } from './mocks/auth';
import { apiCreateBead, apiCreateDesign, apiGetDesigns } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_DESIGN_EDIT_NO_PUSH;
const API_URL = process.env.E2E_API_SERVICE_URL || 'http://localhost:3001';

test.use({ authToken: TOKEN });

test.describe('Editing a design never publishes to Etsy', () => {
    test('saving description changes on an Etsy-linked design does not call etsy-push', async ({
        authenticatedPage: page,
    }) => {
        const bead = await apiCreateBead(TOKEN, { name: 'Draft Test Bead' });
        const design = await apiCreateDesign(TOKEN, {
            name: 'Etsy Linked Draft',
            price: 12.0,
            materials: [{ ...bead, requiredQuantity: 1 }],
            totalMaterialCosts: (bead as { pricePerBead: number }).pricePerBead,
        });
        // designType is required by the edit form's validation but isn't part of apiCreateDesign's
        // input shape, so set it (along with the etsy link) via a follow-up PUT.
        const linkRes = await fetch(`${API_URL}/api/designs/${design.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
            body: JSON.stringify({
                designType: 'RING',
                etsy: { listingId: 999, state: 'active', lastPushedAt: null },
            }),
        });
        expect(linkRes.ok).toBe(true);

        const etsyPushRequests: string[] = [];
        page.on('request', (req) => {
            if (req.url().includes('/etsy-push')) etsyPushRequests.push(req.url());
        });

        await page.goto(`/designs/${design.id}`);
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Edit Details' }).click();
        await expect(page.getByText('Edit Design Properties')).toBeVisible({ timeout: 10000 });

        await page.locator('.ProseMirror').click();
        await page.keyboard.type('Updated maker description, not yet ready for Etsy.');
        // Required by the form's validation despite being labeled optional — unrelated
        // pre-existing quirk, just needs a value so the save isn't blocked.
        await page.getByRole('spinbutton', { name: 'Low Stock Threshold (Optional)' }).fill('5');

        const patchResponse = page.waitForResponse(
            (res) => res.url().includes(`/api/designs/${design.id}`) && res.request().method() === 'PATCH'
        );
        await page.getByRole('button', { name: 'Save Changes' }).click();
        await patchResponse;

        await expect(page.getByText('Design updated successfully!')).toBeVisible({ timeout: 10000 });

        expect(etsyPushRequests).toEqual([]);

        const designs = await apiGetDesigns(TOKEN);
        const updated = designs.find((d) => d.id === design.id);
        expect((updated as { description?: string })?.description).toContain(
            'Updated maker description, not yet ready for Etsy.'
        );
        expect((updated as { etsy?: { lastPushedAt: number | null } })?.etsy?.lastPushedAt).toBeNull();
    });
});
