import { createHash, randomBytes } from 'node:crypto';
import { type Scenario, seedShop } from './fixtures';

export type { Scenario } from './fixtures';
export type ListingState = 'draft' | 'active' | 'inactive' | 'sold_out' | 'expired';

export interface MockOffering {
    amount: number; // minor units (pence)
    quantity: number;
    isEnabled: boolean;
}
export interface MockProduct {
    propertyValues: Array<{ propertyName: string; values: string[] }>;
    offerings: MockOffering[];
}
export interface MockImage {
    imageId: number;
    rank: number;
    contentType: string;
    bytes: Uint8Array;
}
export interface MockListing {
    listingId: number;
    shopId: number;
    title: string;
    description: string;
    tags: string[];
    state: ListingState;
    taxonomyId: number;
    products: MockProduct[];
    images: MockImage[];
    createdAt: number; // epoch seconds
    updatedAt: number;
}
export interface MockTransaction {
    transactionId: number;
    listingId: number;
    title: string;
    quantity: number;
    amount: number;
    variations: Array<{ formattedName: string; formattedValue: string }>;
}
export interface MockReceipt {
    receiptId: number;
    shopId: number;
    status: string;
    isPaid: boolean;
    createdAt: number;
    updatedAt: number;
    transactions: MockTransaction[];
}
// fallow-ignore-next-line unused-type
export interface MockShop {
    shopId: number;
    shopName: string;
    shippingProfiles: Array<{ shippingProfileId: number; title: string }>;
    readinessStates: Array<{ readinessStateId: number; readinessState: 'ready_to_ship' | 'made_to_order' }>;
    transactionSoldCount: number;
}
export interface MockUser {
    userId: number;
    shopId: number | null;
}
export interface MockToken {
    accessToken: string;
    refreshToken: string;
    userId: number;
    scopes: string[];
    expiresAt: number; // epoch seconds
}
export interface PendingCode {
    userId: number;
    codeChallenge: string;
    redirectUri: string;
    scopes: string[];
}
export interface Fault {
    method?: string;
    path: string;
    status: number;
    body: string;
    remaining: number;
}

export interface AddListingInput {
    title: string;
    description?: string;
    tags?: string[];
    state: ListingState;
    price: number; // major units
    quantity?: number;
    taxonomyId?: number;
    variations?: Array<{ propertyName: string; value: string; quantity: number }>;
}

export class MockStore {
    private nextId = 1000;
    users = new Map<number, MockUser>();
    shops = new Map<number, MockShop>();
    listings = new Map<number, MockListing>();
    receipts = new Map<number, MockReceipt>();
    tokens = new Map<string, MockToken>();
    codes = new Map<string, PendingCode>();
    faults: Fault[] = [];

    constructor(readonly tokenTtlSeconds = 3600) {}

    id(): number {
        return this.nextId++;
    }

    now(): number {
        return Math.floor(Date.now() / 1000);
    }

    reset(): void {
        this.nextId = 1000;
        for (const map of [this.users, this.shops, this.listings, this.receipts, this.tokens, this.codes]) {
            map.clear();
        }
        this.faults = [];
    }

    createUser(input: { shopName?: string; scenario: Scenario }): MockUser {
        const userId = this.id();
        if (input.scenario === 'no-shop') {
            const user = { userId, shopId: null };
            this.users.set(userId, user);
            return user;
        }
        const shopId = this.id();
        this.shops.set(shopId, {
            shopId,
            shopName: input.shopName?.trim() || `MockShop${shopId}`,
            shippingProfiles: [],
            readinessStates: [],
            transactionSoldCount: 0,
        });
        const user = { userId, shopId };
        this.users.set(userId, user);
        seedShop(this, shopId, input.scenario);
        return user;
    }

    addListing(shopId: number, input: AddListingInput): MockListing {
        const amount = Math.round(input.price * 100);
        const products: MockProduct[] = input.variations?.length
            ? input.variations.map((v) => ({
                  propertyValues: [{ propertyName: v.propertyName, values: [v.value] }],
                  offerings: [{ amount, quantity: v.quantity, isEnabled: true }],
              }))
            : [{ propertyValues: [], offerings: [{ amount, quantity: input.quantity ?? 1, isEnabled: true }] }];
        const now = this.now();
        const listing: MockListing = {
            listingId: this.id(),
            shopId,
            title: input.title,
            description: input.description ?? '',
            tags: input.tags ?? [],
            state: input.state,
            taxonomyId: input.taxonomyId ?? 1200,
            products,
            images: [],
            createdAt: now,
            updatedAt: now,
        };
        this.listings.set(listing.listingId, listing);
        return listing;
    }

    listingQuantity(listing: MockListing): number {
        return listing.products
            .flatMap((p) => p.offerings)
            .filter((o) => o.isEnabled)
            .reduce((sum, o) => sum + o.quantity, 0);
    }
    listingPriceAmount(listing: MockListing): number {
        return listing.products.flatMap((p) => p.offerings).find((o) => o.isEnabled)?.amount ?? 0;
    }

    /** Etsy flips active <-> sold_out as stock hits or leaves zero. */
    applyStockState(listing: MockListing): void {
        const quantity = this.listingQuantity(listing);
        if (listing.state === 'active' && quantity === 0) listing.state = 'sold_out';
        else if (listing.state === 'sold_out' && quantity > 0) listing.state = 'active';
        listing.updatedAt = this.now();
    }

    createOrder(
        shopId: number,
        input: { listingId: number; quantity: number; variation?: { propertyName: string; value: string } }
    ): MockReceipt {
        const listing = this.listings.get(input.listingId);
        if (!listing || listing.shopId !== shopId) throw new Error(`Listing ${input.listingId} not in shop ${shopId}`);
        if (listing.state !== 'active') throw new Error(`Listing ${input.listingId} is ${listing.state}, not active`);

        const product = input.variation
            ? listing.products.find((p) =>
                  p.propertyValues.some(
                      (pv) =>
                          pv.propertyName === input.variation?.propertyName && pv.values.includes(input.variation.value)
                  )
              )
            : listing.products.find((p) => p.offerings.some((o) => o.isEnabled && o.quantity > 0));
        const offering = product?.offerings.find((o) => o.isEnabled);
        if (!product || !offering || offering.quantity < input.quantity) {
            throw new Error(`Not enough stock on listing ${input.listingId}`);
        }

        offering.quantity -= input.quantity;
        this.applyStockState(listing);
        const shop = this.shops.get(shopId);
        if (shop) shop.transactionSoldCount += input.quantity;

        const now = this.now();
        const receipt: MockReceipt = {
            receiptId: this.id(),
            shopId,
            status: 'paid',
            isPaid: true,
            createdAt: now,
            updatedAt: now,
            transactions: [
                {
                    transactionId: this.id(),
                    listingId: listing.listingId,
                    title: listing.title,
                    quantity: input.quantity,
                    amount: offering.amount,
                    variations: product.propertyValues.map((pv) => ({
                        formattedName: pv.propertyName,
                        formattedValue: pv.values.join(', '),
                    })),
                },
            ],
        };
        this.receipts.set(receipt.receiptId, receipt);
        return receipt;
    }

    issueCode(pending: PendingCode): string {
        const code = randomBytes(16).toString('hex');
        this.codes.set(code, pending);
        return code;
    }

    exchangeCode(args: { code: string; codeVerifier: string; redirectUri: string }): MockToken | string {
        const pending = this.codes.get(args.code);
        this.codes.delete(args.code);
        if (!pending) return 'invalid_grant: unknown or used code';
        if (pending.redirectUri !== args.redirectUri) return 'invalid_grant: redirect_uri mismatch';
        const challenge = createHash('sha256')
            .update(args.codeVerifier)
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        if (challenge !== pending.codeChallenge) return 'invalid_grant: code_verifier does not match';
        return this.issueToken(pending.userId, pending.scopes);
    }

    refresh(refreshToken: string): MockToken | undefined {
        const existing = [...this.tokens.values()].find((t) => t.refreshToken === refreshToken);
        if (!existing) return undefined;
        this.tokens.delete(existing.accessToken);
        return this.issueToken(existing.userId, existing.scopes);
    }

    // Etsy access tokens are prefixed with the user id ("12345.xxxx"). Public so tests can skip the OAuth dance.
    issueToken(userId: number, scopes: string[]): MockToken {
        const token: MockToken = {
            accessToken: `${userId}.${randomBytes(24).toString('hex')}`,
            refreshToken: `${userId}.${randomBytes(24).toString('hex')}`,
            userId,
            scopes,
            expiresAt: this.now() + this.tokenTtlSeconds,
        };
        this.tokens.set(token.accessToken, token);
        return token;
    }

    // ---- CSV import ----
    //
    // Bulk-load real Etsy shop data into the mock. Each method takes a raw CSV
    // string and an options bag, returns an ImportSummary. The two methods
    // share a small in-house CSV parser that handles quoted strings (the
    // Etsy Listings export has multi-line quoted descriptions and ',' inside
    // tags/categories, which a naive line-splitter gets wrong).
    //
    // The Etsy Sold Orders export is per-order (one row per order), and
    // doesn't break each row into per-line-item transactions — so each row
    // becomes a single MockReceipt with a single MockTransaction whose
    // listingId is left at 0 (caller can re-link). Amounts are taken from
    // "Order Net" in pence. Status maps 1:1; isPaid is true unless the
    // status is one of {cancelled, refunded, voided}.

    importListingsFromCsv(
        text: string,
        opts: { shopId: number; defaultState?: ListingState; defaultTaxonomyId?: number }
    ): ImportSummary {
        const rows = parseCsv(text);
        let imported = 0;
        let skipped = 0;
        const state = opts.defaultState ?? 'active';
        const taxonomyId = opts.defaultTaxonomyId ?? 1200;
        for (const r of rows) {
            const title = (r.TITLE ?? '').trim().slice(0, 140);
            if (!title) {
                skipped++;
                continue;
            }
            const price = Number(r.PRICE);
            if (!Number.isFinite(price) || price <= 0) {
                skipped++;
                continue;
            }
            const quantityRaw = Number(r.QUANTITY || '1');
            const quantity = Math.max(1, Math.min(999, Number.isFinite(quantityRaw) ? quantityRaw : 1));
            const tags = (r.TAGS ?? '')
                .split(/[|,;]/)
                .map((t) => t.trim())
                .filter(Boolean)
                .slice(0, 13)
                .map((t) => t.slice(0, 20));
            const description = (r.DESCRIPTION ?? '').trim();
            const variations: Array<{ propertyName: string; value: string; quantity: number }> = [];
            for (const [typeKey, valuesKey] of [
                ['VARIATION 1 TYPE', 'VARIATION 1 VALUES'],
                ['VARIATION 2 TYPE', 'VARIATION 2 VALUES'],
                ['VARIATION 3 TYPE', 'VARIATION 3 VALUES'],
            ] as const) {
                const typeName = (r[typeKey] ?? '').trim();
                const rawValues = (r[valuesKey] ?? '').trim();
                if (!typeName || !rawValues) continue;
                for (const v of rawValues
                    .split(/[|,;]/)
                    .map((s) => s.trim())
                    .filter(Boolean)) {
                    variations.push({ propertyName: typeName, value: v, quantity });
                }
            }
            this.addListing(opts.shopId, {
                title,
                description,
                tags,
                state,
                price,
                quantity,
                taxonomyId,
                ...(variations.length > 0 ? { variations } : {}),
            });
            imported++;
        }
        return { imported, skipped };
    }

    importReceiptsFromCsv(text: string, opts: { shopId: number }): ImportSummary {
        const rows = parseCsv(text);
        let imported = 0;
        let skipped = 0;
        const paidStatuses = new Set(['paid', 'shipped', 'delivered', 'processing', 'completed']);
        for (const r of rows) {
            const orderId = (r['Order ID'] ?? '').trim();
            if (!orderId) {
                skipped++;
                continue;
            }
            const status = (r.Status ?? 'paid').trim() || 'paid';
            const createdAt = parseShortDate(r['Sale Date']) ?? this.now();
            const updatedAt = parseShortDate(r['Date Shipped']) ?? createdAt;
            const netRaw = Number(r['Order Net']);
            const orderValue = Number(r['Order Value']);
            const amountMajorUnits = Number.isFinite(netRaw) && netRaw > 0 ? netRaw : orderValue;
            const quantity = Math.max(1, Number(r['Number of Items'] || '1') || 1);
            const explicitId = Number(orderId);
            const receiptId = Number.isInteger(explicitId) && explicitId > 0 ? explicitId : this.id();
            if (this.receipts.has(receiptId)) {
                skipped++;
                continue;
            }
            const receipt: MockReceipt = {
                receiptId,
                shopId: opts.shopId,
                status,
                isPaid: paidStatuses.has(status.toLowerCase()),
                createdAt,
                updatedAt,
                transactions: [
                    {
                        transactionId: this.id(),
                        listingId: 0,
                        title: `Order ${orderId}`,
                        quantity,
                        amount: Number.isFinite(amountMajorUnits) ? Math.round(amountMajorUnits * 100) : 0,
                        variations: [],
                    },
                ],
            };
            this.receipts.set(receipt.receiptId, receipt);
            imported++;
        }
        return { imported, skipped };
    }
}

// Result of a bulk import.
export interface ImportSummary {
    imported: number;
    skipped: number;
}

// Parse a quoted CSV string. Handles commas, double-quoted fields, embedded
// doubled quotes ("" -> "), and newlines inside quoted fields (which the
// Etsy Listings export uses for multi-line descriptions). The first row
// is treated as the header.
const parseCsv = (text: string): Array<Record<string, string>> => {
    const out: Array<Record<string, string>> = [];
    let row: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"' && text[i + 1] === '"') {
                cur += '"';
                i++;
            } else if (c === '"') {
                inQuotes = false;
            } else {
                cur += c;
            }
            continue;
        }
        if (c === '"') {
            inQuotes = true;
            continue;
        }
        if (c === ',') {
            row.push(cur);
            cur = '';
            continue;
        }
        if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(cur);
            cur = '';
            if (row.length > 1 || row[0] !== '') out.push(row);
            row = [];
            continue;
        }
        cur += c;
    }
    if (cur !== '' || row.length > 0) {
        row.push(cur);
        if (row.length > 1 || row[0] !== '') out.push(row);
    }
    if (out.length === 0) return [];
    const header = out[0] ?? [];
    return out.slice(1).map((cells) => {
        const obj: Record<string, string> = {};
        for (let i = 0; i < header.length; i++) obj[header[i] ?? ''] = cells[i] ?? '';
        return obj;
    });
};

// Etsy exports dates as m/d/yy in the user's local zone. Returns epoch seconds
// or null for unparseable input.
const parseShortDate = (raw: string | undefined): number | null => {
    if (!raw) return null;
    const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return null;
    const month = Number(m[1]);
    const day = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, month - 1, day);
    if (Number.isNaN(d.getTime())) return null;
    return Math.floor(d.getTime() / 1000);
};
