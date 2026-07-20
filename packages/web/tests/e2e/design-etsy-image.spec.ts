import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_DESIGN_ETSY_IMAGE } from './mocks/auth';
import { apiCreateDesign } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_DESIGN_ETSY_IMAGE;

test.use({ authToken: TOKEN });

async function apiLinkDesignToEtsyListing(designId: string, imageUrl: string) {
    const res = await fetch(`${process.env.E2E_API_SERVICE_URL || 'http://localhost:3001'}/api/designs/${designId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({
            etsy: { listingId: 123, state: 'active', lastPushedAt: null, imageUrls: [imageUrl] },
        }),
    });
    if (!res.ok) throw new Error(`apiLinkDesignToEtsyListing failed: ${await res.text()}`);
}

function findDesignCard(page: Page, designName: string) {
    const title = page.locator('[data-slot="item-title"]').filter({ hasText: designName });
    return page.locator('[data-slot="item"]').filter({ has: title });
}

test.describe
    .serial('Design card Etsy image', () => {
        test('shows the linked listing image on a design linked to Etsy @smoke', async ({
            authenticatedPage: page,
        }) => {
            const design = await apiCreateDesign(TOKEN, { name: 'Etsy Linked Design', price: 15.0 });
            await apiLinkDesignToEtsyListing(design.id, 'https://i.etsy.com/123-fullxfull.jpg');

            await page.goto('/designs');
            await page.waitForLoadState('networkidle');

            const card = findDesignCard(page, 'Etsy Linked Design');
            await expect(card).toBeVisible({ timeout: 10000 });
            await expect(card.getByTitle('Linked Etsy listing image')).toBeVisible();
            await expect(card.getByTitle('Linked Etsy listing image').locator('img')).toHaveAttribute(
                'src',
                'https://i.etsy.com/123-fullxfull.jpg'
            );
        });

        test('design with no linked Etsy listing shows no Etsy image badge', async ({ authenticatedPage: page }) => {
            await apiCreateDesign(TOKEN, { name: 'Unlinked Design', price: 8.0 });

            await page.goto('/designs');
            await page.waitForLoadState('networkidle');

            const card = findDesignCard(page, 'Unlinked Design');
            await expect(card).toBeVisible({ timeout: 10000 });
            await expect(card.getByTitle('Linked Etsy listing image')).not.toBeVisible();
        });
    });
