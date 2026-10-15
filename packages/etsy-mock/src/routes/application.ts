import { type Context, Hono } from 'hono';
import { type MockEnv, requireApiKey, requireToken } from '../auth';
import { TAXONOMY } from '../fixtures';
import { imageJson, inventoryJson, listingJson, page, receiptJson } from '../serialize';
import type { MockStore } from '../store';

export const applicationRoutes = (store: MockStore, publicUrl: string) => {
    const app = new Hono<MockEnv>();
    app.use('*', requireApiKey());

    const ownShop = (c: Context<MockEnv>): number | Response => {
        const shopId = Number(c.req.param('shopId'));
        const user = store.users.get(c.get('etsyUserId'));
        if (!store.shops.has(shopId)) return c.json({ error: 'Shop not found' }, 404);
        if (user?.shopId !== shopId) return c.json({ error: 'Not your shop' }, 403);
        return shopId;
    };
    const findListing = (c: Context<MockEnv>) => store.listings.get(Number(c.req.param('listingId')));
    const notFound = (c: Context<MockEnv>) => c.json({ error: 'Listing not found' }, 404);

    app.get('/users/me', requireToken(store), (c) => {
        const user = store.users.get(c.get('etsyUserId'));
        return c.json({ user_id: user?.userId, shop_id: user?.shopId ?? null });
    });

    app.get('/shops/:shopId', (c) => {
        const shop = store.shops.get(Number(c.req.param('shopId')));
        if (!shop) return c.json({ error: 'Shop not found' }, 404);
        const active = [...store.listings.values()].filter((l) => l.shopId === shop.shopId && l.state === 'active');
        return c.json({
            shop_id: shop.shopId,
            shop_name: shop.shopName,
            listing_active_count: active.length,
            transaction_sold_count: shop.transactionSoldCount,
        });
    });

    app.get('/shops/:shopId/listings', requireToken(store, 'listings_r'), (c) => {
        const shopId = ownShop(c);
        if (shopId instanceof Response) return shopId;
        const state = c.req.query('state') ?? 'active';
        const withImages = (c.req.query('includes') ?? '').includes('Images');
        const listings = [...store.listings.values()]
            .filter((l) => l.shopId === shopId && l.state === state)
            .sort((a, b) => a.listingId - b.listingId)
            .map((l) => listingJson(store, l, publicUrl, withImages));
        return c.json(page(listings, c.req.query('limit'), c.req.query('offset')));
    });

    app.get('/shops/:shopId/shipping-profiles', requireToken(store, 'shops_r'), (c) => {
        const shopId = ownShop(c);
        if (shopId instanceof Response) return shopId;
        const results = (store.shops.get(shopId)?.shippingProfiles ?? []).map((p) => ({
            shipping_profile_id: p.shippingProfileId,
            title: p.title,
        }));
        return c.json({ count: results.length, results });
    });

    app.get('/shops/:shopId/readiness-state-definitions', requireToken(store, 'shops_r'), (c) => {
        const shopId = ownShop(c);
        if (shopId instanceof Response) return shopId;
        const results = (store.shops.get(shopId)?.readinessStates ?? []).map((r) => ({
            readiness_state_id: r.readinessStateId,
            readiness_state: r.readinessState,
        }));
        return c.json({ count: results.length, results });
    });

    app.get('/shops/:shopId/receipts', requireToken(store, 'transactions_r'), (c) => {
        const shopId = ownShop(c);
        if (shopId instanceof Response) return shopId;
        const since = Number(c.req.query('min_last_modified') ?? 0);
        const receipts = [...store.receipts.values()]
            .filter((r) => r.shopId === shopId && r.updatedAt >= since)
            .sort((a, b) => a.updatedAt - b.updatedAt || a.receiptId - b.receiptId)
            .map(receiptJson);
        return c.json(page(receipts, c.req.query('limit'), c.req.query('offset')));
    });

    app.get('/listings/:listingId', (c) => {
        const listing = findListing(c);
        if (!listing) return notFound(c);
        return c.json(listingJson(store, listing, publicUrl, (c.req.query('includes') ?? '').includes('Images')));
    });

    app.get('/listings/:listingId/inventory', requireToken(store, 'listings_r'), (c) => {
        const listing = findListing(c);
        return listing ? c.json(inventoryJson(listing)) : notFound(c);
    });

    app.get('/listings/:listingId/images', requireToken(store, 'listings_r'), (c) => {
        const listing = findListing(c);
        if (!listing) return notFound(c);
        const results = [...listing.images].sort((a, b) => a.rank - b.rank).map((i) => imageJson(i, publicUrl));
        return c.json({ count: results.length, results });
    });

    app.get('/seller-taxonomy/nodes', (c) => c.json({ count: TAXONOMY.length, results: TAXONOMY }));

    return app;
};
