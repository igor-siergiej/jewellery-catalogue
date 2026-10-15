import type { MockImage, MockListing, MockReceipt, MockStore } from './store';

const money = (amount: number) => ({ amount, divisor: 100, currency_code: 'GBP' });

export const imageJson = (image: MockImage, publicUrl: string) => ({
    listing_image_id: image.imageId,
    rank: image.rank,
    url_75x75: `${publicUrl}/images/${image.imageId}`,
    url_570xN: `${publicUrl}/images/${image.imageId}`,
    url_fullxfull: `${publicUrl}/images/${image.imageId}`,
});

export const listingJson = (store: MockStore, l: MockListing, publicUrl: string, withImages: boolean) => ({
    listing_id: l.listingId,
    shop_id: l.shopId,
    title: l.title,
    description: l.description,
    state: l.state,
    quantity: store.listingQuantity(l),
    price: money(store.listingPriceAmount(l)),
    url: `${publicUrl}/listing/${l.listingId}`,
    tags: l.tags,
    taxonomy_id: l.taxonomyId,
    has_variations: l.products.some((p) => p.propertyValues.length > 0),
    created_timestamp: l.createdAt,
    updated_timestamp: l.updatedAt,
    ...(withImages
        ? { images: [...l.images].sort((a, b) => a.rank - b.rank).map((i) => imageJson(i, publicUrl)) }
        : {}),
});

export const inventoryJson = (l: MockListing) => ({
    products: l.products.map((p, i) => ({
        product_id: l.listingId * 100 + i,
        property_values: p.propertyValues.map((pv) => ({ property_name: pv.propertyName, values: pv.values })),
        offerings: p.offerings.map((o, j) => ({
            offering_id: l.listingId * 1000 + i * 10 + j,
            price: money(o.amount),
            quantity: o.quantity,
            is_enabled: o.isEnabled,
        })),
    })),
});

export const receiptJson = (r: MockReceipt) => ({
    receipt_id: r.receiptId,
    shop_id: r.shopId,
    status: r.status,
    is_paid: r.isPaid,
    created_timestamp: r.createdAt,
    updated_timestamp: r.updatedAt,
    transactions: r.transactions.map((t) => ({
        transaction_id: t.transactionId,
        listing_id: t.listingId,
        title: t.title,
        quantity: t.quantity,
        price: money(t.amount),
        variations: t.variations.map((v) => ({ formatted_name: v.formattedName, formatted_value: v.formattedValue })),
    })),
});

export const page = <T>(items: T[], limit: string | undefined, offset: string | undefined) => {
    const start = Number(offset ?? 0);
    return { count: items.length, results: items.slice(start, start + Number(limit ?? 25)) };
};
