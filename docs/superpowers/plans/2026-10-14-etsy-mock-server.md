# Etsy Mock Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A stateful fake of the Etsy Open API v3, run with Bun, that the API can point at instead of Etsy. It lets the whole Etsy integration (connect, push, status, reconcile, listing copy, order sync) be developed and tested locally and in e2e without a real Etsy shop.

**Architecture:** A new workspace package, `packages/etsy-mock`. It is a Hono app on `Bun.serve` with an in-memory `MockStore`, and it mirrors Etsy's URL layout (`/oauth/connect`, `/v3/public/oauth/token`, `/v3/application/...`). It covers only the endpoints `EtsyClient` calls. The API gains one optional env var, `ETSY_MOCK_URL`. When it's set, `EtsyClient` sends every call to the mock instead of Etsy; when it's unset, prod behaves as before. The mock also has:
- a consent page at `/oauth/connect` where you pick or create a shop;
- `/__mock/*` control endpoints for seeding data, simulating seller actions and sales, and injecting faults;
- an HTML dashboard at `/` for manual testing.

**Tech Stack:** Bun 1.4, Hono 4, `bun:test`, Playwright e2e, Biome.

**Spec:** No separate spec doc. The design was agreed in the conversation of 2026-10-14. A real Etsy shop costs £14 to open and Etsy has no sandbox. So the mock has to make the integration testable for "someone with an existing shop" and also reproduce the "account without a shop" case seen on prod.

## Global Constraints

- Bun workspace package named `@jewellery-catalogue/etsy-mock`, under `packages/etsy-mock`, `private: true`, not built into any Docker image.
- `hono` version range matches `packages/api/package.json` (`^4.13.13`).
- Default port `3010` (3000 web, 3001 api, 3008 mock Kivo, 9000 MinIO are taken).
- Prod behaviour is unchanged when `ETSY_MOCK_URL` is unset. The real Etsy URLs stay the defaults.
- Wire format mirrors Etsy's: snake_case JSON, money as `{ amount, divisor, currency_code }`, timestamps in epoch seconds, paginated lists as `{ count, results }`.
- The mock checks what Etsy checks and our code depends on: an `x-api-key` header in `keystring:shared_secret` form, a bearer token on user-scoped endpoints, OAuth scopes (`transactions_r` for receipts, `listings_w` for writes) and PKCE S256.
- Unit tests use `bun:test` and are colocated (`*.test.ts`), as in `packages/api`.
- Per user CLAUDE.md: add comments only where the code can't explain itself. Check the package manager is Bun before running commands.

## Review Focus

1. **Parallel e2e workers sharing one mock.** Each test must get its own Etsy shop, never "the" shop. The consent page always offers "create a new shop", and the e2e spec gives each shop a unique name. Pinned in Task 2 (two authorisations give two different shops) and Task 9.
2. **Expired access token in the middle of a session.** `EtsyConnectionService.getValidAccessToken` refreshes when a token is near expiry. The mock must reject expired tokens with 401 and must rotate both tokens on refresh, or the refresh path is never exercised. Pinned in Task 2 (refresh rotates; old access token rejected) and Task 5 (`/__mock/tokens/expire`).
3. **Account without a shop (the prod state).** `users/me` returns `shop_id: null` and `GET /shops/null` must fail, so the callback redirects to `?etsy=error` instead of crashing. Pinned in Task 3.
4. **Stock reaching zero.** Etsy turns an active listing `sold_out` when its inventory reaches 0, and back to `active` when restocked. `EtsyStatusService` reads both states, so the mock must make these transitions or "sold out" UI is never reachable. Pinned in Task 4 (inventory PUT) and Task 5 (order creation).
5. **More than 100 listings or receipts.** `EtsyClient` paginates with `limit=100&offset=…` and stops when `offset >= count`. A wrong `count` from the mock either loops forever or truncates. Pinned in Task 3 (150 listings come back as 100 + 50 with `count: 150`).

---

## File Structure

```
packages/etsy-mock/
  package.json
  tsconfig.json
  src/
    index.ts            # Bun.serve entry, reads env
    app.ts              # createEtsyMockApp({ store, publicUrl }) wires routes
    store.ts            # MockStore: all state + domain operations (tokens, listings, orders, faults)
    store.test.ts
    fixtures.ts         # taxonomy tree, scenario seeding
    serialize.ts        # MockListing/receipt -> Etsy wire JSON
    auth.ts             # requireApiKey, requireToken middleware
    routes/
      oauth.ts          # /oauth/connect (consent page + decision), /v3/public/oauth/token
      oauth.test.ts
      application.ts    # /v3/application/* read + write endpoints
      application.test.ts
      control.ts        # /__mock/* control + fault injection middleware
      control.test.ts
      dashboard.ts      # GET / HTML dashboard
packages/api/src/config/index.ts                    # + etsyMockUrl
packages/api/src/domain/EtsyClient/index.ts         # urls injected
packages/api/src/domain/EtsyClient/urls.test.ts
packages/api/src/dependencies/index.ts              # pass urls
packages/api/src/index.ts                           # startup warning
packages/web/playwright.config.ts                   # mock as CI webServer, env
packages/web/tests/e2e/etsy-mock.spec.ts            # real round trip through mock
packages/web/tests/e2e/utils/etsy-mock.ts           # control-API helpers for specs
packages/web/tests/e2e/mocks/auth.ts                # + MOCK_TOKEN_ETSY_MOCK
package.json, .env.example, AGENTS.md, README.md    # scripts + docs
```

---

### Task 1: Package scaffold, store and scenarios

**Files:**
- Create: `packages/etsy-mock/package.json`, `packages/etsy-mock/tsconfig.json`, `packages/etsy-mock/src/store.ts`, `packages/etsy-mock/src/fixtures.ts`
- Test: `packages/etsy-mock/src/store.test.ts`

**Interfaces:**
- Produces: `MockStore` (class), the types `ListingState`, `MockListing`, `MockProduct`, `MockImage`, `MockShop`, `MockUser`, `MockReceipt` and `Scenario`, and `TAXONOMY` and `taxonomyIds()` from `fixtures.ts`. `store.createUser({ shopName?, scenario })` returns a `MockUser`. `store.addListing(shopId, input)` returns a `MockListing`. `store.listingQuantity(l)` and `store.listingPriceAmount(l)` return numbers.

- [ ] **Step 1: Create the package files**

`packages/etsy-mock/package.json`:
```json
{
  "name": "@jewellery-catalogue/etsy-mock",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "bun --watch src/index.ts",
    "test": "bun test"
  },
  "dependencies": {
    "hono": "^4.13.13"
  },
  "devDependencies": {
    "@types/bun": "^1.4.2",
    "typescript": "^7.0.2"
  }
}
```

`packages/etsy-mock/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "include": ["src"]
}
```

Run: `bun install` (from the repo root; this updates `bun.lock`).

- [ ] **Step 2: Write the failing test**

`packages/etsy-mock/src/store.test.ts`:
```ts
import { describe, expect, it } from 'bun:test';
import { MockStore } from './store';

describe('MockStore', () => {
    it('creates an established shop with listings in every state the app reads', () => {
        const store = new MockStore();
        const user = store.createUser({ shopName: 'Bead Shop', scenario: 'established' });

        expect(user.shopId).not.toBeNull();
        const shop = store.shops.get(user.shopId as number);
        expect(shop?.shopName).toBe('Bead Shop');
        expect(shop?.shippingProfiles).toHaveLength(1);
        const states = [...store.listings.values()].map((l) => l.state);
        expect(states).toEqual(expect.arrayContaining(['active', 'sold_out', 'draft', 'inactive']));
        expect([...store.receipts.values()].length).toBeGreaterThan(0);
    });

    it('creates a user without a shop for the no-shop scenario', () => {
        const store = new MockStore();
        const user = store.createUser({ scenario: 'no-shop' });
        expect(user.shopId).toBeNull();
        expect(store.shops.size).toBe(0);
    });

    it('gives every new user a separate shop', () => {
        const store = new MockStore();
        const a = store.createUser({ scenario: 'empty' });
        const b = store.createUser({ scenario: 'empty' });
        expect(a.shopId).not.toBe(b.shopId);
    });

    it('gives the two-shipping-profiles scenario two profiles', () => {
        const store = new MockStore();
        const user = store.createUser({ scenario: 'two-shipping-profiles' });
        expect(store.shops.get(user.shopId as number)?.shippingProfiles).toHaveLength(2);
    });

    it('derives listing quantity and price from enabled offerings', () => {
        const store = new MockStore();
        const user = store.createUser({ scenario: 'empty' });
        const listing = store.addListing(user.shopId as number, {
            title: 'Ruby Ring',
            state: 'active',
            price: 30,
            variations: [
                { propertyName: 'Size', value: 'M', quantity: 2 },
                { propertyName: 'Size', value: 'L', quantity: 3 },
            ],
        });
        expect(store.listingQuantity(listing)).toBe(5);
        expect(store.listingPriceAmount(listing)).toBe(3000);
    });

    it('reset clears everything', () => {
        const store = new MockStore();
        store.createUser({ scenario: 'established' });
        store.reset();
        expect(store.users.size).toBe(0);
        expect(store.listings.size).toBe(0);
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun --filter @jewellery-catalogue/etsy-mock test`
Expected: FAIL, cannot resolve `./store`.

- [ ] **Step 4: Implement `fixtures.ts`**

```ts
import type { MockStore } from './store';

export type Scenario = 'established' | 'empty' | 'no-shop' | 'two-shipping-profiles';
export const SCENARIOS: Scenario[] = ['established', 'empty', 'no-shop', 'two-shipping-profiles'];

export interface TaxonomyNode {
    id: number;
    name: string;
    children: TaxonomyNode[];
}

// Illustrative ids, not Etsy's real taxonomy ids.
export const TAXONOMY: TaxonomyNode[] = [
    {
        id: 1200,
        name: 'Jewelry',
        children: [
            {
                id: 1210,
                name: 'Earrings',
                children: [
                    { id: 1211, name: 'Stud Earrings', children: [] },
                    { id: 1212, name: 'Dangle & Drop Earrings', children: [] },
                ],
            },
            { id: 1220, name: 'Necklaces', children: [{ id: 1221, name: 'Pendants', children: [] }] },
            { id: 1230, name: 'Bracelets', children: [{ id: 1231, name: 'Beaded Bracelets', children: [] }] },
            { id: 1240, name: 'Rings', children: [] },
        ],
    },
];

export const taxonomyIds = (nodes: TaxonomyNode[] = TAXONOMY): number[] =>
    nodes.flatMap((n) => [n.id, ...taxonomyIds(n.children)]);

export const seedShop = (store: MockStore, shopId: number, scenario: Scenario): void => {
    const shop = store.shops.get(shopId);
    if (!shop) return;

    shop.shippingProfiles.push({ shippingProfileId: store.id(), title: 'UK Royal Mail' });
    if (scenario === 'two-shipping-profiles') {
        shop.shippingProfiles.push({ shippingProfileId: store.id(), title: 'International' });
    }
    shop.readinessStates.push(
        { readinessStateId: store.id(), readinessState: 'ready_to_ship' },
        { readinessStateId: store.id(), readinessState: 'made_to_order' }
    );

    if (scenario !== 'established') return;

    const moon = store.addListing(shopId, {
        title: 'Silver Moon Pendant Necklace',
        description: 'Hand-wrapped sterling silver crescent on a fine chain.',
        tags: ['moon necklace', 'silver pendant'],
        state: 'active',
        price: 32,
        quantity: 4,
        taxonomyId: 1221,
    });
    store.addListing(shopId, {
        title: 'Amethyst Drop Earrings',
        state: 'active',
        price: 24,
        quantity: 3,
        taxonomyId: 1212,
    });
    store.addListing(shopId, {
        title: 'Birthstone Stacking Ring',
        state: 'active',
        price: 18,
        taxonomyId: 1240,
        variations: [
            { propertyName: 'Stone', value: 'Ruby', quantity: 2 },
            { propertyName: 'Stone', value: 'Sapphire', quantity: 1 },
        ],
    });
    store.addListing(shopId, {
        title: 'Rose Quartz Bead Bracelet',
        state: 'active',
        price: 15,
        quantity: 6,
        taxonomyId: 1231,
    });
    store.addListing(shopId, { title: 'Pearl Studs', state: 'sold_out', price: 20, quantity: 0, taxonomyId: 1211 });
    store.addListing(shopId, { title: 'Unfinished Draft Anklet', state: 'draft', price: 12, taxonomyId: 1200 });
    store.addListing(shopId, { title: 'Retired Gold Hoops', state: 'inactive', price: 40, taxonomyId: 1212 });

    store.createOrder(shopId, { listingId: moon.listingId, quantity: 1 });
}
```

- [ ] **Step 5: Implement `store.ts`**

```ts
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
                          pv.propertyName === input.variation?.propertyName &&
                          pv.values.includes(input.variation.value)
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
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun --filter @jewellery-catalogue/etsy-mock test`
Expected: PASS (6 tests).

- [ ] **Step 7: Lint and commit**

```bash
bun lint
git add packages/etsy-mock bun.lock
git commit -m "feat(etsy-mock): add in-memory Etsy store with seed scenarios"
```

---

### Task 2: OAuth consent page, token endpoint and auth middleware

**Files:**
- Create: `packages/etsy-mock/src/auth.ts`, `packages/etsy-mock/src/routes/oauth.ts`, `packages/etsy-mock/src/app.ts`, `packages/etsy-mock/src/index.ts`
- Modify: `packages/etsy-mock/src/store.ts` (add OAuth methods)
- Test: `packages/etsy-mock/src/routes/oauth.test.ts`

**Interfaces:**
- Consumes: `MockStore` and `SCENARIOS` from Task 1.
- Produces:
  - `createEtsyMockApp({ store, publicUrl }): Hono`;
  - `MockEnv = { Variables: { etsyUserId: number } }`;
  - `requireApiKey(): MiddlewareHandler` and `requireToken(store, scope?): MiddlewareHandler`, the latter setting `etsyUserId`;
  - store methods `issueCode(pending: PendingCode): string`, `exchangeCode({ code, codeVerifier, redirectUri }): MockToken | string` (a string is an error message) and `refresh(refreshToken): MockToken | undefined`.

- [ ] **Step 1: Write the failing test**

`packages/etsy-mock/src/routes/oauth.test.ts`:
```ts
import { createHash, randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'bun:test';
import { createEtsyMockApp } from '../app';
import { MockStore } from '../store';

const b64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
const REDIRECT = 'http://localhost:3001/api/etsy/oauth/callback';
const API_KEY = { 'x-api-key': 'key:secret' };

let store: MockStore;
let app: ReturnType<typeof createEtsyMockApp>;

beforeEach(() => {
    store = new MockStore();
    app = createEtsyMockApp({ store, publicUrl: 'http://mock' });
});

const authorizeQuery = (challenge: string, scope = 'listings_r listings_w shops_r transactions_r email_r') =>
    new URLSearchParams({
        response_type: 'code',
        client_id: 'key',
        redirect_uri: REDIRECT,
        scope,
        state: 'st4te',
        code_challenge: challenge,
        code_challenge_method: 'S256',
    });

async function approveNewShop(shopName: string, scope?: string) {
    const verifier = b64url(randomBytes(32));
    const challenge = b64url(createHash('sha256').update(verifier).digest());
    const form = new URLSearchParams(authorizeQuery(challenge, scope));
    form.set('decision', 'allow');
    form.set('account', 'new');
    form.set('shop_name', shopName);
    form.set('scenario', 'established');
    const res = await app.request('/oauth/connect', { method: 'POST', body: form });
    const location = new URL(res.headers.get('location') as string);
    return { res, location, verifier };
}

async function exchange(code: string, verifier: string) {
    return app.request('/v3/public/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: 'key',
            redirect_uri: REDIRECT,
            code,
            code_verifier: verifier,
        }).toString(),
    });
}

describe('GET /oauth/connect', () => {
    it('renders a consent page listing existing shops', async () => {
        store.createUser({ shopName: 'Existing Shop', scenario: 'empty' });
        const res = await app.request(`/oauth/connect?${authorizeQuery('abc')}`);
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Existing Shop');
        expect(html).toContain('Allow access');
    });

    it('rejects a request without PKCE', async () => {
        const q = authorizeQuery('abc');
        q.delete('code_challenge');
        const res = await app.request(`/oauth/connect?${q}`);
        expect(res.status).toBe(400);
    });
});

describe('POST /oauth/connect', () => {
    it('redirects back with code and state, creating a new shop', async () => {
        const { res, location } = await approveNewShop('Bead Shop');
        expect(res.status).toBe(302);
        expect(location.origin + location.pathname).toBe(REDIRECT);
        expect(location.searchParams.get('state')).toBe('st4te');
        expect(location.searchParams.get('code')).toBeTruthy();
        expect([...store.shops.values()].map((s) => s.shopName)).toContain('Bead Shop');
    });

    it('creates a separate shop on each new-shop approval', async () => {
        await approveNewShop('A');
        await approveNewShop('B');
        expect(store.shops.size).toBe(2);
    });

    it('redirects with access_denied when denied', async () => {
        const form = new URLSearchParams(authorizeQuery('abc'));
        form.set('decision', 'deny');
        const res = await app.request('/oauth/connect', { method: 'POST', body: form });
        const location = new URL(res.headers.get('location') as string);
        expect(location.searchParams.get('error')).toBe('access_denied');
        expect(location.searchParams.get('state')).toBe('st4te');
    });
});

describe('POST /v3/public/oauth/token', () => {
    it('exchanges a code for tokens when the PKCE verifier matches', async () => {
        const { location, verifier } = await approveNewShop('Bead Shop');
        const res = await exchange(location.searchParams.get('code') as string, verifier);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.token_type).toBe('Bearer');
        expect(body.expires_in).toBe(3600);
        expect(body.access_token).toMatch(/^\d+\./);
        expect(body.refresh_token).toBeTruthy();
    });

    it('rejects a wrong verifier and a reused code', async () => {
        const { location, verifier } = await approveNewShop('Bead Shop');
        const code = location.searchParams.get('code') as string;
        expect((await exchange(code, 'wrong')).status).toBe(400);
        expect((await exchange(code, verifier)).status).toBe(400);
    });

    it('rotates both tokens on refresh and invalidates the old access token', async () => {
        const { location, verifier } = await approveNewShop('Bead Shop');
        const first = await (await exchange(location.searchParams.get('code') as string, verifier)).json();
        const res = await app.request('/v3/public/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: 'key',
                refresh_token: first.refresh_token,
            }).toString(),
        });
        const second = await res.json();
        expect(second.access_token).not.toBe(first.access_token);
        expect(second.refresh_token).not.toBe(first.refresh_token);

        const old = await app.request('/v3/application/users/me', {
            headers: { ...API_KEY, Authorization: `Bearer ${first.access_token}` },
        });
        expect(old.status).toBe(401);
    });
});
```

Note: the last test hits `/v3/application/users/me`, which Task 3 builds. In this task, register a temporary stub `GET /v3/application/users/me` behind `requireApiKey()` and `requireToken(store)` that returns `{ user_id }`. Task 3 replaces it.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --filter @jewellery-catalogue/etsy-mock test oauth`
Expected: FAIL, cannot resolve `../app`.

- [ ] **Step 3: Add OAuth methods to `MockStore`**

Append to the class in `store.ts` and import `createHash` and `randomBytes` from `node:crypto` at the top:
```ts
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
```

- [ ] **Step 4: Implement `auth.ts`**

```ts
import type { MiddlewareHandler } from 'hono';
import type { MockStore } from './store';

export type MockEnv = { Variables: { etsyUserId: number } };

export const requireApiKey = (): MiddlewareHandler => async (c, next) => {
    if (!/^[^:]+:[^:]+$/.test(c.req.header('x-api-key') ?? '')) {
        return c.json({ error: 'Invalid API key: expected keystring:shared_secret' }, 403);
    }
    await next();
};

export const requireToken =
    (store: MockStore, scope?: string): MiddlewareHandler<MockEnv> =>
    async (c, next) => {
        const raw = (c.req.header('authorization') ?? '').replace(/^Bearer /, '');
        const token = store.tokens.get(raw);
        if (!token || token.expiresAt <= store.now()) return c.json({ error: 'invalid_token' }, 401);
        if (scope && !token.scopes.includes(scope)) return c.json({ error: `Missing scope: ${scope}` }, 403);
        c.set('etsyUserId', token.userId);
        await next();
    };
```

- [ ] **Step 5: Implement `routes/oauth.ts`**

```ts
import { Hono } from 'hono';
import { html } from 'hono/html';
import { SCENARIOS, type Scenario } from '../fixtures';
import type { MockStore } from '../store';

const AUTH_PARAMS = [
    'response_type',
    'client_id',
    'redirect_uri',
    'scope',
    'state',
    'code_challenge',
    'code_challenge_method',
] as const;

const missingParam = (params: Record<string, string | undefined>) => {
    const missing = AUTH_PARAMS.find((p) => !params[p]);
    if (missing) return `Missing ${missing}`;
    if (params.response_type !== 'code') return 'response_type must be code';
    if (params.code_challenge_method !== 'S256') return 'code_challenge_method must be S256';
    return undefined;
};

export const oauthRoutes = (store: MockStore) => {
    const app = new Hono();

    app.get('/oauth/connect', (c) => {
        const params = c.req.query();
        const error = missingParam(params);
        if (error) return c.html(html`<h1>Bad authorisation request</h1><p>${error}</p>`, 400);

        const accounts = [...store.users.values()].map((u) => ({
            userId: u.userId,
            label: u.shopId ? (store.shops.get(u.shopId)?.shopName ?? `Shop ${u.shopId}`) : `User ${u.userId} (no shop)`,
        }));

        return c.html(html`<!doctype html>
            <html>
                <head><title>Mock Etsy – grant access</title></head>
                <body style="font-family: sans-serif; max-width: 32rem; margin: 2rem auto">
                    <h1>Mock Etsy</h1>
                    <p>An app is asking for: <code>${params.scope}</code></p>
                    <form method="post" action="/oauth/connect">
                        ${AUTH_PARAMS.map((p) => html`<input type="hidden" name="${p}" value="${params[p]}" />`)}
                        <fieldset>
                            <legend>Sign in as</legend>
                            ${accounts.map(
                                (a) =>
                                    html`<label><input type="radio" name="account" value="${a.userId}" /> ${a.label}</label><br />`
                            )}
                            <label><input type="radio" name="account" value="new" checked /> New shop</label>
                            <br />
                            <label>Shop name <input name="shop_name" /></label>
                            <label>
                                Scenario
                                <select name="scenario">
                                    ${SCENARIOS.map((s) => html`<option value="${s}">${s}</option>`)}
                                </select>
                            </label>
                        </fieldset>
                        <button name="decision" value="allow">Allow access</button>
                        <button name="decision" value="deny">Deny</button>
                    </form>
                </body>
            </html>`);
    });

    app.post('/oauth/connect', async (c) => {
        const form = Object.fromEntries(
            [...(await c.req.formData()).entries()].map(([k, v]) => [k, String(v)])
        ) as Record<string, string>;
        const error = missingParam(form);
        if (error) return c.html(html`<h1>Bad authorisation request</h1><p>${error}</p>`, 400);

        const redirect = new URL(form.redirect_uri);
        redirect.searchParams.set('state', form.state);
        if (form.decision !== 'allow') {
            redirect.searchParams.set('error', 'access_denied');
            return c.redirect(redirect.toString(), 302);
        }

        const userId =
            form.account === 'new' || !form.account
                ? store.createUser({ shopName: form.shop_name, scenario: (form.scenario as Scenario) ?? 'established' })
                      .userId
                : Number(form.account);

        redirect.searchParams.set(
            'code',
            store.issueCode({
                userId,
                codeChallenge: form.code_challenge,
                redirectUri: form.redirect_uri,
                scopes: form.scope.split(' '),
            })
        );
        return c.redirect(redirect.toString(), 302);
    });

    app.post('/v3/public/oauth/token', async (c) => {
        const body = Object.fromEntries(new URLSearchParams(await c.req.text()));
        const result =
            body.grant_type === 'authorization_code'
                ? store.exchangeCode({ code: body.code, codeVerifier: body.code_verifier, redirectUri: body.redirect_uri })
                : body.grant_type === 'refresh_token'
                  ? (store.refresh(body.refresh_token) ?? 'invalid_grant: unknown refresh token')
                  : 'unsupported_grant_type';
        if (typeof result === 'string') return c.json({ error: result }, 400);
        return c.json({
            access_token: result.accessToken,
            token_type: 'Bearer',
            expires_in: store.tokenTtlSeconds,
            refresh_token: result.refreshToken,
        });
    });

    return app;
};
```

- [ ] **Step 6: Implement `app.ts` and `index.ts`**

`app.ts`:
```ts
import { Hono } from 'hono';
import { type MockEnv, requireApiKey, requireToken } from './auth';
import { oauthRoutes } from './routes/oauth';
import type { MockStore } from './store';

export interface MockOptions {
    store: MockStore;
    publicUrl: string;
}

export const createEtsyMockApp = ({ store }: MockOptions) => {
    const app = new Hono<MockEnv>();
    app.get('/health', (c) => c.json({ status: 'ok' }));
    app.route('/', oauthRoutes(store));
    // Temporary until Task 3 adds the application routes.
    app.get('/v3/application/users/me', requireApiKey(), requireToken(store), (c) =>
        c.json({ user_id: c.get('etsyUserId') })
    );
    return app;
};
```

`index.ts`:
```ts
import { createEtsyMockApp } from './app';
import { MockStore } from './store';

const port = Number(process.env.PORT ?? 3010);
const publicUrl = process.env.ETSY_MOCK_PUBLIC_URL ?? `http://localhost:${port}`;
const store = new MockStore(Number(process.env.ETSY_MOCK_TOKEN_TTL ?? 3600));

Bun.serve({ port, fetch: createEtsyMockApp({ store, publicUrl }).fetch });
console.log(`Etsy mock running on ${publicUrl}`);
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `bun --filter @jewellery-catalogue/etsy-mock test`
Expected: PASS (Task 1 and Task 2 tests).

- [ ] **Step 8: Commit**

```bash
bun lint
git add packages/etsy-mock
git commit -m "feat(etsy-mock): add OAuth consent page and token endpoint with PKCE"
```

---

### Task 3: Read endpoints

**Files:**
- Create: `packages/etsy-mock/src/serialize.ts`, `packages/etsy-mock/src/routes/application.ts`
- Modify: `packages/etsy-mock/src/app.ts` (replace the `users/me` stub, mount `/v3/application`)
- Test: `packages/etsy-mock/src/routes/application.test.ts`, plus `packages/etsy-mock/src/test-helpers.ts` (shared token setup)

**Interfaces:**
- Consumes: `MockStore`, `requireApiKey`, `requireToken`, `MockEnv`.
- Produces:
  - `applicationRoutes(store, publicUrl): Hono<MockEnv>`;
  - `listingJson(store, listing, publicUrl, withImages)`, `imageJson(image, publicUrl)` and `money(amount)`;
  - in `test-helpers.ts`, `connectedUser(store, scenario?, scopes?)`, which returns `{ user, headers }` where `headers` holds a valid `x-api-key` and `Authorization`.

Endpoints and the auth each needs (this matches `EtsyClient` exactly):

| Method + path | Auth | Response |
|---|---|---|
| GET `/users/me` | key + token | `{ user_id, shop_id }` (`shop_id: null` for no-shop) |
| GET `/shops/:shopId` | key | `{ shop_id, shop_name, listing_active_count, transaction_sold_count }`, 404 if unknown |
| GET `/shops/:shopId/listings?state&limit&offset&includes=Images` | key + token (own shop) | `{ count, results }`, filtered by state, ordered by `listing_id` |
| GET `/listings/:id[?includes=Images]` | key (token optional) | listing JSON |
| GET `/listings/:id/inventory` | key + token | `{ products: [{ product_id, property_values, offerings: [{ offering_id, price, quantity, is_enabled }] }] }` |
| GET `/listings/:id/images` | key + token | `{ count, results: [image] }` |
| GET `/shops/:shopId/shipping-profiles` | key + token (own shop) | `{ count, results: [{ shipping_profile_id, title }] }` |
| GET `/shops/:shopId/readiness-state-definitions` | key + token (own shop) | `{ count, results: [{ readiness_state_id, readiness_state }] }` |
| GET `/shops/:shopId/receipts?min_last_modified&limit&offset` | key + token with `transactions_r` (own shop) | `{ count, results }`, filtered `updated_timestamp >= min_last_modified`, sorted by updated ascending |
| GET `/seller-taxonomy/nodes` | key | `{ count, results: TAXONOMY }` |

"Own shop" means the token's user owns `:shopId`; otherwise return 403 `{ error: 'Not your shop' }`.

- [ ] **Step 1: Write the test helper and failing tests**

`packages/etsy-mock/src/test-helpers.ts`:
```ts
import type { Scenario } from './fixtures';
import { MockStore } from './store';

export const DEFAULT_SCOPES = ['listings_r', 'listings_w', 'shops_r', 'transactions_r', 'email_r'];

export function connectedUser(store: MockStore, scenario: Scenario = 'established', scopes = DEFAULT_SCOPES) {
    const user = store.createUser({ shopName: 'Test Shop', scenario });
    const token = store.issueToken(user.userId, scopes);
    return {
        user,
        headers: { 'x-api-key': 'key:secret', Authorization: `Bearer ${token.accessToken}` },
    };
}

export { MockStore };
```

`packages/etsy-mock/src/routes/application.test.ts`:
```ts
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
        const page1 = await (await get(`/shops/${user.shopId}/listings?state=active&limit=100&offset=0`, headers)).json();
        const page2 = await (await get(`/shops/${user.shopId}/listings?state=active&limit=100&offset=100`, headers)).json();
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
        expect(body.results[0].transactions[0]).toMatchObject({ title: 'Silver Moon Pendant Necklace', quantity: 1 });
        const future = store.now() + 10;
        const none = await (await get(`/shops/${user.shopId}/receipts?min_last_modified=${future}`, headers)).json();
        expect(none.results).toEqual([]);
    });

    it('returns 403 without the transactions_r scope', async () => {
        const { user, headers } = connectedUser(store, 'established', ['listings_r', 'shops_r']);
        expect((await get(`/shops/${user.shopId}/receipts?min_last_modified=0`, headers)).status).toBe(403);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --filter @jewellery-catalogue/etsy-mock test application`
Expected: FAIL. Most routes return 404.

- [ ] **Step 3: Implement `serialize.ts`**

```ts
import type { MockImage, MockListing, MockReceipt, MockStore } from './store';

export const money = (amount: number) => ({ amount, divisor: 100, currency_code: 'GBP' });

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
    ...(withImages ? { images: [...l.images].sort((a, b) => a.rank - b.rank).map((i) => imageJson(i, publicUrl)) } : {}),
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
```

- [ ] **Step 4: Implement the read half of `routes/application.ts`**

```ts
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
```

In `app.ts`, remove the temporary `users/me` stub and its `requireApiKey` and `requireToken` imports. Mount the routes:
```ts
    app.route('/v3/application', applicationRoutes(store, publicUrl));
```
and change the signature to `({ store, publicUrl }: MockOptions)`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun --filter @jewellery-catalogue/etsy-mock test`
Expected: PASS (all tasks so far, including the oauth refresh test that now hits the real `users/me`).

- [ ] **Step 6: Commit**

```bash
bun lint
git add packages/etsy-mock
git commit -m "feat(etsy-mock): serve Etsy read endpoints the client uses"
```

---

### Task 4: Write endpoints and image serving

**Files:**
- Modify: `packages/etsy-mock/src/routes/application.ts`, `packages/etsy-mock/src/app.ts`
- Test: `packages/etsy-mock/src/routes/application-write.test.ts`

**Interfaces:**
- Consumes: everything from Task 3, plus `store.applyStockState` and `taxonomyIds()`.
- Produces: `POST /shops/:shopId/listings`, `PATCH /shops/:shopId/listings/:listingId`, `POST /shops/:shopId/listings/:listingId/images`, `PUT /listings/:listingId/inventory`, `GET /images/:imageId` (on the root app) and `GET /listing/:listingId` (a plain HTML stand-in for the public listing page).

Validation mirrors Etsy's rules that our push depends on. Errors are 400 `{ error }`.
- **create:** `title` 1–140 chars; `quantity` 1–999; `price > 0`; `who_made` is one of `i_did|someone_else|collective`; `when_made` is present; `taxonomy_id` is in `taxonomyIds()`; `shipping_profile_id` and `readiness_state_id` belong to the shop; at most 13 `tags`, each at most 20 chars. New listings are `draft`.
- **PATCH:** the same title and tag rules, for whichever fields are present.
- **inventory PUT:** `products` is non-empty; each product has exactly one offering; at most two distinct `property_name`s across products; `price > 0`. Then call `applyStockState`.
- **image upload:** needs a multipart `image` file; `rank` defaults to the next free rank; at most 10 images per listing.

- [ ] **Step 1: Write the failing tests**

`packages/etsy-mock/src/routes/application-write.test.ts`:
```ts
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
        const res = await send('POST', `/shops/${user.shopId}/listings`, headers, draftBody(store, user.shopId as number));
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
        const res = await send('POST', `/shops/${user.shopId}/listings`, headers, draftBody(store, user.shopId as number));
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --filter @jewellery-catalogue/etsy-mock test application-write`
Expected: FAIL with 404s.

- [ ] **Step 3: Implement the write routes**

Add to `applicationRoutes` before `return app;`. Import `taxonomyIds` from `../fixtures` and `MockProduct` from `../store`.
```ts
    const WHO_MADE = ['i_did', 'someone_else', 'collective'];
    const copyError = (body: { title?: unknown; tags?: unknown }): string | undefined => {
        if (body.title !== undefined && (typeof body.title !== 'string' || !body.title || body.title.length > 140)) {
            return 'title must be 1-140 characters';
        }
        if (body.tags !== undefined) {
            if (!Array.isArray(body.tags) || body.tags.length > 13) return 'at most 13 tags';
            if (body.tags.some((t) => typeof t !== 'string' || t.length > 20)) return 'tags must be at most 20 characters';
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
        const b = await c.req.json();
        const error =
            (!b.title && 'title is required') ||
            copyError(b) ||
            (!(Number.isInteger(b.quantity) && b.quantity >= 1 && b.quantity <= 999) && 'quantity must be 1-999') ||
            (!(b.price > 0) && 'price must be greater than 0') ||
            (!WHO_MADE.includes(b.who_made) && 'invalid who_made') ||
            (!b.when_made && 'when_made is required') ||
            (!taxonomyIds().includes(b.taxonomy_id) && `unknown taxonomy_id ${b.taxonomy_id}`) ||
            (!shop?.shippingProfiles.some((p) => p.shippingProfileId === b.shipping_profile_id) &&
                'shipping_profile_id does not belong to this shop') ||
            (!shop?.readinessStates.some((r) => r.readinessStateId === b.readiness_state_id) &&
                'readiness_state_id does not belong to this shop');
        if (error) return c.json({ error }, 400);

        const listing = store.addListing(shopId, {
            title: b.title,
            description: b.description ?? '',
            tags: b.tags ?? [],
            state: 'draft',
            price: b.price,
            quantity: b.quantity,
            taxonomyId: b.taxonomy_id,
        });
        return c.json(listingJson(store, listing, publicUrl, false), 201);
    });

    app.patch('/shops/:shopId/listings/:listingId', requireToken(store, 'listings_w'), async (c) => {
        const shopId = ownShop(c);
        if (shopId instanceof Response) return shopId;
        const listing = ownListing(c, shopId);
        if (!listing) return notFound(c);
        const b = await c.req.json();
        const error = copyError(b);
        if (error) return c.json({ error }, 400);
        if (b.title !== undefined) listing.title = b.title;
        if (b.description !== undefined) listing.description = b.description;
        if (b.tags !== undefined) listing.tags = b.tags;
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
```

In `app.ts`, add the public image and listing pages (import `html` from `hono/html`):
```ts
    app.get('/images/:imageId', (c) => {
        const id = Number(c.req.param('imageId'));
        const image = [...store.listings.values()].flatMap((l) => l.images).find((i) => i.imageId === id);
        if (!image) return c.notFound();
        return c.body(image.bytes, 200, { 'Content-Type': image.contentType });
    });
    app.get('/listing/:listingId', (c) => {
        const listing = store.listings.get(Number(c.req.param('listingId')));
        if (!listing) return c.notFound();
        return c.html(html`<h1>${listing.title}</h1><p>Mock Etsy listing ${listing.listingId} (${listing.state})</p>`);
    });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun --filter @jewellery-catalogue/etsy-mock test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
bun lint
git add packages/etsy-mock
git commit -m "feat(etsy-mock): accept draft listings, copy, inventory and image uploads"
```

---

### Task 5: Control API and fault injection

**Files:**
- Create: `packages/etsy-mock/src/routes/control.ts`
- Modify: `packages/etsy-mock/src/app.ts`
- Test: `packages/etsy-mock/src/routes/control.test.ts`

**Interfaces:**
- Consumes: `MockStore` (including `createOrder` and `applyStockState`), `listingJson`, `receiptJson`.
- Produces `controlRoutes(store, publicUrl)`, mounted at `/__mock`, and `faultInjection(store): MiddlewareHandler`, mounted on `/v3/*`. Every endpoint takes and returns JSON:

| Method + path | Body | Effect |
|---|---|---|
| GET `/state` | — | `{ users, shops: [{ ...shop, listings: [listingJson], receipts: [receiptJson] }], faults }` |
| GET `/shops?name=` | — | shops whose `shopName` equals `name` (all if omitted), each `{ shopId, shopName, userId }` |
| POST `/reset` | — | `store.reset()` |
| POST `/shops` | `{ shopName?, scenario? }` | creates a user and shop; returns `{ userId, shopId }` |
| POST `/shops/:shopId/listings` | `AddListingInput` | seeds a listing in any state; returns `listingJson` |
| POST `/listings/:id/state` | `{ state }` | simulates a seller action on Etsy (publish, deactivate, expire) |
| POST `/shops/:shopId/orders` | `{ listingId, quantity, variation? }` | `store.createOrder`; returns `receiptJson`; 400 with the error message on failure |
| POST `/receipts/:id/status` | `{ status }` | sets the status (for example `canceled`) and bumps `updatedAt` |
| POST `/tokens/expire` | — | sets `expiresAt = 0` on every token (forces the app to refresh) |
| POST `/tokens/revoke-scope` | `{ scope }` | removes the scope from every token |
| POST `/faults` | `{ method?, path, status, body?, times? }` | the next `times` (default 1) `/v3/*` requests whose path contains `path` (and match `method`, if given) return `status` with `body` (default `{"error":"Injected fault"}`) |
| DELETE `/faults` | — | clears faults |

- [ ] **Step 1: Write the failing tests**

`packages/etsy-mock/src/routes/control.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --filter @jewellery-catalogue/etsy-mock test control`
Expected: FAIL with 404s.

- [ ] **Step 3: Implement `routes/control.ts`**

```ts
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
        const b = (await c.req.json()) as { method?: string; path: string; status: number; body?: unknown; times?: number };
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
```

In `app.ts`, register `faultInjection` **before** the OAuth and application routes so it also covers the token endpoint:
```ts
    app.use('/v3/*', faultInjection(store));
    // ...existing app.route calls...
    app.route('/__mock', controlRoutes(store, publicUrl));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun --filter @jewellery-catalogue/etsy-mock test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
bun lint
git add packages/etsy-mock
git commit -m "feat(etsy-mock): add control API for seeding, seller actions, sales and faults"
```

---

### Task 6: Dashboard for manual testing

**Files:**
- Create: `packages/etsy-mock/src/routes/dashboard.ts`
- Modify: `packages/etsy-mock/src/app.ts`
- Test: `packages/etsy-mock/src/routes/dashboard.test.ts`

**Interfaces:**
- Consumes: the `/__mock/*` endpoints from Task 5, called from the page with `fetch`.
- Produces: `GET /`, an HTML page.

The page is server-rendered with `hono/html`. It lists each shop with its listings (title, state, quantity, price) and receipts. Each listing has buttons:
- **Publish** (sets state `active`);
- **Deactivate** (`inactive`);
- **Expire** (`expired`);
- **Sell 1** (POSTs an order with quantity 1; disabled unless the listing is active).

Page-level buttons are **New shop** (with a scenario select), **Expire tokens**, **Fail next push** (a fault on `POST` and path `/listings` with status 500) and **Reset everything**. A small inline `<script>` posts JSON to the control API and reloads the page, showing an `alert` if the response isn't ok.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { createEtsyMockApp } from '../app';
import { MockStore } from '../store';

describe('dashboard', () => {
    it('lists shops, listings and the seller actions', async () => {
        const store = new MockStore();
        store.createUser({ shopName: 'Bead Shop', scenario: 'established' });
        const res = await createEtsyMockApp({ store, publicUrl: 'http://mock' }).request('/');
        const page = await res.text();
        expect(res.status).toBe(200);
        expect(page).toContain('Bead Shop');
        expect(page).toContain('Silver Moon Pendant Necklace');
        expect(page).toContain('Sell 1');
        expect(page).toContain('Reset everything');
    });

    it('escapes listing titles', async () => {
        const store = new MockStore();
        const user = store.createUser({ scenario: 'empty' });
        store.addListing(user.shopId as number, { title: '<script>x</script>', state: 'active', price: 1 });
        const page = await (await createEtsyMockApp({ store, publicUrl: 'http://mock' }).request('/')).text();
        expect(page).not.toContain('<script>x</script>');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --filter @jewellery-catalogue/etsy-mock test dashboard`
Expected: FAIL (404).

- [ ] **Step 3: Implement `routes/dashboard.ts`**

```ts
import { Hono } from 'hono';
import { html, raw } from 'hono/html';
import { SCENARIOS } from '../fixtures';
import type { MockStore } from '../store';

const SCRIPT = `
async function call(method, path, body) {
    const res = await fetch('/__mock' + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) alert((await res.json()).error ?? res.status);
    location.reload();
}`;

export const dashboardRoutes = (store: MockStore) => {
    const app = new Hono();

    app.get('/', (c) => {
        const shops = [...store.shops.values()];
        return c.html(html`<!doctype html>
            <html>
                <head>
                    <title>Etsy mock</title>
                    <style>
                        body { font-family: sans-serif; margin: 1rem; }
                        table { border-collapse: collapse; margin-bottom: 1rem; }
                        td, th { border: 1px solid #ccc; padding: 0.25rem 0.5rem; text-align: left; }
                    </style>
                    <script>${raw(SCRIPT)}</script>
                </head>
                <body>
                    <h1>Etsy mock</h1>
                    <p>
                        <select id="scenario">${SCENARIOS.map((s) => html`<option>${s}</option>`)}</select>
                        <button onclick="call('POST', '/shops', { scenario: document.getElementById('scenario').value })">
                            New shop
                        </button>
                        <button onclick="call('POST', '/tokens/expire')">Expire tokens</button>
                        <button onclick="call('POST', '/faults', { method: 'POST', path: '/listings', status: 500 })">
                            Fail next push
                        </button>
                        <button onclick="if (confirm('Reset all mock data?')) call('POST', '/reset')">
                            Reset everything
                        </button>
                    </p>
                    ${shops.map((shop) => {
                        const listings = [...store.listings.values()].filter((l) => l.shopId === shop.shopId);
                        const receipts = [...store.receipts.values()].filter((r) => r.shopId === shop.shopId);
                        return html`<h2>${shop.shopName} <small>(shop ${shop.shopId})</small></h2>
                            <table>
                                <tr><th>Listing</th><th>Title</th><th>State</th><th>Qty</th><th>Price</th><th></th></tr>
                                ${listings.map(
                                    (l) => html`<tr>
                                        <td>${l.listingId}</td>
                                        <td>${l.title}</td>
                                        <td>${l.state}</td>
                                        <td>${store.listingQuantity(l)}</td>
                                        <td>£${(store.listingPriceAmount(l) / 100).toFixed(2)}</td>
                                        <td>
                                            <button onclick="call('POST', '/listings/${l.listingId}/state', { state: 'active' })">Publish</button>
                                            <button onclick="call('POST', '/listings/${l.listingId}/state', { state: 'inactive' })">Deactivate</button>
                                            <button onclick="call('POST', '/listings/${l.listingId}/state', { state: 'expired' })">Expire</button>
                                            <button ${l.state === 'active' ? '' : 'disabled'}
                                                onclick="call('POST', '/shops/${shop.shopId}/orders', { listingId: ${l.listingId}, quantity: 1 })">
                                                Sell 1
                                            </button>
                                        </td>
                                    </tr>`
                                )}
                            </table>
                            <p>${receipts.length} receipt(s), ${shop.transactionSoldCount} item(s) sold</p>`;
                    })}
                </body>
            </html>`);
    });

    return app;
};
```

`hono/html` escapes interpolated strings, so titles are safe. Only IDs (numbers) are interpolated into the `onclick` attributes. In `app.ts`, add `app.route('/', dashboardRoutes(store));`.

- [ ] **Step 4: Run tests, then check manually**

Run: `bun --filter @jewellery-catalogue/etsy-mock test`
Expected: PASS.

Manual check: run `bun packages/etsy-mock/src/index.ts`, `curl -X POST localhost:3010/__mock/shops -H 'content-type: application/json' -d '{"shopName":"Demo"}'`, then open http://localhost:3010/. Click **Sell 1** on an active listing and check its quantity drops.

- [ ] **Step 5: Commit**

```bash
bun lint
git add packages/etsy-mock
git commit -m "feat(etsy-mock): add HTML dashboard for manual seller actions"
```

---

### Task 7: Point the API at the mock with `ETSY_MOCK_URL`

**Files:**
- Modify: `packages/api/src/domain/EtsyClient/index.ts:11-13` and every `AUTHORIZE_URL`, `TOKEN_URL` and `API_BASE` use; `packages/api/src/config/index.ts`; `packages/api/src/dependencies/index.ts:281`; `packages/api/src/index.ts` (startup log)
- Test: `packages/api/src/domain/EtsyClient/urls.test.ts`

**Interfaces:**
- Produces: `export interface EtsyUrls { authorize: string; token: string; apiBase: string }`, `export const etsyUrls = (mockUrl?: string): EtsyUrls` and the constructor `new EtsyClient(apiKey, sharedSecret, urls = etsyUrls())`.

- [ ] **Step 1: Write the failing test**

`packages/api/src/domain/EtsyClient/urls.test.ts`:
```ts
import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { EtsyClient, etsyUrls } from '.';

afterEach(() => mock.restore());

describe('etsyUrls', () => {
    it('defaults to real Etsy', () => {
        expect(etsyUrls()).toEqual({
            authorize: 'https://www.etsy.com/oauth/connect',
            token: 'https://api.etsy.com/v3/public/oauth/token',
            apiBase: 'https://api.etsy.com/v3/application',
        });
    });

    it('points every URL at the mock when given one, ignoring a trailing slash', () => {
        expect(etsyUrls('http://localhost:3010/')).toEqual({
            authorize: 'http://localhost:3010/oauth/connect',
            token: 'http://localhost:3010/v3/public/oauth/token',
            apiBase: 'http://localhost:3010/v3/application',
        });
    });
});

describe('EtsyClient with mock URLs', () => {
    const client = new EtsyClient('key', 'secret', etsyUrls('http://localhost:3010'));

    it('builds the authorisation URL on the mock', () => {
        const url = new URL(
            client.buildAuthorizationUrl({ redirectUri: 'r', state: 's', codeChallenge: 'c', scope: 'x' })
        );
        expect(url.origin + url.pathname).toBe('http://localhost:3010/oauth/connect');
    });

    it('sends API and token calls to the mock', async () => {
        const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async () =>
            new Response(JSON.stringify({ user_id: 1, shop_id: 2, access_token: 'a', refresh_token: 'b', expires_in: 1 }))) as never);
        await client.getMe('token');
        await client.refreshAccessToken('refresh');
        expect(String(fetchSpy.mock.calls[0][0])).toBe('http://localhost:3010/v3/application/users/me');
        expect(String(fetchSpy.mock.calls[1][0])).toBe('http://localhost:3010/v3/public/oauth/token');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --filter @jewellery-catalogue/api test EtsyClient/urls`
Expected: FAIL, `etsyUrls` is not exported.

- [ ] **Step 3: Implement**

In `EtsyClient/index.ts`, replace the three constants with:
```ts
export interface EtsyUrls {
    authorize: string;
    token: string;
    apiBase: string;
}

export const etsyUrls = (mockUrl?: string): EtsyUrls => {
    if (!mockUrl) {
        return {
            authorize: 'https://www.etsy.com/oauth/connect',
            token: 'https://api.etsy.com/v3/public/oauth/token',
            apiBase: 'https://api.etsy.com/v3/application',
        };
    }
    const base = mockUrl.replace(/\/+$/, '');
    return {
        authorize: `${base}/oauth/connect`,
        token: `${base}/v3/public/oauth/token`,
        apiBase: `${base}/v3/application`,
    };
};
```
Then add a constructor parameter `private readonly urls: EtsyUrls = etsyUrls()`. Replace `new URL(AUTHORIZE_URL)` with `new URL(this.urls.authorize)`, `fetch(TOKEN_URL` with `fetch(this.urls.token`, and every `${API_BASE}` with `${this.urls.apiBase}`. Run `grep -n "API_BASE\|TOKEN_URL\|AUTHORIZE_URL" packages/api/src/domain/EtsyClient/index.ts` and expect no matches.

In `config/index.ts`, add to `schema`:
```ts
    etsyMockUrl: { parser: parsers.string, from: 'ETSY_MOCK_URL', optional: true },
```

In `dependencies/index.ts:281`:
```ts
                return new EtsyClient(
                    config.get('etsyApiKey'),
                    config.get('etsySharedSecret'),
                    etsyUrls(config.get('etsyMockUrl'))
                );
```
(import `etsyUrls` alongside `EtsyClient`).

In `packages/api/src/index.ts`, right before `Bun.serve(...)`:
```ts
        const etsyMockUrl = config.get('etsyMockUrl');
        if (etsyMockUrl) appLogger.warn(`ETSY_MOCK_URL is set: all Etsy calls go to ${etsyMockUrl}`);
```
(import `config` from `./config` if it isn't already imported).

- [ ] **Step 4: Run tests and type-check**

Run:
```bash
bun --filter @jewellery-catalogue/api test
bunx tsc -p packages/api --noEmit
bunx tsc -p packages/etsy-mock --noEmit
```
Expected: all pass. The existing `EtsyClient/index.test.ts` assertions on `https://api.etsy.com/...` still pass because the default URLs are unchanged.

- [ ] **Step 5: Commit**

```bash
bun lint
git add packages/api
git commit -m "feat(api): route Etsy calls to ETSY_MOCK_URL when set"
```

---

### Task 8: Dev scripts and docs

**Files:**
- Modify: `package.json` (root scripts), `.env.example`, `AGENTS.md`, `README.md`

- [ ] **Step 1: Root scripts**

Add to the root `package.json` `scripts`:
```json
    "start:etsy-mock": "bun run --filter @jewellery-catalogue/etsy-mock start",
    "start:with-etsy-mock": "concurrently \"bun run start:web\" \"bun run start:api\" \"bun run start:etsy-mock\""
```

- [ ] **Step 2: `.env.example`**

Add under the Etsy vars:
```
# Local only: send every Etsy call to the mock (bun start:etsy-mock). Never set in production.
ETSY_MOCK_URL=
```

- [ ] **Step 3: `AGENTS.md`**

- In **Stack**, change the monorepo line to list `packages/etsy-mock`, described as "(stateful fake of the Etsy v3 API for local dev and e2e)".
- In **Env**, append: "`ETSY_MOCK_URL` is optional and local-only: when set, `EtsyClient` talks to the mock (`bun start:etsy-mock`, port 3010) instead of Etsy. `ETSY_API_KEY`/`ETSY_SHARED_SECRET` can then be any non-empty values."
- Add an `## Etsy mock (packages/etsy-mock)` section:
  - Connecting through the app opens the mock's consent page. Pick an existing shop or create one from a scenario (`established`, `empty`, `no-shop`, `two-shipping-profiles`).
  - http://localhost:3010/ is a dashboard for seller actions (publish, sell, expire tokens, inject a failure).
  - `/__mock/*` is the JSON control API used by e2e (`tests/e2e/utils/etsy-mock.ts`).
  - State is in memory and is lost on restart.
  - The mock models only what `EtsyClient` calls. When `EtsyClient` gains a call, add it to the mock in the same PR.
  - Order sync runs on `ETSY_ORDER_SYNC_INTERVAL_MS`, so a sale from the dashboard shows up in the app on the next tick or after an API restart.
- In **Commands**, add `bun --filter @jewellery-catalogue/etsy-mock test`.

- [ ] **Step 4: `README.md`**

Add a short "Testing the Etsy integration without a shop" paragraph. It should say: run `bun start:with-etsy-mock` with `ETSY_MOCK_URL=http://localhost:3010` in `.env`, connect Etsy in Settings, and choose the `established` scenario.

- [ ] **Step 5: Manual smoke test of the full local flow**

Run Mongo and MinIO as you normally do for local dev. Set `ETSY_MOCK_URL=http://localhost:3010` in `.env` and run `bun start:with-etsy-mock`. Then, in the app:
1. Settings: **Connect Etsy**, create a new shop named "Demo" with the `established` scenario, and check the shop name is shown.
2. Listings page: four active listings and one sold-out listing appear with prices.
3. Map EARRINGS to taxonomy "Stud Earrings" in Settings. Create an earrings design with a photo, then **Send to Etsy**. On the dashboard, a draft listing with one image appears.
4. Dashboard: **Publish** that listing, then reload the design page and check it shows "Active on Etsy".
5. Dashboard: **Expire tokens**, then reload Listings. It still loads (the token refresh worked).
6. Start a second Connect and pick the `no-shop` scenario. Settings shows "Failed to connect to Etsy", the same as your prod account.

- [ ] **Step 6: Commit**

```bash
bun lint
git add package.json .env.example AGENTS.md README.md
git commit -m "docs: document running against the Etsy mock"
```

---

### Task 9: E2E round trip through the mock

**Files:**
- Create: `packages/web/tests/e2e/utils/etsy-mock.ts`, `packages/web/tests/e2e/etsy-mock.spec.ts`
- Modify: `packages/web/playwright.config.ts`, `packages/web/tests/e2e/mocks/auth.ts`

**Interfaces:**
- Consumes: the `/__mock/*` endpoints (Task 5), the consent page form (Task 2), the existing `apiCreateBead`, `apiCreateDesign` and `apiSetUserSettings` helpers, and the `authenticatedPage` fixture.
- Produces: `ETSY_MOCK_URL` (`process.env.E2E_ETSY_MOCK_URL ?? 'http://localhost:3010'`), `findMockShop(name)` returning `{ shopId, userId }`, `mockShopState(shopId)`, `setMockListingState(listingId, state)` and `MOCK_TOKEN_ETSY_MOCK`.

- [ ] **Step 1: Playwright config**

In `packages/web/playwright.config.ts`, add the mock as the **first** CI `webServer` entry:
```ts
              {
                  command: `bash -c "cd ${ROOT}/packages/etsy-mock && bun src/index.ts"`,
                  url: 'http://localhost:3010/health',
                  reuseExistingServer: false,
                  timeout: 30000,
                  env: { PORT: '3010' },
              },
```
and add `ETSY_MOCK_URL: 'http://localhost:3010'` to the API `webServer` env block. Specs that `page.route` `/api/etsy/*` are unaffected, because the browser never reaches the API for those routes.

- [ ] **Step 2: Mock token**

In `tests/e2e/mocks/auth.ts`, add a new token following the existing pattern. First `grep -n "makeMockToken('" tests/e2e/mocks/auth.ts` to find the highest id, then use the next unused one:
```ts
export const MOCK_TOKEN_ETSY_MOCK = makeMockToken('<next unused 24-hex id>'); // etsy-mock.spec
```

- [ ] **Step 3: Helpers**

`packages/web/tests/e2e/utils/etsy-mock.ts`:
```ts
export const ETSY_MOCK_URL = process.env.E2E_ETSY_MOCK_URL ?? 'http://localhost:3010';

async function control<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${ETSY_MOCK_URL}/__mock${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Etsy mock ${method} ${path} failed: ${await res.text()}`);
    return res.json() as Promise<T>;
}

export async function findMockShop(name: string): Promise<{ shopId: number; userId: number }> {
    const shops = await control<Array<{ shopId: number; userId: number }>>(
        'GET',
        `/shops?name=${encodeURIComponent(name)}`
    );
    if (shops.length !== 1) throw new Error(`Expected one mock shop named ${name}, found ${shops.length}`);
    return shops[0];
}

type MockListingJson = { listing_id: number; title: string; state: string; price: { amount: number }; tags: string[] };

export async function mockShopListings(shopId: number): Promise<MockListingJson[]> {
    const state = await control<{ shops: Array<{ shopId: number; listings: MockListingJson[] }> }>(
        'GET',
        '/state'
    );
    return state.shops.find((s) => s.shopId === shopId)?.listings ?? [];
}

export const setMockListingState = (listingId: number, state: string) =>
    control('POST', `/listings/${listingId}/state`, { state });
```

- [ ] **Step 4: Write the spec**

`packages/web/tests/e2e/etsy-mock.spec.ts`:
```ts
import { expect, test } from './fixtures';
import { MOCK_TOKEN_ETSY_MOCK } from './mocks/auth';
import { apiCreateBead, apiCreateDesign, apiSetUserSettings } from './utils/api-helpers';
import { findMockShop, mockShopListings, setMockListingState } from './utils/etsy-mock';

const TOKEN = MOCK_TOKEN_ETSY_MOCK;
test.use({ authToken: TOKEN });

// Drives the real API Etsy services against packages/etsy-mock — nothing under /api is page.route'd.
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
```

Before running, check the selectors match the app. Confirm that `openDesign` in `etsy-push.spec.ts` navigates to `/designs/${id}`; if it uses a different path, use that one. Also confirm that the design page fetches `etsy-status` on load (`useEtsyStatus`), so a reload picks up the new state. If it doesn't, find the control that triggers the refresh and click it instead of reloading.

- [ ] **Step 5: Run it locally on the manual stack**

This follows the foundry recipe: Mongo on 27018, the API started with the playwright `webServer` env block **plus** `ETSY_MOCK_URL=http://localhost:3010`, and vite on 3000. Then:
```bash
bun packages/etsy-mock/src/index.ts &
cd packages/web && bunx playwright test --project=chromium etsy-mock.spec.ts --workers=1
```
Expected: 3 passed. Then run the whole chromium project once to confirm the other Etsy specs are unaffected:
```bash
bunx playwright test --project=chromium
```

- [ ] **Step 6: Commit**

```bash
bun lint
git add packages/web/playwright.config.ts packages/web/tests/e2e
git commit -m "test(e2e): drive the Etsy integration end to end against the mock"
```

---

## Out of scope (deliberately)

- **Deploying the mock to the homelab** as a shared staging Etsy. That's possible later: the mock is a single Bun process. But prod must never get `ETSY_MOCK_URL`, and there's no staging API to point at it yet.
- **Validating responses against Etsy's published OpenAPI spec.** This is worth a follow-up card. Download the spec and add a test that checks `listingJson`, `receiptJson` and similar output against its schemas, so the mock can't drift from the real wire format.
- **Persisting mock state across restarts.** Reconnecting is one click on the consent page.
