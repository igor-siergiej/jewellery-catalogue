# Etsy Status Refresh + Listings Page (Sub-project 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Scope amendment (carried from `docs/superpowers/plans/2026-07-19-etsy-integration-remaining-work.md`, decided 2026-07-18 via AskUserQuestion):** this plan covers both halves of the amended sub-project 4 — (a) the original spec's lightweight per-design status refresh, and (b) a new `/listings` page showing **all current active Etsy listings** (live from Etsy, not just catalogue-linked designs). This **supersedes** the design spec's (`docs/superpowers/specs/2026-07-16-etsy-api-integration-design.md`) decision-log line "No listings screen (one-time script covers linking); orders page is future work."

**Goal:** Let Mari see a design's live Etsy status (Draft/Active/Inactive) refreshed on page view, and browse all of her shop's active Etsy listings with which ones are already linked to a catalogue design.

**Architecture:** Same layered pattern as sub-projects 1–3: `types` (no changes needed — `Design.etsy` already covers the states this plan reads/writes) → `domain` (`EtsyClient` gains two thin, tested HTTP methods; `EtsyConnectionService` gains a trivial `getShopId`; a new `EtsyStatusService`, separate from `EtsyPushService`, orchestrates both status-refresh and shop-listing-browse) → `handlers`/`routes` → web (`api/endpoints` + `useEtsyStatus`/`useEtsyListings` hooks + `ViewDesign` wiring + a new `Listings` page reachable from the sidebar).

**Tech Stack:** Bun + TypeScript + Hono (api), React + react-query + react-router-dom (web), MongoDB, Zod, bun:test, lucide-react icons.

## Global Constraints

- **Verified against the live Etsy API** (via the Etsy MCP tool, this session) rather than guessed:
  - `getListing` — `GET /v3/application/listings/{listing_id}`. Requires only `x-api-key` per Etsy's docs (no OAuth scope listed), but per this app's existing design decision (`docs/superpowers/plans/2026-07-19-etsy-integration-remaining-work.md`: "always pass the OAuth token — simpler than branching on public-vs-private per the spec's note, since the caller is always an already-connected user") this app always sends the bearer token too, matching the pattern already used by `EtsyClient.getListingImages`. Response `state` is one of `active, inactive, sold_out, draft, expired` — this app's `Design.etsy.state` only models `draft | active | inactive` (`packages/types/src/design/index.ts`), so `sold_out`/`expired` map down to `inactive`.
  - `findAllActiveListingsByShop` — `GET /v3/application/shops/{shop_id}/listings/active`. Public (`x-api-key` only, no token). Response is `{ count: number, results: ShopListing[] }`; supports `limit`/`offset` query params. `limit` caps at 100 server-side, so ~102 listings (per the spec's verified shop facts) needs 2 pages — paginate internally by looping on `offset += 100` until `offset >= count`.
  - `ShopListing.price` is a `Money` object `{ amount, divisor, currency_code }`, not a plain number — render as `amount / divisor`.
- This plan only surfaces **active** Etsy listings (`findAllActiveListingsByShop`) — drafts sitting on Etsy outside this app are not visible here. State this plainly in the `/listings` page copy so Mari isn't confused about why a known draft is missing.
- No background polling anywhere in this plan (spec, sub-project 4: "No background polling in v1") — status refresh fires once when `ViewDesign` mounts for an already-linked design; the listings page fetches once on mount, refresh only via manual navigation/refetch.
- `EtsyStatusService` is a new, separate domain service (single-responsibility, mirrors why `EtsyPushService` is separate from `DesignService`) — do not bolt these methods onto `EtsyPushService` or `DesignService`.
- All new `EtsyClient` HTTP methods take `accessToken`/`shopId`/`listingId` as explicit parameters (the client stays stateless per-call, matching every existing method) — do not give `EtsyClient` its own notion of "the current user."
- `EtsyConnectionService.getShopId` reads the stored `shopId` only — it must NOT call `getValidAccessToken` or touch refresh logic at all (browsing listings needs no live token; the spec's `getShopListingsActive` call is a public endpoint).
- Follow the existing repo's layered pattern exactly (`EtsyPushService`/`EtsyConnectionService` are the reference shape) — constructed from injected dependencies, no service reaching into another service's internals.
- Tests: `bun:test`, mocks via `mock()`, following `EtsyClient/index.test.ts`/`EtsyConnectionService/index.test.ts`/`EtsyPushService/index.test.ts` conventions exactly (this plan adds sibling `describe` blocks to two of those three existing files, and one brand new test file for `EtsyStatusService`).
- Lint/format: `bun run lint` (Biome) must pass on touched files before each commit.
- **Typecheck caveat (carried over from sub-projects 2/3):** `bunx tsc --noEmit` inside `packages/web` (and the repo's CI `bun run tsc --noEmit`) is a silent no-op — the tsconfig is solution-style (`files: []`, no `include`), so it always exits 0 having checked nothing. Use `bunx tsc --build --force` from the repo root for a real check, then `git clean -fd -- packages/` to remove the generated `.d.ts`/`.tsbuildinfo`/`.js` artifacts it leaves behind (do NOT use `-x`, do NOT run `git clean` outside `packages/`). A pre-existing baseline of unrelated errors exists on `main` — diff against that baseline rather than expecting a clean run. `packages/api` and `packages/types` do NOT have this problem; `bunx tsc --noEmit` works normally there.
- **`fallow-audit` (the pre-push hook) hard-fails on dead-code findings.** A method only called via DI-container resolution from a different file (e.g. `dependencyContainer.resolve(...).someMethod()`) reads as unreachable to the static analyzer — suppress with `// fallow-ignore-next-line unused-class-member` directly above the method if that happens (see `EtsyClient.getSellerTaxonomyNodes` for the existing convention). Methods called as plain typed method calls on an injected constructor field (e.g. `this.etsyConnectionService.getShopId(userId)` from inside `EtsyStatusService`) are traceable normally and do NOT need this suppression — only the handler-layer entry points that go through `dependencyContainer.resolve(...)` directly are at risk. Check `bunx fallow-audit --format json` for structured findings if a push is blocked and the reason isn't obvious from the summary.
- This plan does not implement the one-time linking script (sub-project 5, spec) — that is a separate, later plan that depends on this one's `EtsyClient.getShopListingsActive` already existing (don't duplicate that Etsy call there).
- Branch stacks on current `main` tip — sub-projects 1–3 are already merged, so branch directly from `main`, no rebase-onto-a-stack dance needed for this plan.

---

## File Structure

```
packages/api/src/domain/EtsyClient/index.ts                    # + getListing, getShopListingsActive
packages/api/src/domain/EtsyClient/index.test.ts
packages/api/src/domain/EtsyConnectionService/index.ts         # + getShopId
packages/api/src/domain/EtsyConnectionService/index.test.ts
packages/api/src/domain/EtsyStatusService/index.ts              # new: refreshStatus + listShopListings
packages/api/src/domain/EtsyStatusService/index.test.ts         # new
packages/api/src/handlers/Etsy/index.ts                         # + refreshDesignEtsyStatus, getEtsyShopListings
packages/api/src/dependencies/types.ts                          # + EtsyStatusService token
packages/api/src/dependencies/index.ts                          # + registration
packages/api/src/routes/index.ts                                # + GET /api/designs/:id/etsy-status, GET /api/etsy/listings

packages/web/src/api/endpoints.ts                                # + getEtsyStatusEndpoint, ETSY_LISTINGS_ENDPOINT
packages/web/src/api/endpoints/etsyStatus/index.ts                # new
packages/web/src/api/endpoints/etsyListings/index.ts               # new
packages/web/src/hooks/useEtsyStatus.ts                            # new
packages/web/src/hooks/useEtsyListings.ts                          # new
packages/web/src/pages/ViewDesign/index.tsx                        # + fire useEtsyStatus on mount when linked
packages/web/src/pages/Listings/index.tsx                          # new
packages/web/src/constants/routes.ts                               # + LISTINGS_PAGE, added to ROUTES
packages/web/src/components/AppSidebar/index.tsx                    # + '/listings' icon mapping
packages/web/src/index.tsx                                          # + <Route> for LISTINGS_PAGE
```

---

### Task 1: API — `EtsyClient.getListing`

**Files:**
- Modify: `packages/api/src/domain/EtsyClient/index.ts`
- Modify: `packages/api/src/domain/EtsyClient/index.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (same file/class sub-projects 1/3 created; purely additive).
- Produces: `interface EtsyListingStatus { listingId: number; state: EtsyListingState }` (imports `EtsyListingState` from `@jewellery-catalogue/types`), `getListing(accessToken: string, listingId: number): Promise<EtsyListingStatus>` — consumed by `EtsyStatusService` (Task 4).

- [ ] **Step 1: Write the failing tests**

Add to `packages/api/src/domain/EtsyClient/index.test.ts`, inside the existing `describe('EtsyClient', ...)` block, as a sibling to `getSellerTaxonomyNodes`:

```typescript
    describe('getListing', () => {
        it('fetches the listing and maps a draft state through unchanged', async () => {
            fetchMock.mockResolvedValue(new Response(JSON.stringify({ listing_id: 999, state: 'draft' }), { status: 200 }));

            const result = await client.getListing('at-token', 999);

            expect(result).toEqual({ listingId: 999, state: 'draft' });
            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/listings/999');
            expect((options.headers as Record<string, string>)['x-api-key']).toBe('key123:secret456');
            expect((options.headers as Record<string, string>).Authorization).toBe('Bearer at-token');
        });

        it('maps an active state through unchanged', async () => {
            fetchMock.mockResolvedValue(new Response(JSON.stringify({ listing_id: 999, state: 'active' }), { status: 200 }));

            const result = await client.getListing('at-token', 999);

            expect(result).toEqual({ listingId: 999, state: 'active' });
        });

        it.each(['inactive', 'sold_out', 'expired'])('maps Etsy state "%s" down to "inactive"', async (etsyState) => {
            fetchMock.mockResolvedValue(new Response(JSON.stringify({ listing_id: 999, state: etsyState }), { status: 200 }));

            const result = await client.getListing('at-token', 999);

            expect(result).toEqual({ listingId: 999, state: 'inactive' });
        });

        it('throws when Etsy responds with an error status', async () => {
            fetchMock.mockResolvedValue(new Response('nope', { status: 404 }));

            await expect(client.getListing('at', 1)).rejects.toThrow();
        });
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/EtsyClient/index.test.ts`
Expected: FAIL — `client.getListing is not a function`

- [ ] **Step 3: Implement**

In `packages/api/src/domain/EtsyClient/index.ts`, add the import at the top of the file (after the `node:crypto` import):

```typescript
import type { EtsyListingState } from '@jewellery-catalogue/types';
```

Add the interface and mapping helper above the `EtsyClient` class, alongside the other exported interfaces:

```typescript
export interface EtsyListingStatus {
    listingId: number;
    state: EtsyListingState;
}

const mapListingState = (state: string): EtsyListingState => (state === 'draft' || state === 'active' ? state : 'inactive');
```

Add the method inside the `EtsyClient` class, after `getShop` (before `createDraftListing`):

```typescript
    async getListing(accessToken: string, listingId: number): Promise<EtsyListingStatus> {
        const response = await fetch(`${API_BASE}/listings/${listingId}`, {
            headers: { 'x-api-key': this.apiKeyHeader(), Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new Error(`Etsy getListing failed: ${response.status} ${await response.text()}`);
        }

        const body = (await response.json()) as { listing_id: number; state: string };
        return { listingId: body.listing_id, state: mapListingState(body.state) };
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/EtsyClient/index.test.ts`
Expected: PASS (including all pre-existing `EtsyClient` tests — unaffected, purely additive)

- [ ] **Step 5: Run the full api test suite**

Run: `cd packages/api && bun test`
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/domain/EtsyClient/index.ts packages/api/src/domain/EtsyClient/index.test.ts
git commit -m "feat(api): add EtsyClient.getListing for status refresh"
```

---

### Task 2: API — `EtsyClient.getShopListingsActive`

**Files:**
- Modify: `packages/api/src/domain/EtsyClient/index.ts`
- Modify: `packages/api/src/domain/EtsyClient/index.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (additive to the same class).
- Produces: `interface EtsyListingSummary { listingId: number; title: string; price: number; url: string }`, `getShopListingsActive(shopId: number): Promise<EtsyListingSummary[]>` — consumed by `EtsyStatusService` (Task 4).

- [ ] **Step 1: Write the failing tests**

Add to `packages/api/src/domain/EtsyClient/index.test.ts`, as a sibling to the `getListing` block just added:

```typescript
    describe('getShopListingsActive', () => {
        it('fetches a single page when count fits within the page limit', async () => {
            fetchMock.mockResolvedValue(
                new Response(
                    JSON.stringify({
                        count: 2,
                        results: [
                            { listing_id: 1, title: 'Silver Ring', price: { amount: 2550, divisor: 100, currency_code: 'GBP' }, url: 'https://etsy.com/listing/1' },
                            { listing_id: 2, title: 'Gold Ring', price: { amount: 4000, divisor: 100, currency_code: 'GBP' }, url: 'https://etsy.com/listing/2' },
                        ],
                    }),
                    { status: 200 }
                )
            );

            const result = await client.getShopListingsActive(47408839);

            expect(result).toEqual([
                { listingId: 1, title: 'Silver Ring', price: 25.5, url: 'https://etsy.com/listing/1' },
                { listingId: 2, title: 'Gold Ring', price: 40, url: 'https://etsy.com/listing/2' },
            ]);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/shops/47408839/listings/active?limit=100&offset=0');
            expect((options.headers as Record<string, string>)['x-api-key']).toBe('key123:secret456');
            expect((options.headers as Record<string, string>).Authorization).toBeUndefined();
        });

        it('paginates when count exceeds the 100-item page limit', async () => {
            const page = (start: number, count: number, total: number) => ({
                count: total,
                results: Array.from({ length: count }, (_, i) => ({
                    listing_id: start + i,
                    title: `Listing ${start + i}`,
                    price: { amount: 1000, divisor: 100, currency_code: 'GBP' },
                    url: `https://etsy.com/listing/${start + i}`,
                })),
            });

            fetchMock
                .mockResolvedValueOnce(new Response(JSON.stringify(page(1, 100, 102)), { status: 200 }))
                .mockResolvedValueOnce(new Response(JSON.stringify(page(101, 2, 102)), { status: 200 }));

            const result = await client.getShopListingsActive(47408839);

            expect(result).toHaveLength(102);
            expect(fetchMock).toHaveBeenCalledTimes(2);
            const [firstUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
            const [secondUrl] = fetchMock.mock.calls[1] as [string, RequestInit];
            expect(firstUrl).toBe('https://api.etsy.com/v3/application/shops/47408839/listings/active?limit=100&offset=0');
            expect(secondUrl).toBe('https://api.etsy.com/v3/application/shops/47408839/listings/active?limit=100&offset=100');
        });

        it('throws when Etsy responds with an error status', async () => {
            fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));

            await expect(client.getShopListingsActive(1)).rejects.toThrow();
        });
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/EtsyClient/index.test.ts`
Expected: FAIL — `client.getShopListingsActive is not a function`

- [ ] **Step 3: Implement**

In `packages/api/src/domain/EtsyClient/index.ts`, add the interface above the `EtsyClient` class, alongside `EtsyListingStatus`:

```typescript
export interface EtsyListingSummary {
    listingId: number;
    title: string;
    price: number;
    url: string;
}
```

Add a page-size constant near the top of the file, alongside `API_BASE`:

```typescript
const SHOP_LISTINGS_PAGE_LIMIT = 100;
```

Add the method inside the `EtsyClient` class, after `getListing`:

```typescript
    async getShopListingsActive(shopId: number): Promise<EtsyListingSummary[]> {
        const results: EtsyListingSummary[] = [];
        let offset = 0;

        for (;;) {
            const response = await fetch(
                `${API_BASE}/shops/${shopId}/listings/active?limit=${SHOP_LISTINGS_PAGE_LIMIT}&offset=${offset}`,
                { headers: { 'x-api-key': this.apiKeyHeader() } }
            );

            if (!response.ok) {
                throw new Error(`Etsy getShopListingsActive failed: ${response.status} ${await response.text()}`);
            }

            const body = (await response.json()) as {
                count: number;
                results: Array<{
                    listing_id: number;
                    title: string;
                    price: { amount: number; divisor: number };
                    url: string;
                }>;
            };

            results.push(
                ...body.results.map((r) => ({
                    listingId: r.listing_id,
                    title: r.title,
                    price: r.price.amount / r.price.divisor,
                    url: r.url,
                }))
            );

            offset += SHOP_LISTINGS_PAGE_LIMIT;
            if (offset >= body.count || body.results.length < SHOP_LISTINGS_PAGE_LIMIT) break;
        }

        return results;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/EtsyClient/index.test.ts`
Expected: PASS (all tests, including the pagination case)

- [ ] **Step 5: Run the full api test suite**

Run: `cd packages/api && bun test`
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/domain/EtsyClient/index.ts packages/api/src/domain/EtsyClient/index.test.ts
git commit -m "feat(api): add EtsyClient.getShopListingsActive with pagination"
```

---

### Task 3: API — `EtsyConnectionService.getShopId`

**Files:**
- Modify: `packages/api/src/domain/EtsyConnectionService/index.ts`
- Modify: `packages/api/src/domain/EtsyConnectionService/index.test.ts`

**Interfaces:**
- Consumes: `EtsyConnectionRepository.getByUserId` (existing).
- Produces: `getShopId(userId: string): Promise<number>` — consumed by `EtsyStatusService` (Task 4). Does NOT call `getValidAccessToken` or `EtsyClient` at all.

- [ ] **Step 1: Write the failing test**

Add to `packages/api/src/domain/EtsyConnectionService/index.test.ts`, as a sibling to the `getPushCredentials` block:

```typescript
    describe('getShopId', () => {
        it('returns the stored shopId without touching token refresh', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(makeConnection({ shopId: 47408839 }));

            const result = await service.getShopId('user-1');

            expect(result).toBe(47408839);
            expect(mockEtsyClient.refreshAccessToken).not.toHaveBeenCalled();
        });

        it('throws when there is no connection', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(null);

            await expect(service.getShopId('user-1')).rejects.toThrow();
        });
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/EtsyConnectionService/index.test.ts`
Expected: FAIL — `service.getShopId is not a function`

- [ ] **Step 3: Implement**

In `packages/api/src/domain/EtsyConnectionService/index.ts`, add the method after `getPushCredentials` (at the end of the class, before the closing `}`):

```typescript
    async getShopId(userId: string): Promise<number> {
        const connection = await this.connectionRepo.getByUserId(userId);
        if (!connection) {
            throw new APIError('Etsy is not connected', 400);
        }
        return connection.shopId;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/EtsyConnectionService/index.test.ts`
Expected: PASS (all pre-existing tests plus the two new ones)

- [ ] **Step 5: Run the full api test suite**

Run: `cd packages/api && bun test`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/domain/EtsyConnectionService/index.ts packages/api/src/domain/EtsyConnectionService/index.test.ts
git commit -m "feat(api): add getShopId to EtsyConnectionService"
```

---

### Task 4: API — `EtsyStatusService`

**Files:**
- Create: `packages/api/src/domain/EtsyStatusService/index.ts`
- Create: `packages/api/src/domain/EtsyStatusService/index.test.ts`

**Interfaces:**
- Consumes: `DesignRepository.getByIdAndUserId`/`.getByUserId`/`.update` (existing), `EtsyClient.getListing`/`.getShopListingsActive` (Tasks 1/2), `EtsyConnectionService.getValidAccessToken` (existing)/`.getShopId` (Task 3).
- Produces:
  - `interface EtsyListingWithLinkStatus extends EtsyListingSummary { linkedDesignId: string | null }`
  - `class EtsyStatusService { constructor(designRepo, etsyClient, etsyConnectionService); refreshStatus(designId: string, userId: string): Promise<Design>; listShopListings(userId: string): Promise<EtsyListingWithLinkStatus[]> }`
  - consumed by `handlers/Etsy` (Task 5).

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/api/src/domain/EtsyStatusService/index.test.ts
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { Design } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import { EtsyStatusService } from './index';

const mockDesignRepo = { getByIdAndUserId: mock(), getByUserId: mock(), update: mock() };
const mockEtsyClient = { getListing: mock(), getShopListingsActive: mock() };
const mockEtsyConnectionService = { getValidAccessToken: mock(), getShopId: mock() };

function makeDesign(overrides: Partial<Design> = {}): Design {
    return {
        id: 'design-1',
        userId: 'user-1',
        name: 'Silver Ring',
        description: 'A lovely ring.',
        timeRequired: '01:00',
        materials: [],
        imageIds: [],
        diagramImageIds: [],
        makingNotes: '',
        price: 25,
        totalMaterialCosts: 10,
        dateAdded: new Date(),
        totalQuantity: 2,
        ...overrides,
    };
}

describe('EtsyStatusService', () => {
    let service: EtsyStatusService;

    beforeEach(() => {
        [...Object.values(mockDesignRepo), ...Object.values(mockEtsyClient), ...Object.values(mockEtsyConnectionService)].forEach(
            (m) => m.mockClear()
        );

        service = new EtsyStatusService(
            mockDesignRepo as unknown as DesignRepository,
            mockEtsyClient as unknown as EtsyClient,
            mockEtsyConnectionService as unknown as EtsyConnectionService
        );

        mockEtsyConnectionService.getValidAccessToken.mockResolvedValue('at-token');
        mockEtsyConnectionService.getShopId.mockResolvedValue(47408839);
    });

    describe('refreshStatus', () => {
        it('fetches the live state and persists it onto the design, preserving other etsy fields', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(
                makeDesign({ etsy: { listingId: 999, state: 'draft', lastPushedAt: 123, pushIncomplete: false } })
            );
            mockEtsyClient.getListing.mockResolvedValue({ listingId: 999, state: 'active' });

            const result = await service.refreshStatus('design-1', 'user-1');

            expect(mockEtsyClient.getListing).toHaveBeenCalledWith('at-token', 999);
            expect(result.etsy).toEqual({ listingId: 999, state: 'active', lastPushedAt: 123, pushIncomplete: false });
            expect(mockDesignRepo.update).toHaveBeenCalledWith('design-1', result);
        });

        it('throws when the design does not exist', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(null);

            await expect(service.refreshStatus('design-1', 'user-1')).rejects.toThrow();
            expect(mockEtsyClient.getListing).not.toHaveBeenCalled();
        });

        it('throws when the design is not linked to an Etsy listing', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign());

            await expect(service.refreshStatus('design-1', 'user-1')).rejects.toThrow();
            expect(mockEtsyClient.getListing).not.toHaveBeenCalled();
        });
    });

    describe('listShopListings', () => {
        it('flags listings already linked to one of this user\'s designs', async () => {
            mockDesignRepo.getByUserId.mockResolvedValue([
                makeDesign({ id: 'design-1', etsy: { listingId: 1, state: 'active', lastPushedAt: 1 } }),
                makeDesign({ id: 'design-2' }),
            ]);
            mockEtsyClient.getShopListingsActive.mockResolvedValue([
                { listingId: 1, title: 'Linked Listing', price: 25, url: 'https://etsy.com/listing/1' },
                { listingId: 2, title: 'Unlinked Listing', price: 30, url: 'https://etsy.com/listing/2' },
            ]);

            const result = await service.listShopListings('user-1');

            expect(mockEtsyConnectionService.getShopId).toHaveBeenCalledWith('user-1');
            expect(mockEtsyClient.getShopListingsActive).toHaveBeenCalledWith(47408839);
            expect(result).toEqual([
                { listingId: 1, title: 'Linked Listing', price: 25, url: 'https://etsy.com/listing/1', linkedDesignId: 'design-1' },
                { listingId: 2, title: 'Unlinked Listing', price: 30, url: 'https://etsy.com/listing/2', linkedDesignId: null },
            ]);
        });

        it('returns every listing unlinked when the user has no linked designs', async () => {
            mockDesignRepo.getByUserId.mockResolvedValue([makeDesign()]);
            mockEtsyClient.getShopListingsActive.mockResolvedValue([
                { listingId: 5, title: 'Some Listing', price: 10, url: 'https://etsy.com/listing/5' },
            ]);

            const result = await service.listShopListings('user-1');

            expect(result).toEqual([{ listingId: 5, title: 'Some Listing', price: 10, url: 'https://etsy.com/listing/5', linkedDesignId: null }]);
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/EtsyStatusService/index.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// packages/api/src/domain/EtsyStatusService/index.ts
import { APIError } from '@imapps/api-utils/hono';
import type { Design } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient, EtsyListingSummary } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';

export interface EtsyListingWithLinkStatus extends EtsyListingSummary {
    linkedDesignId: string | null;
}

export class EtsyStatusService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly etsyClient: EtsyClient,
        private readonly etsyConnectionService: EtsyConnectionService
    ) {}

    async refreshStatus(designId: string, userId: string): Promise<Design> {
        const design = await this.designRepo.getByIdAndUserId(designId, userId);
        if (!design) {
            throw new APIError('Design not found', 404);
        }
        if (!design.etsy?.listingId) {
            throw new APIError('Design is not linked to an Etsy listing', 400);
        }

        const accessToken = await this.etsyConnectionService.getValidAccessToken(userId);
        const status = await this.etsyClient.getListing(accessToken, design.etsy.listingId);

        const updated: Design = { ...design, etsy: { ...design.etsy, state: status.state } };
        await this.designRepo.update(designId, updated);

        return updated;
    }

    async listShopListings(userId: string): Promise<EtsyListingWithLinkStatus[]> {
        const shopId = await this.etsyConnectionService.getShopId(userId);
        const [listings, designs] = await Promise.all([
            this.etsyClient.getShopListingsActive(shopId),
            this.designRepo.getByUserId(userId),
        ]);

        const designIdByListingId = new Map(
            designs.filter((d): d is Design & { etsy: NonNullable<Design['etsy']> } => !!d.etsy?.listingId).map((d) => [d.etsy.listingId, d.id])
        );

        return listings.map((listing) => ({
            ...listing,
            linkedDesignId: designIdByListingId.get(listing.listingId) ?? null,
        }));
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/EtsyStatusService/index.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Run the full api test suite**

Run: `cd packages/api && bun test`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/domain/EtsyStatusService/index.ts packages/api/src/domain/EtsyStatusService/index.test.ts
git commit -m "feat(api): add EtsyStatusService for status refresh and shop listing browse"
```

---

### Task 5: API — handlers, routes, DI wiring

**Files:**
- Modify: `packages/api/src/handlers/Etsy/index.ts`
- Modify: `packages/api/src/dependencies/types.ts`
- Modify: `packages/api/src/dependencies/index.ts`
- Modify: `packages/api/src/routes/index.ts`

**Interfaces:**
- Consumes: `EtsyStatusService.refreshStatus`/`.listShopListings` (Task 4).
- Produces: `GET /api/designs/:id/etsy-status` (returns the updated `Design`), `GET /api/etsy/listings` (returns `EtsyListingWithLinkStatus[]`) — consumed by web (Task 6). No new tests — this repo's existing `handlers/Etsy/index.ts` has no dedicated test file (matches `handlers/EtsyConnection`/`handlers/EtsyPush` — thin wrappers, exercised via the domain-service tests already written and, eventually, E2E); this task is verified by typecheck + the full test suite staying green.

- [ ] **Step 1: Add handlers**

In `packages/api/src/handlers/Etsy/index.ts`, add the import:

```typescript
import type { EtsyStatusService } from '../../domain/EtsyStatusService';
```

Add at the end of the file, after `getEtsyTaxonomy`:

```typescript
const getStatusService = (): EtsyStatusService => dependencyContainer.resolve(DependencyToken.EtsyStatusService);

export const refreshDesignEtsyStatus = async (c: AuthedCtx) => {
    const design = await getStatusService().refreshStatus(c.req.param('id'), c.get('userId'));
    return c.json(design, 200);
};

export const getEtsyShopListings = async (c: AuthedCtx) => {
    const listings = await getStatusService().listShopListings(c.get('userId'));
    return c.json(listings, 200);
};
```

- [ ] **Step 2: Add the DI token**

In `packages/api/src/dependencies/types.ts`, add the import:

```typescript
import type { EtsyStatusService } from '../domain/EtsyStatusService';
```

Add the token to the `DependencyToken` enum, in the `// Services` group, after `EtsyPushService = 'EtsyPushService',`:

```typescript
    EtsyStatusService = 'EtsyStatusService',
```

Add the type to the `Dependencies` type, in the same group, after `[DependencyToken.EtsyPushService]: EtsyPushService;`:

```typescript
    [DependencyToken.EtsyStatusService]: EtsyStatusService;
```

- [ ] **Step 3: Register the dependency**

In `packages/api/src/dependencies/index.ts`, add the import:

```typescript
import { EtsyStatusService } from '../domain/EtsyStatusService';
```

Add the registration after the `EtsyPushService` registration block:

```typescript
    dependencyContainer.registerSingleton(
        DependencyToken.EtsyStatusService,
        class {
            constructor() {
                return new EtsyStatusService(
                    dependencyContainer.resolve(DependencyToken.DesignRepository),
                    dependencyContainer.resolve(DependencyToken.EtsyClient),
                    dependencyContainer.resolve(DependencyToken.EtsyConnectionService)
                );
            }
        } as any
    );
```

- [ ] **Step 4: Add the routes**

In `packages/api/src/routes/index.ts`, update the `handlers/Etsy` import to include the two new handlers:

```typescript
import {
    disconnectEtsyConnection,
    etsyOAuthCallback,
    getEtsyConnectionStatus,
    getEtsyShopListings,
    getEtsyTaxonomy,
    pushDesignToEtsy,
    refreshDesignEtsyStatus,
    startEtsyOAuth,
} from '../handlers/Etsy';
```

Add the two routes after the existing `/api/etsy/taxonomy` route:

```typescript
    app.get('/api/etsy/taxonomy', authenticate, getEtsyTaxonomy);
    app.get('/api/etsy/listings', authenticate, getEtsyShopListings);
    app.get('/api/designs/:id/etsy-status', authenticate, refreshDesignEtsyStatus);
```

- [ ] **Step 5: Typecheck and run the full api test suite**

Run: `cd packages/api && bunx tsc --noEmit`
Expected: no errors

Run: `cd packages/api && bun test`
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/handlers/Etsy/index.ts packages/api/src/dependencies/types.ts packages/api/src/dependencies/index.ts packages/api/src/routes/index.ts
git commit -m "feat(api): wire etsy-status and etsy-listings routes"
```

---

### Task 6: Web — API client endpoints + hooks

**Files:**
- Modify: `packages/web/src/api/endpoints.ts`
- Create: `packages/web/src/api/endpoints/etsyStatus/index.ts`
- Create: `packages/web/src/api/endpoints/etsyListings/index.ts`
- Create: `packages/web/src/hooks/useEtsyStatus.ts`
- Create: `packages/web/src/hooks/useEtsyListings.ts`

**Interfaces:**
- Consumes: `GET /api/designs/:id/etsy-status`, `GET /api/etsy/listings` (Task 5).
- Produces: `useEtsyStatus(designId: string, enabled: boolean): void` (fires once, writes the refreshed `Design` into the `['design', designId]` query cache), `useEtsyListings(): { listings: EtsyListingWithLinkStatus[]; isLoading: boolean; isError: boolean }` — consumed by `ViewDesign` (Task 7) and `Listings` (Task 8).

- [ ] **Step 1: Add endpoint constants**

In `packages/web/src/api/endpoints.ts`, add after `ETSY_TAXONOMY_ENDPOINT`:

```typescript
export const ETSY_LISTINGS_ENDPOINT = '/api/etsy/listings';

export const getEtsyStatusEndpoint = (designId: string) => `${DESIGNS_ENDPOINT}/${designId}/etsy-status`;
```

- [ ] **Step 2: Add the status-refresh endpoint client**

```typescript
// packages/web/src/api/endpoints/etsyStatus/index.ts
import { type Design, MethodType } from '@jewellery-catalogue/types';

import { getEtsyStatusEndpoint } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeRefreshEtsyStatusRequest = (
    designId: string,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<Design>(
        {
            pathname: getEtsyStatusEndpoint(designId),
            method: MethodType.GET,
            operationString: 'refresh etsy status',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
```

- [ ] **Step 3: Add the shop-listings endpoint client**

```typescript
// packages/web/src/api/endpoints/etsyListings/index.ts
import { MethodType } from '@jewellery-catalogue/types';

import { ETSY_LISTINGS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export interface EtsyListingWithLinkStatus {
    listingId: number;
    title: string;
    price: number;
    url: string;
    linkedDesignId: string | null;
}

export const makeGetEtsyListingsRequest = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<EtsyListingWithLinkStatus[]>(
        {
            pathname: ETSY_LISTINGS_ENDPOINT,
            method: MethodType.GET,
            operationString: 'fetch etsy shop listings',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
```

- [ ] **Step 4: Add `useEtsyStatus`**

```typescript
// packages/web/src/hooks/useEtsyStatus.ts
import { useAuth } from '@imapps/web-utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { makeRefreshEtsyStatusRequest } from '../api/endpoints/etsyStatus';

export const useEtsyStatus = (designId: string, enabled: boolean) => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    useQuery({
        queryKey: ['etsy-status', designId],
        queryFn: async () => {
            const design = await makeRefreshEtsyStatusRequest(designId, () => accessToken, login, logout);
            queryClient.setQueryData(['design', designId], design);
            return design;
        },
        enabled: enabled && !!accessToken && !!designId,
        staleTime: Number.POSITIVE_INFINITY,
    });
};
```

- [ ] **Step 5: Add `useEtsyListings`**

```typescript
// packages/web/src/hooks/useEtsyListings.ts
import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';

import { makeGetEtsyListingsRequest } from '../api/endpoints/etsyListings';

export const useEtsyListings = () => {
    const { accessToken, login, logout } = useAuth();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['etsy-listings'],
        queryFn: () => makeGetEtsyListingsRequest(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    return {
        listings: data ?? [],
        isLoading,
        isError,
    };
};
```

- [ ] **Step 6: Typecheck**

Run: `bunx tsc --build --force` (from repo root)
Expected: no NEW errors versus the pre-existing baseline (see Global Constraints)

Run: `git clean -fd -- packages/` (from repo root, to remove generated build artifacts)

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/api/endpoints.ts packages/web/src/api/endpoints/etsyStatus packages/web/src/api/endpoints/etsyListings packages/web/src/hooks/useEtsyStatus.ts packages/web/src/hooks/useEtsyListings.ts
git commit -m "feat(web): add etsy status/listings API clients and hooks"
```

---

### Task 7: Web — `ViewDesign` status-refresh wiring

**Files:**
- Modify: `packages/web/src/pages/ViewDesign/index.tsx`

**Interfaces:**
- Consumes: `useEtsyStatus` (Task 6).
- Produces: nothing new (behavioral change only) — this is the last task that touches `ViewDesign`.

- [ ] **Step 1: Wire the hook**

In `packages/web/src/pages/ViewDesign/index.tsx`, add the import after the existing `useEtsyConnection` import:

```typescript
import { useEtsyStatus } from '../../hooks/useEtsyStatus';
```

In the component body, after the existing `useQuery` call for `design` (right after the `const { ... } = design ?? {};` destructure), add:

```typescript
    useEtsyStatus(id ?? '', !!id && !!etsy?.listingId);
```

This fires the `GET /api/designs/:id/etsy-status` call once, only when the design is already linked to Etsy (`etsy?.listingId` present) — matching the spec's "Viewing a linked design triggers a lightweight `GET /listings/{id}`... No background polling in v1." The hook writes the refreshed design straight into the `['design', id]` query cache (Task 6), so the existing Etsy chip (`{etsy.state === 'active' ? 'Active' : 'Draft'} on Etsy`, already rendered lower in this file) picks up the new state on the next render with no other change needed.

- [ ] **Step 2: Manual verification**

Run: `bun run dev` (or the project's existing dev-server command) and open a design that already has `etsy.listingId` set (or push a design to Etsy first via sub-project 3's flow, then revisit its page).
Expected: a network request to `GET /api/designs/:id/etsy-status` fires once on page load in the browser devtools Network tab, and does not repeat while the page stays open (no polling).

- [ ] **Step 3: Typecheck**

Run: `bunx tsc --build --force` (from repo root)
Expected: no NEW errors versus baseline

Run: `git clean -fd -- packages/` (from repo root)

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/pages/ViewDesign/index.tsx
git commit -m "feat(web): refresh etsy status once when viewing a linked design"
```

---

### Task 8: Web — `Listings` page + route + sidebar nav

**Files:**
- Modify: `packages/web/src/constants/routes.ts`
- Modify: `packages/web/src/components/AppSidebar/index.tsx`
- Modify: `packages/web/src/index.tsx`
- Create: `packages/web/src/pages/Listings/index.tsx`

**Interfaces:**
- Consumes: `useEtsyListings` (Task 6), `useEtsyConnection` (existing).
- Produces: the `/listings` page, reachable from the sidebar — final task in this plan.

- [ ] **Step 1: Add the route constant**

In `packages/web/src/constants/routes.ts`, add after `SETTINGS_PAGE`:

```typescript
export const LISTINGS_PAGE: NavRoute = {
    name: 'Listings',
    route: '/listings',
};
```

Update the `ROUTES` array (used by the sidebar) to include it:

```typescript
export const ROUTES = [HOME_PAGE, DESIGNS_PAGE, LISTINGS_PAGE, ADD_DESIGN_PAGE, MATERIALS_PAGE, ADD_MATERIAL_PAGE];
```

- [ ] **Step 2: Add the sidebar icon**

In `packages/web/src/components/AppSidebar/index.tsx`, add `ShoppingBag` to the `lucide-react` import:

```typescript
import { Gem, Home, Palette, Plus, PlusCircle, ShoppingBag } from 'lucide-react';
```

Add the mapping entry to `routeIcons`:

```typescript
const routeIcons = {
    '/home': Home,
    '/designs': Palette,
    '/listings': ShoppingBag,
    '/addDesign': Plus,
    '/materials': Gem,
    '/addMaterial': PlusCircle,
};
```

- [ ] **Step 3: Build the `Listings` page**

```tsx
// packages/web/src/pages/Listings/index.tsx
import { ExternalLink, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

import LoadingScreen from '../../components/Loading';
import { Badge } from '../../components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { SETTINGS_PAGE, VIEW_DESIGN_PAGE } from '../../constants/routes';
import { useEtsyConnection } from '../../hooks/useEtsyConnection';
import { useEtsyListings } from '../../hooks/useEtsyListings';

const Listings = () => {
    const { connected: etsyConnected, isLoading: isConnectionLoading } = useEtsyConnection();
    const { listings, isLoading, isError } = useEtsyListings();

    if (isConnectionLoading) {
        return <LoadingScreen />;
    }

    if (!etsyConnected) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <ShoppingBag />
                    </EmptyMedia>
                    <EmptyTitle>Etsy Not Connected</EmptyTitle>
                    <EmptyDescription>
                        <Link to={SETTINGS_PAGE.route} className="text-primary hover:underline">
                            Connect your Etsy shop
                        </Link>{' '}
                        to see your active listings here.
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (isError) {
        return <span>Something went wrong! :(</span>;
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Etsy Listings</h1>
                <p className="text-sm text-muted-foreground">
                    {listings.length} active listing{listings.length === 1 ? '' : 's'} on Etsy. Only active listings are
                    shown here — drafts sitting on Etsy outside this app aren't included.
                </p>
            </div>

            {listings.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ShoppingBag />
                        </EmptyMedia>
                        <EmptyTitle>No Active Listings</EmptyTitle>
                        <EmptyDescription>Your shop has no active Etsy listings right now.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Linked Design</TableHead>
                            <TableHead>Etsy</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {listings.map((listing) => (
                            <TableRow key={listing.listingId}>
                                <TableCell className="font-medium">{listing.title}</TableCell>
                                <TableCell>£{listing.price.toFixed(2)}</TableCell>
                                <TableCell>
                                    {listing.linkedDesignId ? (
                                        <Link
                                            to={VIEW_DESIGN_PAGE.getRoute(listing.linkedDesignId)}
                                            className="text-primary hover:underline"
                                        >
                                            View design
                                        </Link>
                                    ) : (
                                        <Badge variant="secondary">Not linked</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <a
                                        href={listing.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                    >
                                        View <ExternalLink className="h-3 w-3" />
                                    </a>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
};

export default Listings;
```

- [ ] **Step 4: Wire the route**

In `packages/web/src/index.tsx`, add `LISTINGS_PAGE` to the routes import:

```typescript
import {
    ADD_DESIGN_PAGE,
    ADD_MATERIAL_PAGE,
    DESIGNS_PAGE,
    HOME_PAGE,
    LISTINGS_PAGE,
    MATERIALS_PAGE,
    REGISTER_PAGE,
    SETTINGS_PAGE,
    START_PAGE,
    VIEW_DESIGN_PAGE,
} from './constants/routes';
```

Add the `Listings` page import after `Home`:

```typescript
import Listings from './pages/Listings';
```

Add the route inside `<Routes>`, after the `DESIGNS_PAGE` route:

```tsx
            <Route
                path={LISTINGS_PAGE.route}
                element={
                    <ProtectedRoute fallbackPath={START_PAGE.route}>
                        <MainLayout>
                            <Listings />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
```

- [ ] **Step 5: Manual verification**

Run: `bun run dev` (or the project's existing dev-server command), sign in, and navigate to the new "Listings" sidebar entry.
Expected: with Etsy not connected, an empty state pointing to Settings; with Etsy connected, a table of active shop listings, correctly flagging which ones link to catalogue designs via "View design", and an "Etsy" column linking out to the live listing.

- [ ] **Step 6: Typecheck**

Run: `bunx tsc --build --force` (from repo root)
Expected: no NEW errors versus baseline

Run: `git clean -fd -- packages/` (from repo root)

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/constants/routes.ts packages/web/src/components/AppSidebar/index.tsx packages/web/src/index.tsx packages/web/src/pages/Listings
git commit -m "feat(web): add Etsy Listings page"
```
