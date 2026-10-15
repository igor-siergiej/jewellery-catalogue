import { expect, test } from './fixtures';
import { MOCK_TOKEN_ETSY_MOCK } from './mocks/auth';
import { apiCreateBead, apiCreateDesign, apiSetUserSettings } from './utils/api-helpers';
import { findMockShop, mockShopListings, setMockListingState } from './utils/etsy-mock';

const TOKEN = MOCK_TOKEN_ETSY_MOCK;
test.use({ authToken: TOKEN });

test.describe
    .serial('Etsy integration against the mock', () => {
        const shopName = `E2E Shop ${Date.now()}`;

        test('connects through the OAuth consent page', async ({ authenticatedPage: page }) => {
            await page.goto('/settings');
            const disconnect = page.getByRole('button', { name: 'Disconnect' });
            if (await disconnect.isVisible()) await disconnect.click();

            await page.getByRole('button', { name: 'Connect Etsy' }).click();
            await expect(page.getByRole('heading', { name: 'Mock Etsy' })).toBeVisible();
            await page.getByLabel('Shop name').fill(shopName);
            await page.getByLabel('Scenario').selectOption('established');
            await page.getByRole('button', { name: 'Allow access' }).click();

            await expect(page.getByText('Etsy connected successfully.')).toBeVisible();
            await expect(page.getByText(shopName)).toBeVisible();
        });

        test('shows the shop listings', async ({ authenticatedPage: page }) => {
            await page.goto('/listings');
            await expect(page.getByText('Silver Moon Pendant Necklace').first()).toBeVisible();
            await expect(page.getByText('Pearl Studs').first()).toBeVisible();
            await expect(page.getByText('Sold out').first()).toBeVisible();
        });

        test('sends a design as a draft, then reflects it going live', async ({ authenticatedPage: page }) => {
            await apiSetUserSettings(TOKEN, {
                etsyDescriptionTemplate: '{description}',
                etsyTaxonomyMap: { EARRINGS: 1211 },
            });
            const bead = await apiCreateBead(TOKEN, { name: 'Amethyst Bead' });
            const design = await apiCreateDesign(TOKEN, {
                name: 'Mock Amethyst Studs',
                designType: 'EARRINGS',
                price: 24,
                description: '<p>Purple studs.</p>',
                materials: [{ ...bead, requiredQuantity: 2 }],
            });

            await page.goto(`/designs/${design.id}`);
            await page.getByRole('button', { name: 'Send to Etsy' }).click();
            const dialog = page.getByRole('dialog', { name: 'Send to Etsy' });
            await dialog.getByRole('button', { name: 'Send to Etsy' }).click();
            await expect(dialog).toBeHidden();
            await expect(page.getByRole('link', { name: 'Draft on Etsy' })).toBeVisible();

            const { shopId } = await findMockShop(shopName);
            const pushed = (await mockShopListings(shopId)).find((l) => l.title === 'Mock Amethyst Studs');
            expect(pushed).toMatchObject({ state: 'draft', price: { amount: 2400 } });

            await setMockListingState(pushed?.listing_id as number, 'active');
            await page.reload();
            await expect(page.getByRole('link', { name: 'Active on Etsy' })).toBeVisible();
        });
    });
