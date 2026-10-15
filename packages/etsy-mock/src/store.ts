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

    // fallow-ignore-next-line unused-class-member
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

    // fallow-ignore-next-line unused-class-member
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
}
