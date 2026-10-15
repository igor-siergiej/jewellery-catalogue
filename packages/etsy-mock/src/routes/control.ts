import { Hono, type MiddlewareHandler } from 'hono';
import type { Scenario } from '../fixtures';
import { listingJson, receiptJson } from '../serialize';
import type { AddListingInput, ListingState, MockStore } from '../store';

export const faultInjection =
    (store: MockStore): MiddlewareHandler =>
    async (c, next) => {
        const fault = store.faults.find(
            (f) => f.remaining > 0 && c.req.path.includes(f.path) && (!f.method || f.method === c.req.method)
        );
        if (!fault) return next();
        fault.remaining -= 1;
        store.faults = store.faults.filter((f) => f.remaining > 0);
        return c.body(fault.body, fault.status as 400, { 'Content-Type': 'application/json' });
    };

export const controlRoutes = (store: MockStore, publicUrl: string) => {
    const app = new Hono();
    const ownerOf = (shopId: number) => [...store.users.values()].find((u) => u.shopId === shopId)?.userId;

    app.get('/state', (c) =>
        c.json({
            users: [...store.users.values()],
            shops: [...store.shops.values()].map((shop) => ({
                ...shop,
                userId: ownerOf(shop.shopId),
                listings: [...store.listings.values()]
                    .filter((l) => l.shopId === shop.shopId)
                    .map((l) => listingJson(store, l, publicUrl, true)),
                receipts: [...store.receipts.values()].filter((r) => r.shopId === shop.shopId).map(receiptJson),
            })),
            faults: store.faults,
        })
    );

    app.get('/shops', (c) => {
        const name = c.req.query('name');
        return c.json(
            [...store.shops.values()]
                .filter((s) => name === undefined || s.shopName === name)
                .map((s) => ({ shopId: s.shopId, shopName: s.shopName, userId: ownerOf(s.shopId) }))
        );
    });

    app.post('/reset', (c) => {
        store.reset();
        return c.json({ ok: true });
    });

    app.post('/shops', async (c) => {
        const b = (await c.req.json().catch(() => ({}))) as { shopName?: string; scenario?: Scenario };
        const user = store.createUser({ shopName: b.shopName, scenario: b.scenario ?? 'established' });
        return c.json({ userId: user.userId, shopId: user.shopId });
    });

    app.post('/shops/:shopId/listings', async (c) => {
        const shopId = Number(c.req.param('shopId'));
        if (!store.shops.has(shopId)) return c.json({ error: 'Shop not found' }, 404);
        const listing = store.addListing(shopId, (await c.req.json()) as AddListingInput);
        return c.json(listingJson(store, listing, publicUrl, true));
    });

    app.post('/listings/:listingId/state', async (c) => {
        const listing = store.listings.get(Number(c.req.param('listingId')));
        if (!listing) return c.json({ error: 'Listing not found' }, 404);
        listing.state = ((await c.req.json()) as { state: ListingState }).state;
        listing.updatedAt = store.now();
        return c.json(listingJson(store, listing, publicUrl, false));
    });

    app.post('/shops/:shopId/orders', async (c) => {
        try {
            const receipt = store.createOrder(Number(c.req.param('shopId')), await c.req.json());
            return c.json(receiptJson(receipt));
        } catch (err) {
            return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
        }
    });

    app.post('/receipts/:receiptId/status', async (c) => {
        const receipt = store.receipts.get(Number(c.req.param('receiptId')));
        if (!receipt) return c.json({ error: 'Receipt not found' }, 404);
        receipt.status = ((await c.req.json()) as { status: string }).status;
        receipt.updatedAt = store.now();
        return c.json(receiptJson(receipt));
    });

    app.post('/tokens/expire', (c) => {
        for (const t of store.tokens.values()) t.expiresAt = 0;
        return c.json({ ok: true });
    });

    app.post('/tokens/revoke-scope', async (c) => {
        const { scope } = (await c.req.json()) as { scope: string };
        for (const t of store.tokens.values()) t.scopes = t.scopes.filter((s) => s !== scope);
        return c.json({ ok: true });
    });

    app.post('/faults', async (c) => {
        const b = (await c.req.json()) as {
            method?: string;
            path: string;
            status: number;
            body?: unknown;
            times?: number;
        };
        store.faults.push({
            method: b.method?.toUpperCase(),
            path: b.path,
            status: b.status,
            body: JSON.stringify(b.body ?? { error: 'Injected fault' }),
            remaining: b.times ?? 1,
        });
        return c.json({ ok: true });
    });

    app.delete('/faults', (c) => {
        store.faults = [];
        return c.json({ ok: true });
    });

    return app;
};
