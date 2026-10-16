import { beforeEach, describe, expect, it } from 'bun:test';
import { createEtsyMockApp } from '../app';
import { connectedUser, MockStore } from '../test-helpers';

let store: MockStore;
let app: ReturnType<typeof createEtsyMockApp>;

beforeEach(() => {
    store = new MockStore();
    app = createEtsyMockApp({ store, publicUrl: 'http://mock' });
});

const control = (method: string, path: string, body?: unknown) =>
    app.request(`/__mock${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

describe('control API', () => {
    it('finds a shop by name', async () => {
        store.createUser({ shopName: 'Find Me', scenario: 'empty' });
        store.createUser({ shopName: 'Other', scenario: 'empty' });
        const shops = await (await control('GET', '/shops?name=Find%20Me')).json();
        expect(shops).toHaveLength(1);
        expect(shops[0].shopName).toBe('Find Me');
    });

    it('changes listing state as a seller would on Etsy', async () => {
        const user = store.createUser({ scenario: 'established' });
        const draft = [...store.listings.values()].find((l) => l.shopId === user.shopId && l.state === 'draft');
        const res = await control('POST', `/listings/${draft?.listingId}/state`, { state: 'active' });
        expect(res.status).toBe(200);
        expect(store.listings.get(draft?.listingId as number)?.state).toBe('active');
    });

    it('places an order that decrements stock and sells out the last item', async () => {
        const user = store.createUser({ scenario: 'established' });
        const earrings = [...store.listings.values()].find(
            (l) => l.shopId === user.shopId && l.title === 'Amethyst Drop Earrings'
        );
        const res = await control('POST', `/shops/${user.shopId}/orders`, {
            listingId: earrings?.listingId,
            quantity: 3,
        });
        expect(res.status).toBe(200);
        expect((await res.json()).transactions[0].quantity).toBe(3);
        expect(store.listings.get(earrings?.listingId as number)?.state).toBe('sold_out');
    });

    it('rejects an order for more than the stock', async () => {
        const user = store.createUser({ scenario: 'established' });
        const earrings = [...store.listings.values()].find(
            (l) => l.shopId === user.shopId && l.title === 'Amethyst Drop Earrings'
        );
        const res = await control('POST', `/shops/${user.shopId}/orders`, {
            listingId: earrings?.listingId,
            quantity: 99,
        });
        expect(res.status).toBe(400);
    });

    it('expires tokens so API calls get 401', async () => {
        const { headers } = connectedUser(store);
        await control('POST', '/tokens/expire');
        expect((await app.request('/v3/application/users/me', { headers })).status).toBe(401);
    });

    it('injects a fault a limited number of times', async () => {
        const { headers } = connectedUser(store);
        await control('POST', '/faults', { path: '/users/me', status: 503, times: 1 });
        expect((await app.request('/v3/application/users/me', { headers })).status).toBe(503);
        expect((await app.request('/v3/application/users/me', { headers })).status).toBe(200);
    });

    it('reset wipes state', async () => {
        store.createUser({ scenario: 'established' });
        await control('POST', '/reset');
        expect(store.shops.size).toBe(0);
    });
});

describe('import-listings / import-receipts', () => {
    const LISTINGS_CSV = [
        'TITLE,PRICE,QUANTITY,TAGS,VARIATION 1 TYPE,VARIATION 1 VALUES',
        '"Hoop Earrings",24.5,2,"silver|hoop",,',
        '"Wide Ring",18,5,,"Ring Size","L|M|S"',
        ',10,1,,,,', // empty title → skip
    ].join('\n');

    const RECEIPTS_CSV = [
        '"Sale Date","Order ID","Number of Items","Order Value","Order Net","Status"',
        '10/14/26,4203423026,1,9.55,9.55,paid',
        '10/12/26,4203423025,2,18.00,17.50,shipped',
    ].join('\n');

    it('import-listings picks the only shop when shopId is omitted', async () => {
        store.createUser({ shopName: 'Solo', scenario: 'empty' });
        const res = await app.request('/__mock/import-listings', {
            method: 'POST',
            headers: { 'Content-Type': 'text/csv' },
            body: LISTINGS_CSV,
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { imported: number; skipped: number };
        expect(body.imported).toBe(2);
        expect(body.skipped).toBe(1);
        expect([...store.listings.values()]).toHaveLength(2);
    });

    it('import-listings errors when multiple shops exist and shopId is omitted', async () => {
        store.createUser({ shopName: 'A', scenario: 'empty' });
        store.createUser({ shopName: 'B', scenario: 'empty' });
        const res = await app.request('/__mock/import-listings', {
            method: 'POST',
            headers: { 'Content-Type': 'text/csv' },
            body: LISTINGS_CSV,
        });
        expect(res.status).toBe(400);
    });

    it('import-listings accepts JSON body with a csv field', async () => {
        const user = store.createUser({ shopName: 'Json', scenario: 'empty' });
        const res = await app.request(`/__mock/import-listings?shopId=${user.shopId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ csv: LISTINGS_CSV }),
        });
        expect(res.status).toBe(200);
        expect(((await res.json()) as { imported: number }).imported).toBe(2);
    });

    it('import-receipts preserves the Order ID', async () => {
        const user = store.createUser({ shopName: 'Receipts', scenario: 'empty' });
        const res = await app.request(`/__mock/import-receipts?shopId=${user.shopId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/csv' },
            body: RECEIPTS_CSV,
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { imported: number };
        expect(body.imported).toBe(2);
        const ids = [...store.receipts.keys()].sort();
        expect(ids).toEqual([4203423025, 4203423026]);
    });
});
