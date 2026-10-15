import { beforeEach, describe, expect, it } from 'bun:test';
import { createEtsyMockApp } from '../app';
import { connectedUser, MockStore } from '../test-helpers';

let store: MockStore;
let app: ReturnType<typeof createEtsyMockApp>;

beforeEach(() => {
    store = new MockStore();
    app = createEtsyMockApp({ store, publicUrl: 'http://mock' });
});

const send = (method: string, path: string, headers: Record<string, string>, body?: unknown) =>
    app.request(`/v3/application${path}`, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

function draftBody(store: MockStore, shopId: number, overrides: Record<string, unknown> = {}) {
    const shop = store.shops.get(shopId);
    return {
        quantity: 2,
        title: 'Amethyst Studs',
        description: 'Purple studs.',
        price: 26.5,
        who_made: 'i_did',
        when_made: 'made_to_order',
        is_supply: false,
        type: 'physical',
        taxonomy_id: 1211,
        shipping_profile_id: shop?.shippingProfiles[0].shippingProfileId,
        readiness_state_id: shop?.readinessStates[1].readinessStateId,
        tags: ['purple studs'],
        ...overrides,
    };
}

describe('create draft listing', () => {
    it('creates a draft and returns its id', async () => {
        const { user, headers } = connectedUser(store, 'empty');
        const res = await send(
            'POST',
            `/shops/${user.shopId}/listings`,
            headers,
            draftBody(store, user.shopId as number)
        );
        expect(res.status).toBe(201);
        const { listing_id } = await res.json();
        const listing = store.listings.get(listing_id);
        expect(listing?.state).toBe('draft');
        expect(store.listingPriceAmount(listing as never)).toBe(2650);
        expect(listing?.tags).toEqual(['purple studs']);
    });

    it.each([
        ['an unknown taxonomy', { taxonomy_id: 1 }],
        ['a foreign shipping profile', { shipping_profile_id: 1 }],
        ['a 141-char title', { title: 'x'.repeat(141) }],
        ['14 tags', { tags: Array.from({ length: 14 }, (_, i) => `t${i}`) }],
        ['a 21-char tag', { tags: ['x'.repeat(21)] }],
        ['zero quantity', { quantity: 0 }],
    ])('rejects %s with 400', async (_, overrides) => {
        const { user, headers } = connectedUser(store, 'empty');
        const res = await send(
            'POST',
            `/shops/${user.shopId}/listings`,
            headers,
            draftBody(store, user.shopId as number, overrides)
        );
        expect(res.status).toBe(400);
    });

    it('needs the listings_w scope', async () => {
        const { user, headers } = connectedUser(store, 'empty', ['listings_r', 'shops_r']);
        const res = await send(
            'POST',
            `/shops/${user.shopId}/listings`,
            headers,
            draftBody(store, user.shopId as number)
        );
        expect(res.status).toBe(403);
    });
});

describe('update listing copy', () => {
    it('updates title, description and tags', async () => {
        const { user, headers } = connectedUser(store);
        const listing = [...store.listings.values()].find((l) => l.shopId === user.shopId) as never as {
            listingId: number;
        };
        const res = await send('PATCH', `/shops/${user.shopId}/listings/${listing.listingId}`, headers, {
            title: 'New Title',
            description: 'New desc',
            tags: ['a', 'b'],
        });
        expect(res.status).toBe(200);
        expect(store.listings.get(listing.listingId)).toMatchObject({ title: 'New Title', tags: ['a', 'b'] });
    });
});

describe('inventory', () => {
    it('sets variations and turns an active listing sold_out at zero stock, then back', async () => {
        const { user, headers } = connectedUser(store);
        const listing = [...store.listings.values()].find(
            (l) => l.shopId === user.shopId && l.title === 'Amethyst Drop Earrings'
        ) as never as { listingId: number; state: string };
        const put = (quantity: number) =>
            send('PUT', `/listings/${listing.listingId}/inventory`, headers, {
                products: [
                    {
                        property_values: [{ property_id: null, property_name: 'Colour', values: ['Purple'] }],
                        offerings: [{ price: 24, quantity, is_enabled: true }],
                    },
                ],
            });

        expect((await put(0)).status).toBe(200);
        expect(store.listings.get(listing.listingId)?.state).toBe('sold_out');
        await put(3);
        expect(store.listings.get(listing.listingId)?.state).toBe('active');
    });

    it('rejects three distinct property names', async () => {
        const { user, headers } = connectedUser(store);
        const id = [...store.listings.values()].find((l) => l.shopId === user.shopId)?.listingId;
        const product = (name: string) => ({
            property_values: [{ property_id: null, property_name: name, values: ['x'] }],
            offerings: [{ price: 1, quantity: 1, is_enabled: true }],
        });
        const res = await send('PUT', `/listings/${id}/inventory`, headers, {
            products: [product('A'), product('B'), product('C')],
        });
        expect(res.status).toBe(400);
    });
});

describe('images', () => {
    it('uploads an image, lists it and serves the bytes', async () => {
        const { user, headers } = connectedUser(store);
        const id = [...store.listings.values()].find((l) => l.shopId === user.shopId)?.listingId;
        const form = new FormData();
        form.append('image', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), 'a.png');
        form.append('rank', '1');
        const upload = await app.request(`/v3/application/shops/${user.shopId}/listings/${id}/images`, {
            method: 'POST',
            headers,
            body: form,
        });
        expect(upload.status).toBe(201);

        const list = await (await app.request(`/v3/application/listings/${id}/images`, { headers })).json();
        expect(list.results).toHaveLength(1);
        const served = await app.request(new URL(list.results[0].url_fullxfull).pathname);
        expect(served.headers.get('content-type')).toBe('image/png');
        expect(new Uint8Array(await served.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    });
});
