import { type Context, Hono } from 'hono';
import { type MockEnv, requireApiKey, requireToken } from '../auth';
import { TAXONOMY, taxonomyIds } from '../fixtures';
import { imageJson, inventoryJson, listingJson, page, receiptJson } from '../serialize';
import type { MockProduct, MockStore } from '../store';

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

    const WHO_MADE = ['i_did', 'someone_else', 'collective'];
    const copyError = (body: { title?: unknown; tags?: unknown }): string | undefined => {
        if (body.title !== undefined && (typeof body.title !== 'string' || !body.title || body.title.length > 140)) {
            return 'title must be 1-140 characters';
        }
        if (body.tags !== undefined) {
            if (!Array.isArray(body.tags) || body.tags.length > 13) return 'at most 13 tags';
            if (body.tags.some((t) => typeof t !== 'string' || t.length > 20))
                return 'tags must be at most 20 characters';
        }
        return undefined;
    };
    const ownListing = (c: Context<MockEnv>, shopId: number) => {
        const listing = findListing(c);
        return listing && listing.shopId === shopId ? listing : undefined;
    };

    app.post('/shops/:shopId/listings', requireToken(store, 'listings_w'), async (c) => {
        const shopId = ownShop(c);
        if (shopId instanceof Response) return shopId;
        const shop = store.shops.get(shopId);
        const b = (await c.req.json()) as Record<string, unknown>;
        const error =
            (!b.title && 'title is required') ||
            copyError(b as { title?: unknown; tags?: unknown }) ||
            (!(Number.isInteger(b.quantity) && b.quantity >= 1 && b.quantity <= 999) && 'quantity must be 1-999') ||
            (!(b.price > 0) && 'price must be greater than 0') ||
            (!WHO_MADE.includes(b.who_made as string) && 'invalid who_made') ||
            (!b.when_made && 'when_made is required') ||
            (!taxonomyIds().includes(b.taxonomy_id as number) && `unknown taxonomy_id ${b.taxonomy_id}`) ||
            (!shop?.shippingProfiles.some((p) => p.shippingProfileId === b.shipping_profile_id) &&
                'shipping_profile_id does not belong to this shop') ||
            (!shop?.readinessStates.some((r) => r.readinessStateId === b.readiness_state_id) &&
                'readiness_state_id does not belong to this shop');
        if (error) return c.json({ error }, 400);

        const listing = store.addListing(shopId, {
            title: b.title as string,
            description: (b.description as string) ?? '',
            tags: (b.tags as string[]) ?? [],
            state: 'draft',
            price: b.price as number,
            quantity: b.quantity as number,
            taxonomyId: b.taxonomy_id as number,
        });
        return c.json(listingJson(store, listing, publicUrl, false), 201);
    });

    app.patch('/shops/:shopId/listings/:listingId', requireToken(store, 'listings_w'), async (c) => {
        const shopId = ownShop(c);
        if (shopId instanceof Response) return shopId;
        const listing = ownListing(c, shopId);
        if (!listing) return notFound(c);
        const b = (await c.req.json()) as Record<string, unknown>;
        const error = copyError(b as { title?: unknown; tags?: unknown });
        if (error) return c.json({ error }, 400);
        if (b.title !== undefined) listing.title = b.title as string;
        if (b.description !== undefined) listing.description = b.description as string;
        if (b.tags !== undefined) listing.tags = b.tags as string[];
        listing.updatedAt = store.now();
        return c.json(listingJson(store, listing, publicUrl, false));
    });

    app.post('/shops/:shopId/listings/:listingId/images', requireToken(store, 'listings_w'), async (c) => {
        const shopId = ownShop(c);
        if (shopId instanceof Response) return shopId;
        const listing = ownListing(c, shopId);
        if (!listing) return notFound(c);
        const form = await c.req.formData();
        const file = form.get('image');
        if (!(file instanceof File)) return c.json({ error: 'image file is required' }, 400);
        if (listing.images.length >= 10) return c.json({ error: 'a listing can have at most 10 images' }, 400);
        const image = {
            imageId: store.id(),
            rank: Number(form.get('rank') ?? listing.images.length + 1),
            contentType: file.type || 'application/octet-stream',
            bytes: new Uint8Array(await file.arrayBuffer()),
        };
        listing.images.push(image);
        return c.json(imageJson(image, publicUrl), 201);
    });

    app.put('/listings/:listingId/inventory', requireToken(store, 'listings_w'), async (c) => {
        const listing = findListing(c);
        if (!listing) return notFound(c);
        if (store.users.get(c.get('etsyUserId'))?.shopId !== listing.shopId) {
            return c.json({ error: 'Not your shop' }, 403);
        }
        const b = (await c.req.json()) as {
            products?: Array<{
                property_values: Array<{ property_name: string; values: string[] }>;
                offerings: Array<{ price: number; quantity: number; is_enabled: boolean }>;
            }>;
        };
        const products = b.products ?? [];
        const names = new Set(products.flatMap((p) => p.property_values.map((pv) => pv.property_name)));
        const error =
            (products.length === 0 && 'products must not be empty') ||
            (products.some((p) => p.offerings.length !== 1) && 'each product needs exactly one offering') ||
            (names.size > 2 && 'at most two variation properties') ||
            (products.some((p) => !(p.offerings[0].price > 0)) && 'price must be greater than 0');
        if (error) return c.json({ error }, 400);

        listing.products = products.map<MockProduct>((p) => ({
            propertyValues: p.property_values.map((pv) => ({ propertyName: pv.property_name, values: pv.values })),
            offerings: p.offerings.map((o) => ({
                amount: Math.round(o.price * 100),
                quantity: o.quantity,
                isEnabled: o.is_enabled,
            })),
        }));
        store.applyStockState(listing);
        return c.json(inventoryJson(listing));
    });

    return app;
};
