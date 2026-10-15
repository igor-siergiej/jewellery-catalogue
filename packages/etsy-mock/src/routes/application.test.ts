import { beforeEach, describe, expect, it } from 'bun:test';
import { createEtsyMockApp } from '../app';
import { connectedUser, MockStore } from '../test-helpers';

let store: MockStore;
let app: ReturnType<typeof createEtsyMockApp>;
const KEY = { 'x-api-key': 'key:secret' };

beforeEach(() => {
    store = new MockStore();
    app = createEtsyMockApp({ store, publicUrl: 'http://mock' });
});

const get = (path: string, headers: Record<string, string>) => app.request(`/v3/application${path}`, { headers });

describe('auth', () => {
    it('rejects a key without the shared secret', async () => {
        const { headers } = connectedUser(store);
        const res = await get('/users/me', { ...headers, 'x-api-key': 'key' });
        expect(res.status).toBe(403);
    });

    it('rejects an expired token with 401', async () => {
        const { headers } = connectedUser(store);
        for (const t of store.tokens.values()) t.expiresAt = 0;
        expect((await get('/users/me', headers)).status).toBe(401);
    });
});

describe('users and shops', () => {
    it('returns the user and shop ids', async () => {
        const { user, headers } = connectedUser(store);
        expect(await (await get('/users/me', headers)).json()).toEqual({
            user_id: user.userId,
            shop_id: user.shopId,
        });
    });

    it('returns shop_id null and 404 for /shops/null when the user has no shop', async () => {
        const { headers } = connectedUser(store, 'no-shop');
        const me = await (await get('/users/me', headers)).json();
        expect(me.shop_id).toBeNull();
        expect((await get(`/shops/${me.shop_id}`, KEY)).status).toBe(404);
    });

    it('returns the shop with its active listing count', async () => {
        const { user } = connectedUser(store);
        const shop = await (await get(`/shops/${user.shopId}`, KEY)).json();
        expect(shop).toMatchObject({ shop_id: user.shopId, shop_name: 'Test Shop', listing_active_count: 4 });
    });

    it("forbids reading another user's shop listings", async () => {
        const { headers } = connectedUser(store);
        const other = store.createUser({ scenario: 'established' });
        expect((await get(`/shops/${other.shopId}/listings?state=active`, headers)).status).toBe(403);
    });
});

describe('listings', () => {
    it('filters shop listings by state and includes images when asked', async () => {
        const { user, headers } = connectedUser(store);
        const body = await (await get(`/shops/${user.shopId}/listings?state=sold_out&includes=Images`, headers)).json();
        expect(body.count).toBe(1);
        expect(body.results[0]).toMatchObject({ title: 'Pearl Studs', state: 'sold_out' });
        expect(body.results[0].images).toEqual([]);
        expect(body.results[0].price).toEqual({ amount: 2000, divisor: 100, currency_code: 'GBP' });
    });

    it('paginates with count = total matches', async () => {
        const { user, headers } = connectedUser(store, 'empty');
        for (let i = 0; i < 150; i++) {
            store.addListing(user.shopId as number, { title: `L${i}`, state: 'active', price: 1 });
        }
        const page1 = await (
            await get(`/shops/${user.shopId}/listings?state=active&limit=100&offset=0`, headers)
        ).json();
        const page2 = await (
            await get(`/shops/${user.shopId}/listings?state=active&limit=100&offset=100`, headers)
        ).json();
        expect(page1.count).toBe(150);
        expect(page1.results).toHaveLength(100);
        expect(page2.results).toHaveLength(50);
    });

    it('returns a listing with key only, and its inventory with a token', async () => {
        const { headers } = connectedUser(store);
        const ring = [...store.listings.values()].find((l) => l.title === 'Birthstone Stacking Ring');
        const listing = await (await get(`/listings/${ring?.listingId}`, KEY)).json();
        expect(listing).toMatchObject({ state: 'active', quantity: 3, tags: [] });

        const inv = await (await get(`/listings/${ring?.listingId}/inventory`, headers)).json();
        expect(inv.products).toHaveLength(2);
        expect(inv.products[0].property_values[0]).toMatchObject({ property_name: 'Stone', values: ['Ruby'] });
        expect(inv.products[0].offerings[0]).toMatchObject({ quantity: 2, is_enabled: true });
    });

    it('returns 404 for an unknown listing', async () => {
        expect((await get('/listings/999999', KEY)).status).toBe(404);
    });
});

describe('shop settings and taxonomy', () => {
    it('returns shipping profiles and readiness definitions', async () => {
        const { user, headers } = connectedUser(store);
        const profiles = await (await get(`/shops/${user.shopId}/shipping-profiles`, headers)).json();
        expect(profiles.results).toHaveLength(1);
        const readiness = await (await get(`/shops/${user.shopId}/readiness-state-definitions`, headers)).json();
        expect(readiness.results.map((r: { readiness_state: string }) => r.readiness_state)).toEqual([
            'ready_to_ship',
            'made_to_order',
        ]);
    });

    it('returns the taxonomy tree with key only', async () => {
        const body = await (await get('/seller-taxonomy/nodes', KEY)).json();
        expect(body.results[0].name).toBe('Jewelry');
    });
});

describe('receipts', () => {
    it('returns receipts modified since the given time', async () => {
        const { user, headers } = connectedUser(store);
        const body = await (await get(`/shops/${user.shopId}/receipts?min_last_modified=0`, headers)).json();
        expect(body.count).toBe(1);
        expect(body.results[0].transactions[0]).toMatchObject({
            title: 'Silver Moon Pendant Necklace',
            quantity: 1,
        });
        const future = store.now() + 10;
        const none = await (await get(`/shops/${user.shopId}/receipts?min_last_modified=${future}`, headers)).json();
        expect(none.results).toEqual([]);
    });

    it('returns 403 without the transactions_r scope', async () => {
        const { user, headers } = connectedUser(store, 'established', ['listings_r', 'shops_r']);
        expect((await get(`/shops/${user.shopId}/receipts?min_last_modified=0`, headers)).status).toBe(403);
    });
});
