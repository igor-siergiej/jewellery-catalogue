import { expect } from './fixtures';
import { MOCK_TOKEN_VISUAL_VIEW_DESIGN_DESKTOP, MOCK_TOKEN_VISUAL_VIEW_DESIGN_MOBILE } from './mocks/auth';
import { apiCreateBead, apiCreateDesign } from './utils/api-helpers';
import { expectNoHorizontalScroll, settle, visualTest } from './utils/visual-helpers';

const test = visualTest({
    mobile: MOCK_TOKEN_VISUAL_VIEW_DESIGN_MOBILE,
    desktop: MOCK_TOKEN_VISUAL_VIEW_DESIGN_DESKTOP,
});

test.describe('View design page visual regression', () => {
    test.describe.configure({ mode: 'serial' });

    test('populated state', async ({ authenticatedPage: page, authToken }) => {
        const bead = await apiCreateBead(authToken, { name: 'Visual Design Bead' });
        const design = await apiCreateDesign(authToken, {
            name: 'Visual Detail Necklace',
            price: 32,
            description: 'A delicate beaded necklace',
            materials: [{ ...bead, requiredQuantity: 10 }],
            totalMaterialCosts: 5,
        });
        await page.goto(`/designs/${design.id}`);
        await expect(page.getByText('Visual Detail Necklace').first()).toBeVisible({ timeout: 10000 });
        await settle(page);
        await expectNoHorizontalScroll(page);
        await expect(page).toHaveScreenshot('view-design-populated.png', { fullPage: true });
    });
});
