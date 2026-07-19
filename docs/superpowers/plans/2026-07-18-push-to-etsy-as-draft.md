# Push to Etsy as Draft (Sub-project 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Mari push a Design to Etsy as a draft listing (fields, photos, variations) from a "Send to Etsy" button on the design page — Sub-project 3 of `docs/superpowers/specs/2026-07-16-etsy-api-integration-design.md`. Builds on sub-project 1 (OAuth connection, merged) and sub-project 2 (maker docs + price suggestion, branch `feat/design-authoring-upgrades`). This branch stacks on top of `feat/design-authoring-upgrades` — it is not based on `main`.

**Architecture:** Same layered pattern as sub-projects 1/2: `types` (zod) → `domain` (`EtsyClient` gains push-related HTTP methods; new `EtsyPushService` orchestrates the push using pure, independently-tested mapper functions; `EtsyConnectionService`/`UserSettingsService` gain small additions) → `handlers`/`routes` → web (`api/endpoints` + a `useEtsyPush`/`useEtsyTaxonomy` hook pair + a push-review dialog + `ViewDesign`/`Settings` wiring). The Etsy wire-format mapping (design → `createDraftListing` body, variants → inventory body, template rendering) lives in pure, unit-tested functions per the spec's Testing section — `EtsyClient`'s job is only to be a thin, tested HTTP wrapper around already-mapped input.

**Tech Stack:** Bun + TypeScript + Hono (api), React + react-query + react-hook-form (web), MongoDB, Zod, bun:test.

## Global Constraints

- `createDraftListing` required fields (verbatim from spec): `quantity, title, description, price, who_made, when_made, taxonomy_id`. Fixed values (spec, sub-project 3 section): `who_made=i_did`, `when_made=made_to_order`, `quantity` from design `totalQuantity` (minimum 1).
- Photos: only product photos (`design.imageIds`) are pushed — `diagramImageIds` are private maker docs and must NEVER be sent to Etsy in any payload. Pushing with zero product photos is allowed (Etsy only requires ≥1 image to *publish*, not to create a draft).
- Variations: Etsy caps at 2 variation properties. If `design.variationGroups.length > 2`, reject the push with a clear error before calling Etsy at all. Mapping (verbatim from spec): variation group name → Etsy property name, option material names → property values, each variant → offering `{ price, quantity, is_enabled }`.
- Re-push is blocked in v1: if a design already has `etsy.listingId` set and `etsy.pushIncomplete` is not `true`, reject with "already on Etsy" — no update/re-push flow exists yet (spec Non-goals).
- Failure/resume model (verbatim from spec): steps are sequential (create listing → upload images → put inventory → persist). On failure after listing creation, the listing id is persisted immediately with `pushIncomplete: true` so a retry can resume: images are only uploaded if Etsy doesn't already have them (checked via `getListingImages`, not blindly re-uploaded), inventory is always safely re-put (Etsy's inventory endpoint is a full overwrite `PUT`, so re-calling it is idempotent by construction). Etsy 4xx error bodies surface verbatim to the caller; no partial design mutation happens beyond the `pushIncomplete` flag.
- Description composition: per-user template (`UserSettings.etsyDescriptionTemplate`, plain text with `{description}`/`{materials}` placeholders) rendered against the design's own `description` and `materials` (material `name`s, comma-joined), editable by the caller before send (the dialog sends the final, possibly-edited string; the API never re-renders it — the template is only ever used to produce the dialog's *initial* value).
- Category: `designType → taxonomy_id` map in user settings (`UserSettings.etsyTaxonomyMap: Record<string, number>`, keyed by the `DesignType` enum's string values). Missing mapping for the design's `designType` (or a design with no `designType` at all) blocks the push with a clear error — there is no fallback category.
- Etsy `x-api-key` header format is colon-joined `<keystring>:<shared_secret>` (same as sub-project 1's `EtsyClient` — reuse `apiKeyHeader()`, do not duplicate the header-building logic).
- All new `EtsyClient` HTTP methods take `accessToken`/`shopId` as explicit parameters (the client stays stateless per-call, matching the existing `getMe(accessToken)`/`getShop(shopId)` methods from sub-project 1) — do not give `EtsyClient` its own notion of "the current user."
- Follow the existing repo's layered pattern exactly (`DesignService`/`UserSettingsService`/`EtsyConnectionService` are the reference shape) — do not introduce a different pattern. `EtsyPushService` is a new, separate domain service (not a method bag bolted onto `DesignService`), constructed from `DesignRepository`, `ImageService`, `EtsyClient`, `EtsyConnectionService`, `UserSettingsService`.
- Tests: `bun:test`, mocks via `mock()`, following `DesignService/index.test.ts`/`EtsyConnectionService/index.test.ts` conventions. Mapper functions (Task 5) are pure and get their own dedicated unit tests with zero mocking.
- Lint/format: `bun run lint` (Biome) must pass on touched files before each commit.
- **Typecheck caveat (carried over from sub-project 2):** `bunx tsc --noEmit` inside `packages/web` (and the repo's CI `bun run tsc --noEmit`) is a silent no-op — the tsconfig is solution-style (`files: []`, no `include`), so it always exits 0 having checked nothing. Use `bunx tsc --build --force` from the repo root for a real check, then `git clean -fd -- packages/` to remove the generated `.d.ts`/`.tsbuildinfo`/`.js` artifacts it leaves behind (do NOT use `-x`, do NOT run `git clean` outside `packages/`). A pre-existing baseline of ~39-41 unrelated errors exists on `main` (react-hook-form version conflicts, a couple of deep-import resolution errors, etc.) — diff against that baseline rather than expecting a clean run. `packages/api` and `packages/types` do NOT have this problem; `bunx tsc --noEmit` works normally there.
- This plan does not implement Status refresh (sub-project 4) or the one-time linking script (sub-project 5) — those are separate plans. It also does not implement re-push/update-after-push (spec Non-goal for v1).

---

## File Structure

```
packages/types/src/design/index.ts                            # + etsy field
packages/types/src/userSettings/index.ts                       # + etsyDescriptionTemplate, etsyTaxonomyMap

packages/api/src/domain/EtsyClient/index.ts                    # + createDraftListing, uploadListingImage, getListingImages, updateListingInventory, getSellerTaxonomyNodes
packages/api/src/domain/EtsyClient/index.test.ts
packages/api/src/domain/EtsyConnectionService/index.ts         # + getPushCredentials
packages/api/src/domain/EtsyConnectionService/index.test.ts
packages/api/src/domain/UserSettingsService/index.ts           # + etsyDescriptionTemplate/etsyTaxonomyMap defaults + upsert
packages/api/src/domain/UserSettingsService/index.test.ts
packages/api/src/domain/EtsyPushService/mappers.ts              # new: pure, unit-tested mapper functions
packages/api/src/domain/EtsyPushService/mappers.test.ts
packages/api/src/domain/EtsyPushService/index.ts                 # new: push orchestration
packages/api/src/domain/EtsyPushService/index.test.ts
packages/api/src/handlers/Etsy/index.ts                         # + pushDesignToEtsy, getEtsyTaxonomy handlers
packages/api/src/handlers/UserSettings/index.ts                  # + etsyDescriptionTemplate/etsyTaxonomyMap in updateUserSettings
packages/api/src/dependencies/types.ts                           # + EtsyPushService token
packages/api/src/dependencies/index.ts                           # + registration
packages/api/src/routes/index.ts                                 # + POST /api/designs/:id/etsy-push, GET /api/etsy/taxonomy
packages/api/src/index.ts                                        # + unique sparse index on etsy.listingId

packages/web/src/api/endpoints.ts                                # + ETSY_PUSH_ENDPOINT-building helper, ETSY_TAXONOMY_ENDPOINT
packages/web/src/api/endpoints/etsyPush/index.ts                  # new
packages/web/src/api/endpoints/etsyTaxonomy/index.ts               # new
packages/web/src/api/endpoints/userSettings/index.ts               # + etsyDescriptionTemplate/etsyTaxonomyMap
packages/web/src/utils/flattenTaxonomyNodes/index.ts                # new pure util
packages/web/src/utils/flattenTaxonomyNodes/index.test.ts
packages/web/src/hooks/useEtsyPush.ts                                # new
packages/web/src/hooks/useEtsyTaxonomy.ts                            # new
packages/web/src/hooks/useUserSettings.ts                            # + etsyDescriptionTemplate/etsyTaxonomyMap
packages/web/src/components/EtsyPushDialog/index.tsx                  # new
packages/web/src/pages/ViewDesign/index.tsx                           # + Etsy chip + "Send to Etsy" button + dialog
packages/web/src/pages/Settings/index.tsx                             # + Etsy description template + taxonomy map sections
```

---

### Task 1: Types — `Design.etsy` + `UserSettings` Etsy fields

**Files:**
- Modify: `packages/types/src/design/index.ts`
- Modify: `packages/types/src/userSettings/index.ts`

**Interfaces:**
- Produces: `Design.etsy?: { listingId: number; state: 'draft' | 'active' | 'inactive'; lastPushedAt: number | null; pushIncomplete?: boolean }`, `UserSettings.etsyDescriptionTemplate: string`, `UserSettings.etsyTaxonomyMap: Record<string, number>` — consumed by every later task in this plan.

- [ ] **Step 1: Add `etsy` to `designSchema`**

In `packages/types/src/design/index.ts`, add the schema (after `designType`) and its type export:

```typescript
export const etsyListingStateSchema = z.enum(['draft', 'active', 'inactive']);
export type EtsyListingState = z.infer<typeof etsyListingStateSchema>;

export const designEtsySchema = z.object({
    listingId: z.number(),
    state: etsyListingStateSchema,
    lastPushedAt: z.number().nullable(),
    pushIncomplete: z.boolean().optional(),
});
export type DesignEtsy = z.infer<typeof designEtsySchema>;
```

Then add the field to `designSchema`'s `z.object({...})`, after `designType: z.nativeEnum(DesignType).optional(),`:

```typescript
    designType: z.nativeEnum(DesignType).optional(),
    etsy: designEtsySchema.optional(),
```

- [ ] **Step 2: Add fields to `userSettingsSchema`**

In `packages/types/src/userSettings/index.ts`, replace the file in full:

```typescript
import { z } from 'zod';

export const userSettingsSchema = z.object({
    userId: z.string(),
    hourlyWage: z.number().nonnegative(),
    profitMargin: z.number().nonnegative(),
    markupMultiplier: z.number().nonnegative(),
    hourlyRate: z.number().nonnegative(),
    etsyDescriptionTemplate: z.string(),
    etsyTaxonomyMap: z.record(z.string(), z.number()),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;
```

- [ ] **Step 3: Typecheck**

Run: `cd packages/types && bunx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/design/index.ts packages/types/src/userSettings/index.ts
git commit -m "feat(types): add Design.etsy and UserSettings Etsy push fields"
```

---

### Task 2: API — `EtsyClient` push-related HTTP methods

**Files:**
- Modify: `packages/api/src/domain/EtsyClient/index.ts`
- Modify: `packages/api/src/domain/EtsyClient/index.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (this is the same file sub-project 1 created; this task only adds methods to the existing `EtsyClient` class).
- Produces (all new, added to the existing `EtsyClient` class from sub-project 1 — do not remove or modify `buildAuthorizationUrl`/`exchangeCodeForToken`/`refreshAccessToken`/`getMe`/`getShop`):
  - `interface EtsyDraftListingInput { title: string; description: string; price: number; quantity: number; whoMade: string; whenMade: string; taxonomyId: number }`
  - `interface EtsyListingResult { listingId: number }`
  - `createDraftListing(accessToken: string, shopId: number, input: EtsyDraftListingInput): Promise<EtsyListingResult>`
  - `uploadListingImage(accessToken: string, shopId: number, listingId: number, image: { buffer: Buffer; contentType: string; filename: string }, rank: number): Promise<void>`
  - `getListingImages(accessToken: string, listingId: number): Promise<{ imageIds: number[] }>`
  - `interface EtsyInventoryProduct { propertyValues: Array<{ propertyName: string; values: string[] }>; offering: { price: number; quantity: number; isEnabled: boolean } }`
  - `updateListingInventory(accessToken: string, listingId: number, products: EtsyInventoryProduct[]): Promise<void>`
  - `interface EtsyTaxonomyNode { id: number; name: string; children: EtsyTaxonomyNode[] }`
  - `getSellerTaxonomyNodes(): Promise<EtsyTaxonomyNode[]>`
  - consumed by `EtsyPushService` (Tasks 5/6) and `handlers/Etsy` (Task 7).

- [ ] **Step 1: Write the failing tests**

Add to `packages/api/src/domain/EtsyClient/index.test.ts`, inside the existing `describe('EtsyClient', ...)` block (it already has a `beforeEach` that constructs `client = new EtsyClient('key123', 'secret456')` and mocks `globalThis.fetch` — reuse that setup, add these as sibling `describe`s to the existing `buildAuthorizationUrl`/`exchangeCodeForToken`/`refreshAccessToken` blocks):

```typescript
    describe('createDraftListing', () => {
        it('posts the mapped body to the shop listings endpoint and maps the response', async () => {
            fetchMock.mockResolvedValue(new Response(JSON.stringify({ listing_id: 999 }), { status: 200 }));

            const result = await client.createDraftListing('at-token', 47408839, {
                title: 'Silver Ring',
                description: 'A lovely ring.',
                price: 25.5,
                quantity: 3,
                whoMade: 'i_did',
                whenMade: 'made_to_order',
                taxonomyId: 1234,
            });

            expect(result).toEqual({ listingId: 999 });

            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/shops/47408839/listings');
            expect(options.method).toBe('POST');
            expect((options.headers as Record<string, string>)['x-api-key']).toBe('key123:secret456');
            expect((options.headers as Record<string, string>).Authorization).toBe('Bearer at-token');
            expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json');
            const body = JSON.parse(options.body as string);
            expect(body).toEqual({
                quantity: 3,
                title: 'Silver Ring',
                description: 'A lovely ring.',
                price: 25.5,
                who_made: 'i_did',
                when_made: 'made_to_order',
                taxonomy_id: 1234,
            });
        });

        it('throws when Etsy responds with an error status', async () => {
            fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'bad taxonomy' }), { status: 400 }));

            await expect(
                client.createDraftListing('at', 1, {
                    title: 't',
                    description: 'd',
                    price: 1,
                    quantity: 1,
                    whoMade: 'i_did',
                    whenMade: 'made_to_order',
                    taxonomyId: 1,
                })
            ).rejects.toThrow();
        });
    });

    describe('uploadListingImage', () => {
        it('posts a multipart form with the image and rank', async () => {
            fetchMock.mockResolvedValue(new Response(JSON.stringify({ listing_image_id: 1 }), { status: 200 }));

            await client.uploadListingImage(
                'at-token',
                47408839,
                999,
                { buffer: Buffer.from('fake-image-bytes'), contentType: 'image/png', filename: 'photo.png' },
                1
            );

            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/shops/47408839/listings/999/images');
            expect(options.method).toBe('POST');
            expect((options.headers as Record<string, string>)['x-api-key']).toBe('key123:secret456');
            expect((options.headers as Record<string, string>).Authorization).toBe('Bearer at-token');
            expect(options.body).toBeInstanceOf(FormData);
            const form = options.body as FormData;
            expect(form.get('rank')).toBe('1');
            expect(form.get('image')).toBeInstanceOf(Blob);
        });

        it('throws when Etsy responds with an error status', async () => {
            fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));

            await expect(
                client.uploadListingImage(
                    'at',
                    1,
                    1,
                    { buffer: Buffer.from('x'), contentType: 'image/png', filename: 'x.png' },
                    0
                )
            ).rejects.toThrow();
        });
    });

    describe('getListingImages', () => {
        it('fetches and maps the listing image ids', async () => {
            fetchMock.mockResolvedValue(
                new Response(
                    JSON.stringify({ results: [{ listing_image_id: 111 }, { listing_image_id: 222 }] }),
                    { status: 200 }
                )
            );

            const result = await client.getListingImages('at-token', 999);

            expect(result).toEqual({ imageIds: [111, 222] });
            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/listings/999/images');
            expect((options.headers as Record<string, string>).Authorization).toBe('Bearer at-token');
        });
    });

    describe('updateListingInventory', () => {
        it('maps property values and offerings into the Etsy inventory body', async () => {
            fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

            await client.updateListingInventory('at-token', 999, [
                {
                    propertyValues: [{ propertyName: 'Colour', values: ['Silver'] }],
                    offering: { price: 25.5, quantity: 3, isEnabled: true },
                },
            ]);

            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/listings/999/inventory');
            expect(options.method).toBe('PUT');
            const body = JSON.parse(options.body as string);
            expect(body).toEqual({
                products: [
                    {
                        property_values: [{ property_id: null, property_name: 'Colour', values: ['Silver'] }],
                        offerings: [{ price: 25.5, quantity: 3, is_enabled: true }],
                    },
                ],
            });
        });

        it('throws when Etsy responds with an error status', async () => {
            fetchMock.mockResolvedValue(new Response('nope', { status: 400 }));

            await expect(client.updateListingInventory('at', 1, [])).rejects.toThrow();
        });
    });

    describe('getSellerTaxonomyNodes', () => {
        it('fetches and maps the nested taxonomy tree', async () => {
            fetchMock.mockResolvedValue(
                new Response(
                    JSON.stringify({
                        results: [
                            {
                                id: 1,
                                name: 'Jewelry',
                                children: [{ id: 2, name: 'Rings', children: [] }],
                            },
                        ],
                    }),
                    { status: 200 }
                )
            );

            const result = await client.getSellerTaxonomyNodes();

            expect(result).toEqual([
                { id: 1, name: 'Jewelry', children: [{ id: 2, name: 'Rings', children: [] }] },
            ]);
            const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://api.etsy.com/v3/application/seller-taxonomy/nodes');
            expect((options.headers as Record<string, string>)['x-api-key']).toBe('key123:secret456');
        });
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/EtsyClient/index.test.ts`
Expected: FAIL — the new methods don't exist yet (TypeScript compile error / `client.createDraftListing is not a function`, etc.)

- [ ] **Step 3: Implement the new methods**

In `packages/api/src/domain/EtsyClient/index.ts`, add these exported interfaces above the `EtsyClient` class (alongside the existing `EtsyTokenResponse`):

```typescript
export interface EtsyDraftListingInput {
    title: string;
    description: string;
    price: number;
    quantity: number;
    whoMade: string;
    whenMade: string;
    taxonomyId: number;
}

export interface EtsyListingResult {
    listingId: number;
}

export interface EtsyInventoryProduct {
    propertyValues: Array<{ propertyName: string; values: string[] }>;
    offering: { price: number; quantity: number; isEnabled: boolean };
}

export interface EtsyTaxonomyNode {
    id: number;
    name: string;
    children: EtsyTaxonomyNode[];
}
```

Then add these methods inside the `EtsyClient` class (after `getShop`, before the closing `}`):

```typescript
    async createDraftListing(
        accessToken: string,
        shopId: number,
        input: EtsyDraftListingInput
    ): Promise<EtsyListingResult> {
        const response = await fetch(`${API_BASE}/shops/${shopId}/listings`, {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKeyHeader(),
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                quantity: input.quantity,
                title: input.title,
                description: input.description,
                price: input.price,
                who_made: input.whoMade,
                when_made: input.whenMade,
                taxonomy_id: input.taxonomyId,
            }),
        });

        if (!response.ok) {
            throw new Error(`Etsy createDraftListing failed: ${response.status} ${await response.text()}`);
        }

        const body = (await response.json()) as { listing_id: number };
        return { listingId: body.listing_id };
    }

    async uploadListingImage(
        accessToken: string,
        shopId: number,
        listingId: number,
        image: { buffer: Buffer; contentType: string; filename: string },
        rank: number
    ): Promise<void> {
        const form = new FormData();
        form.append('image', new Blob([image.buffer], { type: image.contentType }), image.filename);
        form.append('rank', String(rank));

        const response = await fetch(`${API_BASE}/shops/${shopId}/listings/${listingId}/images`, {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKeyHeader(),
                Authorization: `Bearer ${accessToken}`,
            },
            body: form,
        });

        if (!response.ok) {
            throw new Error(`Etsy uploadListingImage failed: ${response.status} ${await response.text()}`);
        }
    }

    async getListingImages(accessToken: string, listingId: number): Promise<{ imageIds: number[] }> {
        const response = await fetch(`${API_BASE}/listings/${listingId}/images`, {
            headers: { 'x-api-key': this.apiKeyHeader(), Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new Error(`Etsy getListingImages failed: ${response.status} ${await response.text()}`);
        }

        const body = (await response.json()) as { results: Array<{ listing_image_id: number }> };
        return { imageIds: body.results.map((r) => r.listing_image_id) };
    }

    async updateListingInventory(
        accessToken: string,
        listingId: number,
        products: EtsyInventoryProduct[]
    ): Promise<void> {
        const response = await fetch(`${API_BASE}/listings/${listingId}/inventory`, {
            method: 'PUT',
            headers: {
                'x-api-key': this.apiKeyHeader(),
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                products: products.map((p) => ({
                    property_values: p.propertyValues.map((pv) => ({
                        property_id: null,
                        property_name: pv.propertyName,
                        values: pv.values,
                    })),
                    offerings: [
                        {
                            price: p.offering.price,
                            quantity: p.offering.quantity,
                            is_enabled: p.offering.isEnabled,
                        },
                    ],
                })),
            }),
        });

        if (!response.ok) {
            throw new Error(`Etsy updateListingInventory failed: ${response.status} ${await response.text()}`);
        }
    }

    async getSellerTaxonomyNodes(): Promise<EtsyTaxonomyNode[]> {
        const response = await fetch(`${API_BASE}/seller-taxonomy/nodes`, {
            headers: { 'x-api-key': this.apiKeyHeader() },
        });

        if (!response.ok) {
            throw new Error(`Etsy getSellerTaxonomyNodes failed: ${response.status} ${await response.text()}`);
        }

        const body = (await response.json()) as {
            results: Array<{ id: number; name: string; children?: unknown[] }>;
        };

        const mapNode = (n: { id: number; name: string; children?: unknown[] }): EtsyTaxonomyNode => ({
            id: n.id,
            name: n.name,
            children: ((n.children ?? []) as Array<{ id: number; name: string; children?: unknown[] }>).map(mapNode),
        });

        return body.results.map(mapNode);
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/EtsyClient/index.test.ts`
Expected: PASS (including all pre-existing `EtsyClient`/PKCE tests from sub-project 1 — unaffected, this task is purely additive)

- [ ] **Step 5: Run the full api test suite**

Run: `cd packages/api && bun test`
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/domain/EtsyClient/index.ts packages/api/src/domain/EtsyClient/index.test.ts
git commit -m "feat(api): add Etsy listing/inventory/taxonomy HTTP methods to EtsyClient"
```

---

### Task 3: API — `EtsyConnectionService.getPushCredentials`

**Files:**
- Modify: `packages/api/src/domain/EtsyConnectionService/index.ts`
- Modify: `packages/api/src/domain/EtsyConnectionService/index.test.ts`

**Interfaces:**
- Consumes: `EtsyConnectionRepository.getByUserId` (existing), `this.getValidAccessToken` (existing, sub-project 1 — do not modify its behavior).
- Produces: `EtsyConnectionService.getPushCredentials(userId: string): Promise<{ accessToken: string; shopId: number }>` — consumed by `EtsyPushService` (Task 6).

- [ ] **Step 1: Write the failing test**

Add to `packages/api/src/domain/EtsyConnectionService/index.test.ts`, inside the existing `describe('EtsyConnectionService', ...)` block, as a sibling to the existing `describe('getValidAccessToken', ...)` block (reuse the file's existing `mockConnectionRepo`/`mockEtsyClient`/`makeConnection` helper — read the file first to confirm their exact shape before writing):

```typescript
    describe('getPushCredentials', () => {
        it('returns the valid access token together with the stored shopId', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(
                makeConnection({ accessToken: 'still-fresh', accessTokenExpiresAt: Date.now() + 120_000, shopId: 47408839 })
            );

            const result = await service.getPushCredentials('user-1');

            expect(result).toEqual({ accessToken: 'still-fresh', shopId: 47408839 });
            expect(mockEtsyClient.refreshAccessToken).not.toHaveBeenCalled();
        });

        it('throws when there is no connection', async () => {
            mockConnectionRepo.getByUserId.mockResolvedValue(null);

            await expect(service.getPushCredentials('user-1')).rejects.toThrow();
        });
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/EtsyConnectionService/index.test.ts`
Expected: FAIL — `service.getPushCredentials is not a function`

- [ ] **Step 3: Implement**

In `packages/api/src/domain/EtsyConnectionService/index.ts`, remove the `// fallow-ignore-next-line unused-class-member` comment directly above `getValidAccessToken` (it now has a real consumer being added in this task's own file — `getPushCredentials` calls it — so the dead-code suppression is no longer needed), and add this new method directly after `getValidAccessToken`:

```typescript
    async getPushCredentials(userId: string): Promise<{ accessToken: string; shopId: number }> {
        const accessToken = await this.getValidAccessToken(userId);
        const connection = await this.connectionRepo.getByUserId(userId);
        if (!connection) {
            throw new APIError('Etsy is not connected', 400);
        }
        return { accessToken, shopId: connection.shopId };
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
git commit -m "feat(api): add getPushCredentials to EtsyConnectionService"
```

---

### Task 4: API — `UserSettingsService` Etsy template/taxonomy fields

**Files:**
- Modify: `packages/api/src/domain/UserSettingsService/index.ts`
- Modify: `packages/api/src/domain/UserSettingsService/index.test.ts`
- Modify: `packages/api/src/handlers/UserSettings/index.ts`

**Interfaces:**
- Consumes: `UserSettings.etsyDescriptionTemplate`/`etsyTaxonomyMap` (Task 1).
- Produces: `UserSettingsService.get(userId)` now also returns `etsyDescriptionTemplate`/`etsyTaxonomyMap` with defaults `''`/`{}` when unset; `UserSettingsService.upsert(userId, { ..., etsyDescriptionTemplate, etsyTaxonomyMap })`.

- [ ] **Step 1: Write the failing tests**

Add to `packages/api/src/domain/UserSettingsService/index.test.ts`, inside the existing `describe('get', ...)` and `describe('upsert — price suggestion fields', ...)` blocks (read the file first — it was created in sub-project 2 mirroring `DesignService/index.test.ts`'s mock style):

```typescript
describe('get — etsy fields', () => {
    it('returns empty-string template and empty taxonomy map defaults when no settings stored', async () => {
        mockSettingsRepo.getByUserId.mockResolvedValue(null);

        const result = await service.get('user-1');

        expect(result.etsyDescriptionTemplate).toBe('');
        expect(result.etsyTaxonomyMap).toEqual({});
    });

    it('returns stored etsyDescriptionTemplate and etsyTaxonomyMap when present', async () => {
        mockSettingsRepo.getByUserId.mockResolvedValue({
            userId: 'user-1',
            hourlyWage: 10,
            profitMargin: 15,
            markupMultiplier: 2.5,
            hourlyRate: 0,
            etsyDescriptionTemplate: '{description}\n\nMaterials: {materials}',
            etsyTaxonomyMap: { RING: 1234 },
        });

        const result = await service.get('user-1');

        expect(result.etsyDescriptionTemplate).toBe('{description}\n\nMaterials: {materials}');
        expect(result.etsyTaxonomyMap).toEqual({ RING: 1234 });
    });

    it('backfills defaults for a stored document that predates this migration (missing the new fields entirely)', async () => {
        mockSettingsRepo.getByUserId.mockResolvedValue({
            userId: 'user-1',
            hourlyWage: 10,
            profitMargin: 15,
            // no markupMultiplier/hourlyRate/etsyDescriptionTemplate/etsyTaxonomyMap — simulates a
            // pre-sub-project-2 document that Mongo happily stored without the newer required fields
        } as any);

        const result = await service.get('user-1');

        expect(result.markupMultiplier).toBe(2.5);
        expect(result.hourlyRate).toBe(0);
        expect(result.etsyDescriptionTemplate).toBe('');
        expect(result.etsyTaxonomyMap).toEqual({});
        expect(result.hourlyWage).toBe(10);
        expect(result.profitMargin).toBe(15);
    });
});

describe('upsert — etsy fields', () => {
    it('persists etsyDescriptionTemplate and etsyTaxonomyMap alongside the existing fields', async () => {
        const result = await service.upsert('user-1', {
            hourlyWage: 12,
            profitMargin: 20,
            markupMultiplier: 2,
            hourlyRate: 8,
            etsyDescriptionTemplate: 'Handmade: {description}',
            etsyTaxonomyMap: { EARRINGS: 5678 },
        });

        expect(result).toEqual({
            userId: 'user-1',
            hourlyWage: 12,
            profitMargin: 20,
            markupMultiplier: 2,
            hourlyRate: 8,
            etsyDescriptionTemplate: 'Handmade: {description}',
            etsyTaxonomyMap: { EARRINGS: 5678 },
        });
        expect(mockSettingsRepo.upsert).toHaveBeenCalledWith(result);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/UserSettingsService/index.test.ts`
Expected: FAIL — `etsyDescriptionTemplate`/`etsyTaxonomyMap` undefined, or wrong-arity `upsert` call

- [ ] **Step 3: Update `UserSettingsService`**

In `packages/api/src/domain/UserSettingsService/index.ts`, add the two new default constants near the top (alongside `DEFAULT_MARKUP_MULTIPLIER`/`DEFAULT_HOURLY_RATE`):

```typescript
const DEFAULT_ETSY_DESCRIPTION_TEMPLATE = '';
const DEFAULT_ETSY_TAXONOMY_MAP: Record<string, number> = {};
```

Update the `get` method to defensively merge defaults under whatever was actually stored, rather than returning `stored` as-is. This fixes a latent bug that predates this task: Mongo doesn't enforce the Zod schema at rest, so a settings document persisted before this migration (or before sub-project 2's `markupMultiplier`/`hourlyRate` migration) is missing the newer fields entirely — the old `stored ?? { ...defaults }` pattern returned that partial document unchanged, so `etsyTaxonomyMap`/`etsyDescriptionTemplate` (and previously `markupMultiplier`/`hourlyRate`) would be `undefined` at runtime despite the TS type claiming they're always present, silently producing `NaN`/crashes downstream. Spread defaults first, then the stored partial document on top, so any field genuinely present in storage still wins:

```typescript
    async get(userId: string): Promise<UserSettings> {
        const stored = await this.settingsRepo.getByUserId(userId);
        const defaults: UserSettings = {
            userId,
            hourlyWage: DEFAULT_HOURLY_WAGE,
            profitMargin: DEFAULT_PROFIT_MARGIN,
            markupMultiplier: DEFAULT_MARKUP_MULTIPLIER,
            hourlyRate: DEFAULT_HOURLY_RATE,
            etsyDescriptionTemplate: DEFAULT_ETSY_DESCRIPTION_TEMPLATE,
            etsyTaxonomyMap: DEFAULT_ETSY_TAXONOMY_MAP,
        };
        return { ...defaults, ...stored };
    }
```

Update `upsert`'s parameter type and body:

```typescript
    async upsert(
        userId: string,
        updates: {
            hourlyWage: number;
            profitMargin: number;
            markupMultiplier: number;
            hourlyRate: number;
            etsyDescriptionTemplate: string;
            etsyTaxonomyMap: Record<string, number>;
        }
    ): Promise<UserSettings> {
        const settings: UserSettings = { userId, ...updates };
        await this.settingsRepo.upsert(settings);
        return settings;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/UserSettingsService/index.test.ts`
Expected: PASS

- [ ] **Step 5: Update the `updateUserSettings` handler**

In `packages/api/src/handlers/UserSettings/index.ts`, replace `updateUserSettings`:

```typescript
export const updateUserSettings = async (c: Ctx) => {
    const { hourlyWage, profitMargin, markupMultiplier, hourlyRate, etsyDescriptionTemplate, etsyTaxonomyMap } =
        (await c.req.json()) as {
            hourlyWage?: number;
            profitMargin?: number;
            markupMultiplier?: number;
            hourlyRate?: number;
            etsyDescriptionTemplate?: string;
            etsyTaxonomyMap?: Record<string, number>;
        };

    if (
        hourlyWage === undefined ||
        profitMargin === undefined ||
        markupMultiplier === undefined ||
        hourlyRate === undefined ||
        etsyDescriptionTemplate === undefined ||
        etsyTaxonomyMap === undefined
    ) {
        throw new APIError(
            'hourlyWage, profitMargin, markupMultiplier, hourlyRate, etsyDescriptionTemplate and etsyTaxonomyMap are required',
            400
        );
    }

    return c.json(
        await getService().upsert(c.get('userId'), {
            hourlyWage: Number(hourlyWage),
            profitMargin: Number(profitMargin),
            markupMultiplier: Number(markupMultiplier),
            hourlyRate: Number(hourlyRate),
            etsyDescriptionTemplate,
            etsyTaxonomyMap,
        })
    );
};
```

- [ ] **Step 6: Run the full api test suite**

Run: `cd packages/api && bun test`
Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/domain/UserSettingsService packages/api/src/handlers/UserSettings/index.ts
git commit -m "feat(api): add etsyDescriptionTemplate and etsyTaxonomyMap to user settings"
```

---

### Task 5: API — `EtsyPushService` pure mappers

**Files:**
- Create: `packages/api/src/domain/EtsyPushService/mappers.ts`
- Create: `packages/api/src/domain/EtsyPushService/mappers.test.ts`

**Interfaces:**
- Consumes: `Design`, `VariationGroup`, `DesignVariant`, `RequiredMaterial` (existing, `@jewellery-catalogue/types`), `EtsyDraftListingInput`, `EtsyInventoryProduct` (Task 2).
- Produces:
  - `renderDescriptionTemplate(template: string, design: { description: string; materials: RequiredMaterial[] }): string`
  - `buildDraftListingInput(args: { design: Pick<Design, 'name' | 'price' | 'totalQuantity'>; description: string; price: number; taxonomyId: number }): EtsyDraftListingInput`
  - `buildInventoryProducts(variants: DesignVariant[], groups: VariationGroup[]): EtsyInventoryProduct[]`
  - all consumed by `EtsyPushService` (Task 6).

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/api/src/domain/EtsyPushService/mappers.test.ts
import { describe, expect, it } from 'bun:test';
import type { DesignVariant, RequiredMaterial, VariationGroup } from '@jewellery-catalogue/types';

import { buildDraftListingInput, buildInventoryProducts, renderDescriptionTemplate } from './mappers';

const material = (name: string): RequiredMaterial =>
    ({ id: `mat-${name}`, name, type: 'BEAD', requiredQuantity: 1 }) as unknown as RequiredMaterial;

describe('renderDescriptionTemplate', () => {
    it('substitutes {description} and {materials} placeholders', () => {
        const result = renderDescriptionTemplate('{description}\n\nMaterials: {materials}', {
            description: 'A lovely ring.',
            materials: [material('Silver wire'), material('Moonstone bead')],
        });

        expect(result).toBe('A lovely ring.\n\nMaterials: Silver wire, Moonstone bead');
    });

    it('handles a template with no placeholders unchanged', () => {
        const result = renderDescriptionTemplate('Static text only', { description: 'ignored', materials: [] });
        expect(result).toBe('Static text only');
    });

    it('handles an empty materials list', () => {
        const result = renderDescriptionTemplate('{description} ({materials})', {
            description: 'A ring.',
            materials: [],
        });
        expect(result).toBe('A ring. ()');
    });
});

describe('buildDraftListingInput', () => {
    it('maps design + resolved fields into the fixed-field Etsy draft listing shape', () => {
        const result = buildDraftListingInput({
            design: { name: 'Silver Ring', price: 25.5, totalQuantity: 3 },
            description: 'A lovely ring.',
            price: 25.5,
            taxonomyId: 1234,
        });

        expect(result).toEqual({
            title: 'Silver Ring',
            description: 'A lovely ring.',
            price: 25.5,
            quantity: 3,
            whoMade: 'i_did',
            whenMade: 'made_to_order',
            taxonomyId: 1234,
        });
    });

    it('floors quantity at 1 when totalQuantity is 0', () => {
        const result = buildDraftListingInput({
            design: { name: 'Ring', price: 10, totalQuantity: 0 },
            description: 'd',
            price: 10,
            taxonomyId: 1,
        });

        expect(result.quantity).toBe(1);
    });
});

describe('buildInventoryProducts', () => {
    it('maps each variant to a product with one property value per group and one offering', () => {
        const groups: VariationGroup[] = [
            {
                id: 'group-1',
                name: 'Colour',
                required: 1,
                options: [
                    { id: 'opt-silver', material: material('Silver') },
                    { id: 'opt-gold', material: material('Gold') },
                ],
            },
        ];
        const variants: DesignVariant[] = [
            {
                id: 'variant-1',
                optionIds: ['opt-silver'],
                name: 'Silver',
                totalQuantity: 5,
                totalMaterialCosts: 3,
                price: 20,
            },
            {
                id: 'variant-2',
                optionIds: ['opt-gold'],
                name: 'Gold',
                totalQuantity: 2,
                totalMaterialCosts: 4,
                price: 30,
            },
        ];

        const result = buildInventoryProducts(variants, groups);

        expect(result).toEqual([
            {
                propertyValues: [{ propertyName: 'Colour', values: ['Silver'] }],
                offering: { price: 20, quantity: 5, isEnabled: true },
            },
            {
                propertyValues: [{ propertyName: 'Colour', values: ['Gold'] }],
                offering: { price: 30, quantity: 2, isEnabled: true },
            },
        ]);
    });

    it('maps a variant spanning two groups to two property values', () => {
        const groups: VariationGroup[] = [
            {
                id: 'group-1',
                name: 'Colour',
                required: 1,
                options: [{ id: 'opt-silver', material: material('Silver') }],
            },
            {
                id: 'group-2',
                name: 'Size',
                required: 1,
                options: [{ id: 'opt-small', material: material('Small') }],
            },
        ];
        const variants: DesignVariant[] = [
            {
                id: 'variant-1',
                optionIds: ['opt-silver', 'opt-small'],
                name: 'Silver / Small',
                totalQuantity: 1,
                totalMaterialCosts: 3,
                price: 20,
            },
        ];

        const result = buildInventoryProducts(variants, groups);

        expect(result).toEqual([
            {
                propertyValues: [
                    { propertyName: 'Colour', values: ['Silver'] },
                    { propertyName: 'Size', values: ['Small'] },
                ],
                offering: { price: 20, quantity: 1, isEnabled: true },
            },
        ]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/EtsyPushService/mappers.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// packages/api/src/domain/EtsyPushService/mappers.ts
import type { Design, DesignVariant, RequiredMaterial, VariationGroup } from '@jewellery-catalogue/types';

import type { EtsyDraftListingInput, EtsyInventoryProduct } from '../EtsyClient';

export const renderDescriptionTemplate = (
    template: string,
    design: { description: string; materials: RequiredMaterial[] }
): string => {
    const materialsList = design.materials.map((m) => m.name).join(', ');
    return template.replace(/\{description\}/g, design.description).replace(/\{materials\}/g, materialsList);
};

export const buildDraftListingInput = (args: {
    design: Pick<Design, 'name' | 'price' | 'totalQuantity'>;
    description: string;
    price: number;
    taxonomyId: number;
}): EtsyDraftListingInput => ({
    title: args.design.name,
    description: args.description,
    price: args.price,
    quantity: Math.max(1, args.design.totalQuantity),
    whoMade: 'i_did',
    whenMade: 'made_to_order',
    taxonomyId: args.taxonomyId,
});

export const buildInventoryProducts = (
    variants: DesignVariant[],
    groups: VariationGroup[]
): EtsyInventoryProduct[] =>
    variants.map((variant) => {
        const propertyValues = groups
            .map((group) => {
                const option = group.options.find((o) => variant.optionIds.includes(o.id));
                return option ? { propertyName: group.name, values: [option.material.name] } : null;
            })
            .filter((pv): pv is { propertyName: string; values: string[] } => pv !== null);

        return {
            propertyValues,
            offering: { price: variant.price, quantity: variant.totalQuantity, isEnabled: true },
        };
    });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/EtsyPushService/mappers.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/EtsyPushService/mappers.ts packages/api/src/domain/EtsyPushService/mappers.test.ts
git commit -m "feat(api): add pure Etsy push payload mappers"
```

---

### Task 6: API — `EtsyPushService` orchestration

**Files:**
- Create: `packages/api/src/domain/EtsyPushService/index.ts`
- Create: `packages/api/src/domain/EtsyPushService/index.test.ts`

**Interfaces:**
- Consumes: `DesignRepository` (existing, `getByIdAndUserId`/`update`), `ImageService` (existing, `getImage`), `EtsyClient` (Task 2), `EtsyConnectionService.getPushCredentials` (Task 3), `UserSettingsService.get` (Task 4), `renderDescriptionTemplate`/`buildDraftListingInput`/`buildInventoryProducts` (Task 5).
- Produces: `class EtsyPushService { constructor(designRepo, imageService, etsyClient, etsyConnectionService, userSettingsService); push(designId: string, userId: string, overrides?: { description?: string; price?: number }): Promise<Design> }` — consumed by `handlers/Etsy` (Task 7).

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/api/src/domain/EtsyPushService/index.test.ts
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { Design } from '@jewellery-catalogue/types';
import { Readable } from 'node:stream';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import type { ImageService } from '../ImageService';
import type { UserSettingsService } from '../UserSettingsService';
import { EtsyPushService } from './index';

const mockDesignRepo = { getByIdAndUserId: mock(), update: mock() };
const mockImageService = { getImage: mock(), uploadImage: mock() };
const mockEtsyClient = {
    createDraftListing: mock(),
    uploadListingImage: mock(),
    getListingImages: mock(),
    updateListingInventory: mock(),
    getSellerTaxonomyNodes: mock(),
};
const mockEtsyConnectionService = { getPushCredentials: mock() };
const mockUserSettingsService = { get: mock() };

function makeDesign(overrides: Partial<Design> = {}): Design {
    return {
        id: 'design-1',
        userId: 'user-1',
        name: 'Silver Ring',
        description: 'A lovely ring.',
        timeRequired: '01:00',
        materials: [],
        imageIds: ['img-1'],
        diagramImageIds: ['diagram-1'],
        makingNotes: 'private notes',
        price: 25,
        totalMaterialCosts: 10,
        dateAdded: new Date(),
        totalQuantity: 2,
        designType: 'RING' as Design['designType'],
        ...overrides,
    };
}

describe('EtsyPushService', () => {
    let service: EtsyPushService;

    beforeEach(() => {
        [
            ...Object.values(mockDesignRepo),
            ...Object.values(mockImageService),
            ...Object.values(mockEtsyClient),
            ...Object.values(mockEtsyConnectionService),
            ...Object.values(mockUserSettingsService),
        ].forEach((m) => m.mockClear());

        service = new EtsyPushService(
            mockDesignRepo as unknown as DesignRepository,
            mockImageService as unknown as ImageService,
            mockEtsyClient as unknown as EtsyClient,
            mockEtsyConnectionService as unknown as EtsyConnectionService,
            mockUserSettingsService as unknown as UserSettingsService
        );

        mockEtsyConnectionService.getPushCredentials.mockResolvedValue({
            accessToken: 'at-token',
            shopId: 47408839,
        });
        mockUserSettingsService.get.mockResolvedValue({
            userId: 'user-1',
            hourlyWage: 10,
            profitMargin: 15,
            markupMultiplier: 2.5,
            hourlyRate: 0,
            etsyDescriptionTemplate: '{description}',
            etsyTaxonomyMap: { RING: 1234 },
        });
        mockImageService.getImage.mockResolvedValue({
            stream: Readable.from([Buffer.from('fake-image-bytes')]),
            contentType: 'image/png',
            cacheControl: 'public',
        });
        mockEtsyClient.getListingImages.mockResolvedValue({ imageIds: [] });
    });

    describe('push — new listing (no prior etsy.listingId)', () => {
        it('creates the listing, uploads only product photos (never diagram images), and persists the etsy block', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign());
            mockEtsyClient.createDraftListing.mockResolvedValue({ listingId: 999 });

            const result = await service.push('design-1', 'user-1');

            expect(mockEtsyClient.createDraftListing).toHaveBeenCalledWith(
                'at-token',
                47408839,
                expect.objectContaining({ title: 'Silver Ring', taxonomyId: 1234, quantity: 2 })
            );

            expect(mockImageService.getImage).toHaveBeenCalledTimes(1);
            expect(mockImageService.getImage).toHaveBeenCalledWith('img-1');
            expect(mockImageService.getImage).not.toHaveBeenCalledWith('diagram-1');
            expect(mockEtsyClient.uploadListingImage).toHaveBeenCalledTimes(1);

            expect(mockEtsyClient.updateListingInventory).not.toHaveBeenCalled();

            expect(result.etsy).toEqual({ listingId: 999, state: 'draft', lastPushedAt: expect.any(Number), pushIncomplete: false });

            const lastUpdateCall = mockDesignRepo.update.mock.calls.at(-1) as [string, Design];
            expect(lastUpdateCall[1].etsy?.pushIncomplete).toBe(false);
        });

        it('rejects when the design has more than 2 variation groups, before calling Etsy at all', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(
                makeDesign({
                    variationGroups: [
                        { id: 'g1', name: 'A', required: 1, options: [] },
                        { id: 'g2', name: 'B', required: 1, options: [] },
                        { id: 'g3', name: 'C', required: 1, options: [] },
                    ],
                })
            );

            await expect(service.push('design-1', 'user-1')).rejects.toThrow();
            expect(mockEtsyClient.createDraftListing).not.toHaveBeenCalled();
        });

        it('rejects when there is no taxonomy mapping for the design type', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign({ designType: 'NECKLACE' as Design['designType'] }));

            await expect(service.push('design-1', 'user-1')).rejects.toThrow();
            expect(mockEtsyClient.createDraftListing).not.toHaveBeenCalled();
        });

        it('rejects re-push when the design already has a completed etsy.listingId', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(
                makeDesign({ etsy: { listingId: 555, state: 'draft', lastPushedAt: Date.now(), pushIncomplete: false } })
            );

            await expect(service.push('design-1', 'user-1')).rejects.toThrow();
            expect(mockEtsyClient.createDraftListing).not.toHaveBeenCalled();
        });

        it('uses the provided description/price overrides instead of re-rendering the template', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign());
            mockEtsyClient.createDraftListing.mockResolvedValue({ listingId: 999 });

            await service.push('design-1', 'user-1', { description: 'Edited by hand', price: 30 });

            expect(mockEtsyClient.createDraftListing).toHaveBeenCalledWith(
                'at-token',
                47408839,
                expect.objectContaining({ description: 'Edited by hand', price: 30 })
            );
        });
    });

    describe('push — resume (pushIncomplete: true)', () => {
        it('does not re-create the listing, and skips images Etsy already has', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(
                makeDesign({
                    imageIds: ['img-1', 'img-2'],
                    etsy: { listingId: 999, state: 'draft', lastPushedAt: null, pushIncomplete: true },
                })
            );
            mockEtsyClient.getListingImages.mockResolvedValue({ imageIds: [111] });

            await service.push('design-1', 'user-1');

            expect(mockEtsyClient.createDraftListing).not.toHaveBeenCalled();
            expect(mockImageService.getImage).toHaveBeenCalledTimes(1);
            expect(mockImageService.getImage).toHaveBeenCalledWith('img-2');
            expect(mockEtsyClient.uploadListingImage).toHaveBeenCalledTimes(1);
        });
    });

    describe('push — variations', () => {
        it('builds and puts inventory when the design has variation groups and variants', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(
                makeDesign({
                    variationGroups: [
                        {
                            id: 'g1',
                            name: 'Colour',
                            required: 1,
                            options: [{ id: 'opt-1', material: { id: 'm1', name: 'Silver' } as any }],
                        },
                    ],
                    variants: [
                        {
                            id: 'v1',
                            optionIds: ['opt-1'],
                            name: 'Silver',
                            totalQuantity: 5,
                            totalMaterialCosts: 3,
                            price: 20,
                        },
                    ],
                })
            );
            mockEtsyClient.createDraftListing.mockResolvedValue({ listingId: 999 });

            await service.push('design-1', 'user-1');

            expect(mockEtsyClient.updateListingInventory).toHaveBeenCalledWith(
                'at-token',
                999,
                expect.arrayContaining([
                    expect.objectContaining({ offering: { price: 20, quantity: 5, isEnabled: true } }),
                ])
            );
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/EtsyPushService/index.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// packages/api/src/domain/EtsyPushService/index.ts
import { APIError } from '@imapps/api-utils/hono';
import type { Design } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import type { ImageService } from '../ImageService';
import type { UserSettingsService } from '../UserSettingsService';
import { buildDraftListingInput, buildInventoryProducts, renderDescriptionTemplate } from './mappers';

const MAX_VARIATION_GROUPS = 2;

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBufferLike));
    }
    return Buffer.concat(chunks);
}

export class EtsyPushService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly imageService: ImageService,
        private readonly etsyClient: EtsyClient,
        private readonly etsyConnectionService: EtsyConnectionService,
        private readonly userSettingsService: UserSettingsService
    ) {}

    async push(designId: string, userId: string, overrides: { description?: string; price?: number } = {}): Promise<Design> {
        const design = await this.designRepo.getByIdAndUserId(designId, userId);
        if (!design) {
            throw new APIError('Design not found', 404);
        }

        if (design.etsy?.listingId && !design.etsy.pushIncomplete) {
            throw new APIError('Design is already on Etsy', 409);
        }

        const groups = design.variationGroups ?? [];
        if (groups.length > MAX_VARIATION_GROUPS) {
            throw new APIError(`Etsy supports at most ${MAX_VARIATION_GROUPS} variation properties`, 400);
        }

        const settings = await this.userSettingsService.get(userId);
        const { accessToken, shopId } = await this.etsyConnectionService.getPushCredentials(userId);

        let listingId = design.etsy?.listingId;

        if (!listingId) {
            const taxonomyId = design.designType ? settings.etsyTaxonomyMap[design.designType] : undefined;
            if (!taxonomyId) {
                throw new APIError('No Etsy category is mapped for this design type', 400);
            }

            const description = overrides.description ?? renderDescriptionTemplate(settings.etsyDescriptionTemplate, design);
            const price = overrides.price ?? design.price;

            const draftInput = buildDraftListingInput({ design, description, price, taxonomyId });
            const created = await this.etsyClient.createDraftListing(accessToken, shopId, draftInput);
            listingId = created.listingId;

            await this.designRepo.update(designId, {
                ...design,
                etsy: { listingId, state: 'draft', lastPushedAt: null, pushIncomplete: true },
            });
        }

        const alreadyUploaded = await this.etsyClient.getListingImages(accessToken, listingId);
        const remainingImageIds = design.imageIds.slice(alreadyUploaded.imageIds.length);

        for (const [index, imageId] of remainingImageIds.entries()) {
            const image = await this.imageService.getImage(imageId);
            const buffer = await streamToBuffer(image.stream);
            await this.etsyClient.uploadListingImage(
                accessToken,
                shopId,
                listingId,
                { buffer, contentType: image.contentType, filename: imageId },
                alreadyUploaded.imageIds.length + index + 1
            );
        }

        if (groups.length > 0 && design.variants && design.variants.length > 0) {
            const products = buildInventoryProducts(design.variants, groups);
            await this.etsyClient.updateListingInventory(accessToken, listingId, products);
        }

        const updated: Design = {
            ...design,
            etsy: { listingId, state: 'draft', lastPushedAt: Date.now(), pushIncomplete: false },
        };
        await this.designRepo.update(designId, updated);

        return updated;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/EtsyPushService/index.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Run the full api test suite**

Run: `cd packages/api && bun test`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/domain/EtsyPushService/index.ts packages/api/src/domain/EtsyPushService/index.test.ts
git commit -m "feat(api): add EtsyPushService orchestrating design pushes to Etsy"
```

---

### Task 7: API — handlers, routes, DI wiring, Mongo index

**Files:**
- Modify: `packages/api/src/handlers/Etsy/index.ts`
- Modify: `packages/api/src/dependencies/types.ts`
- Modify: `packages/api/src/dependencies/index.ts`
- Modify: `packages/api/src/routes/index.ts`
- Modify: `packages/api/src/index.ts`

**Interfaces:**
- Consumes: `EtsyPushService.push` (Task 6), `EtsyClient.getSellerTaxonomyNodes` (Task 2).
- Produces: `POST /api/designs/:id/etsy-push` (body `{ description?: string; price?: number }`, returns the updated `Design`), `GET /api/etsy/taxonomy` (returns `EtsyTaxonomyNode[]`) — consumed by the web layer (Task 8).

- [ ] **Step 1: Read the existing DI wiring for `EtsyConnectionService`**

Read `packages/api/src/dependencies/types.ts` and `packages/api/src/dependencies/index.ts` — find the existing `DependencyToken.EtsyConnectionService`/`DependencyToken.EtsyClient` entries and their registration factories (sub-project 1). This task's registration for `EtsyPushService` follows the identical pattern, just with more constructor dependencies resolved from the container.

- [ ] **Step 2: Add the `EtsyPushService` token**

In `packages/api/src/dependencies/types.ts`, add to the `DependencyToken` enum (alongside `EtsyConnectionService`):

```typescript
    EtsyPushService = 'EtsyPushService',
```

And add to the token→type map (alongside the `EtsyConnectionService` entry):

```typescript
    [DependencyToken.EtsyPushService]: EtsyPushService;
```

Add the import at the top of the file:

```typescript
import type { EtsyPushService } from '../domain/EtsyPushService';
```

- [ ] **Step 3: Register `EtsyPushService`**

In `packages/api/src/dependencies/index.ts`, add the import:

```typescript
import { EtsyPushService } from '../domain/EtsyPushService';
```

Add the registration (mirror the existing `EtsyConnectionService` registration's structure — read it first for the exact `dependencyContainer.register(...)` call shape used in this file, then add):

```typescript
        DependencyToken.EtsyPushService,
        () =>
            new EtsyPushService(
                dependencyContainer.resolve(DependencyToken.DesignRepository),
                dependencyContainer.resolve(DependencyToken.ImageService),
                dependencyContainer.resolve(DependencyToken.EtsyClient),
                dependencyContainer.resolve(DependencyToken.EtsyConnectionService),
                dependencyContainer.resolve(DependencyToken.UserSettingsService)
            )
```

(Match this task's registration call to the exact `register(token, factory)` / `registerSingleton` API this file already uses for its other entries — read the surrounding code and mirror it precisely rather than guessing the call shape.)

- [ ] **Step 4: Add the handlers**

In `packages/api/src/handlers/Etsy/index.ts`, add the import:

```typescript
import type { EtsyPushService } from '../../domain/EtsyPushService';
```

Add these two handlers at the end of the file:

```typescript
const getPushService = (): EtsyPushService => dependencyContainer.resolve(DependencyToken.EtsyPushService);

export const pushDesignToEtsy = async (c: AuthedCtx) => {
    const { description, price } = (await c.req.json().catch(() => ({}))) as {
        description?: string;
        price?: number;
    };

    const design = await getPushService().push(c.req.param('id'), c.get('userId'), { description, price });
    return c.json(design, 200);
};

export const getEtsyTaxonomy = async (c: AuthedCtx) => {
    const client = dependencyContainer.resolve(DependencyToken.EtsyClient);
    const nodes = await client.getSellerTaxonomyNodes();
    return c.json(nodes, 200);
};
```

- [ ] **Step 5: Add the routes**

In `packages/api/src/routes/index.ts`, update the `handlers/Etsy` import to include the two new handlers:

```typescript
import {
    disconnectEtsyConnection,
    etsyOAuthCallback,
    getEtsyConnectionStatus,
    getEtsyTaxonomy,
    pushDesignToEtsy,
    startEtsyOAuth,
} from '../handlers/Etsy';
```

Add the two new routes directly after the existing `/api/etsy/connection` routes:

```typescript
    app.post('/api/designs/:id/etsy-push', authenticate, pushDesignToEtsy);
    app.get('/api/etsy/taxonomy', authenticate, getEtsyTaxonomy);
```

- [ ] **Step 6: Add the unique sparse index**

In `packages/api/src/index.ts`, directly after the existing `await designsCollection.createIndex({ id: 1, userId: 1 });` line, add:

```typescript
        await designsCollection.createIndex({ 'etsy.listingId': 1 }, { unique: true, sparse: true });
```

(`sparse: true` is required — most designs have no `etsy` field at all, and a non-sparse unique index would reject every second design lacking the field as a duplicate `null`.)

- [ ] **Step 7: Typecheck**

Run: `cd packages/api && bunx tsc --noEmit`
Expected: no errors

- [ ] **Step 8: Run the full api test suite**

Run: `cd packages/api && bun test`
Expected: all pass

- [ ] **Step 9: Run lint**

Run: `bun run lint` from repo root on touched files — must pass (Biome).

- [ ] **Step 10: Commit**

```bash
git add packages/api/src/handlers/Etsy/index.ts packages/api/src/dependencies/types.ts packages/api/src/dependencies/index.ts packages/api/src/routes/index.ts packages/api/src/index.ts
git commit -m "feat(api): wire up the Etsy push and taxonomy endpoints"
```

---

### Task 8: Web — API client + hooks (push + taxonomy)

**Files:**
- Modify: `packages/web/src/api/endpoints.ts`
- Create: `packages/web/src/api/endpoints/etsyPush/index.ts`
- Create: `packages/web/src/api/endpoints/etsyTaxonomy/index.ts`
- Modify: `packages/web/src/api/endpoints/userSettings/index.ts`
- Create: `packages/web/src/utils/flattenTaxonomyNodes/index.ts`
- Create: `packages/web/src/utils/flattenTaxonomyNodes/index.test.ts`
- Create: `packages/web/src/hooks/useEtsyPush.ts`
- Create: `packages/web/src/hooks/useEtsyTaxonomy.ts`
- Modify: `packages/web/src/hooks/useUserSettings.ts`

**Interfaces:**
- Consumes: `Design.etsy`, `UserSettings.etsyDescriptionTemplate`/`etsyTaxonomyMap` (Task 1), the two new endpoints (Task 7).
- Produces: `makePushDesignToEtsyRequest(designId, overrides, ...)`, `makeGetEtsyTaxonomyRequest(...)`, `flattenTaxonomyNodes(nodes: EtsyTaxonomyNode[]): Array<{ id: number; label: string }>`, `useEtsyPush()`, `useEtsyTaxonomy()`, `useUserSettings()` now also returns/accepts `etsyDescriptionTemplate`/`etsyTaxonomyMap` — consumed by Tasks 9, 10, 11.

- [ ] **Step 1: Add endpoint constants**

In `packages/web/src/api/endpoints.ts`, add (alongside the existing `ETSY_*` constants):

```typescript
export const ETSY_TAXONOMY_ENDPOINT = '/api/etsy/taxonomy';
```

(The push endpoint needs a per-design id, so it's built inline as `${DESIGNS_ENDPOINT}/${designId}/etsy-push` in `etsyPush/index.ts`, following the exact pattern already used by `editDesign/index.ts` for `${DESIGNS_ENDPOINT}/${designId}`.)

- [ ] **Step 2: Write `makePushDesignToEtsyRequest`**

```typescript
// packages/web/src/api/endpoints/etsyPush/index.ts
import { type Design, MethodType } from '@jewellery-catalogue/types';

import { DESIGNS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makePushDesignToEtsyRequest = (
    designId: string,
    overrides: { description?: string; price?: number },
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<Design>(
        {
            pathname: `${DESIGNS_ENDPOINT}/${designId}/etsy-push`,
            method: MethodType.POST,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'push design to etsy',
            body: overrides,
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
```

- [ ] **Step 3: Write `makeGetEtsyTaxonomyRequest`**

```typescript
// packages/web/src/api/endpoints/etsyTaxonomy/index.ts
import { MethodType } from '@jewellery-catalogue/types';

import { ETSY_TAXONOMY_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export interface EtsyTaxonomyNode {
    id: number;
    name: string;
    children: EtsyTaxonomyNode[];
}

export const makeGetEtsyTaxonomyRequest = (
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<EtsyTaxonomyNode[]>(
        {
            pathname: ETSY_TAXONOMY_ENDPOINT,
            method: MethodType.GET,
            operationString: 'fetch etsy taxonomy',
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
```

- [ ] **Step 4: Update `makeUpdateUserSettingsRequest`**

In `packages/web/src/api/endpoints/userSettings/index.ts`, update `makeUpdateUserSettingsRequest`'s parameter type to include the two new fields:

```typescript
export const makeUpdateUserSettingsRequest = (
    updates: {
        hourlyWage: number;
        profitMargin: number;
        markupMultiplier: number;
        hourlyRate: number;
        etsyDescriptionTemplate: string;
        etsyTaxonomyMap: Record<string, number>;
    },
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<UserSettings>(
        {
            pathname: USER_SETTINGS_ENDPOINT,
            method: MethodType.PUT,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'update user settings',
            body: updates,
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
```

(`makeGetUserSettingsRequest`/`makeRecalculatePricesRequest` are unchanged — leave them exactly as they are.)

- [ ] **Step 5: Write the failing tests for `flattenTaxonomyNodes`**

```typescript
// packages/web/src/utils/flattenTaxonomyNodes/index.test.ts
import { describe, expect, it } from 'bun:test';

import { flattenTaxonomyNodes } from './index';

describe('flattenTaxonomyNodes', () => {
    it('flattens a nested tree into a list with breadcrumb labels', () => {
        const result = flattenTaxonomyNodes([
            {
                id: 1,
                name: 'Jewelry',
                children: [
                    { id: 2, name: 'Rings', children: [] },
                    { id: 3, name: 'Necklaces', children: [{ id: 4, name: 'Chokers', children: [] }] },
                ],
            },
        ]);

        expect(result).toEqual([
            { id: 1, label: 'Jewelry' },
            { id: 2, label: 'Jewelry > Rings' },
            { id: 3, label: 'Jewelry > Necklaces' },
            { id: 4, label: 'Jewelry > Necklaces > Chokers' },
        ]);
    });

    it('returns an empty array for an empty tree', () => {
        expect(flattenTaxonomyNodes([])).toEqual([]);
    });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd packages/web && bun test src/utils/flattenTaxonomyNodes/index.test.ts`
Expected: FAIL — module not found

- [ ] **Step 7: Implement `flattenTaxonomyNodes`**

```typescript
// packages/web/src/utils/flattenTaxonomyNodes/index.ts
import type { EtsyTaxonomyNode } from '../../api/endpoints/etsyTaxonomy';

export interface FlatTaxonomyOption {
    id: number;
    label: string;
}

export const flattenTaxonomyNodes = (nodes: EtsyTaxonomyNode[], prefix = ''): FlatTaxonomyOption[] =>
    nodes.flatMap((node) => {
        const label = prefix ? `${prefix} > ${node.name}` : node.name;
        return [{ id: node.id, label }, ...flattenTaxonomyNodes(node.children, label)];
    });
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd packages/web && bun test src/utils/flattenTaxonomyNodes/index.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Write `useEtsyPush`**

```typescript
// packages/web/src/hooks/useEtsyPush.ts
import { useAuth } from '@imapps/web-utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { makePushDesignToEtsyRequest } from '../api/endpoints/etsyPush';

export const useEtsyPush = (designId: string) => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    const pushMutation = useMutation({
        mutationFn: (overrides: { description?: string; price?: number }) =>
            makePushDesignToEtsyRequest(designId, overrides, () => accessToken, login, logout),
        onSuccess: (updated) => {
            queryClient.setQueryData(['design', designId], updated);
        },
    });

    return {
        push: pushMutation.mutateAsync,
        isPushing: pushMutation.isPending,
        pushError: pushMutation.error,
    };
};
```

- [ ] **Step 10: Write `useEtsyTaxonomy`**

```typescript
// packages/web/src/hooks/useEtsyTaxonomy.ts
import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';

import { makeGetEtsyTaxonomyRequest } from '../api/endpoints/etsyTaxonomy';
import { flattenTaxonomyNodes } from '../utils/flattenTaxonomyNodes';

export const useEtsyTaxonomy = (enabled: boolean) => {
    const { accessToken, login, logout } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ['etsy-taxonomy'],
        queryFn: () => makeGetEtsyTaxonomyRequest(() => accessToken, login, logout),
        enabled: enabled && !!accessToken,
        staleTime: Number.POSITIVE_INFINITY,
    });

    return {
        options: flattenTaxonomyNodes(data ?? []),
        isLoading,
    };
};
```

- [ ] **Step 11: Update `useUserSettings`**

Replace `packages/web/src/hooks/useUserSettings.ts` in full:

```typescript
import { useAuth } from '@imapps/web-utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    makeGetUserSettingsRequest,
    makeRecalculatePricesRequest,
    makeUpdateUserSettingsRequest,
} from '../api/endpoints/userSettings';

const QUERY_KEY = ['user-settings'];

export const useUserSettings = () => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => makeGetUserSettingsRequest(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const updateMutation = useMutation({
        mutationFn: (updates: {
            hourlyWage: number;
            profitMargin: number;
            markupMultiplier: number;
            hourlyRate: number;
            etsyDescriptionTemplate: string;
            etsyTaxonomyMap: Record<string, number>;
        }) => makeUpdateUserSettingsRequest(updates, () => accessToken, login, logout),
        onSuccess: (updated) => {
            queryClient.setQueryData(QUERY_KEY, updated);
        },
    });

    const recalculateMutation = useMutation({
        mutationFn: () => makeRecalculatePricesRequest(() => accessToken, login, logout),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['designs'] });
        },
    });

    return {
        hourlyWage: data?.hourlyWage ?? 10,
        profitMargin: data?.profitMargin ?? 15,
        markupMultiplier: data?.markupMultiplier ?? 2.5,
        hourlyRate: data?.hourlyRate ?? 0,
        etsyDescriptionTemplate: data?.etsyDescriptionTemplate ?? '',
        etsyTaxonomyMap: data?.etsyTaxonomyMap ?? {},
        isLoading,
        updateSettings: updateMutation.mutateAsync,
        recalculate: recalculateMutation.mutateAsync,
        isRecalculating: recalculateMutation.isPending,
        recalculateResult: recalculateMutation.data,
        recalculateError: recalculateMutation.error,
    };
};
```

- [ ] **Step 12: Typecheck**

Run: `cd packages/web && bunx tsc --build --force 2>&1 | grep -E "error TS" | sort > /tmp/task8-sp3-errors.txt` from repo root, then diff against a fresh baseline (this branch stacks on `feat/design-authoring-upgrades`, not `main` — re-derive the baseline from THIS branch's parent commit, not the sub-project-2 baseline file, since the two branches diverge; use a disposable worktree at this task's base commit the same way sub-project 2's tasks did). Expect the same class of pre-existing/known-noise errors as before, plus new errors ONLY at `Settings/index.tsx`'s `updateSettings(...)` call site (missing the two new fields) and `ViewDesign`/`DesignEditForm` if they reference `design.etsy` before Task 10 wires them up — both are EXPECTED and fixed in later tasks of this plan. Clean generated build artifacts afterward with `git clean -fd -- packages/` (no `-x`, nothing outside `packages/`).

- [ ] **Step 13: Commit**

```bash
git add packages/web/src/api/endpoints.ts packages/web/src/api/endpoints/etsyPush packages/web/src/api/endpoints/etsyTaxonomy packages/web/src/api/endpoints/userSettings packages/web/src/utils/flattenTaxonomyNodes packages/web/src/hooks/useEtsyPush.ts packages/web/src/hooks/useEtsyTaxonomy.ts packages/web/src/hooks/useUserSettings.ts
git commit -m "feat(web): add Etsy push/taxonomy API clients and hooks"
```

---

### Task 9: Web — `EtsyPushDialog` component

**Files:**
- Create: `packages/web/src/components/EtsyPushDialog/index.tsx`

**Interfaces:**
- Consumes: `useEtsyPush` (Task 8), `useEtsyTaxonomy` (Task 8), `useUserSettings` (Task 8, for `etsyDescriptionTemplate`/`etsyTaxonomyMap`), existing `Dialog`/`Button`/`Textarea`/`InputGroup` UI primitives (`packages/web/src/components/ui/*`), `renderDescriptionTemplate`-equivalent client-side rendering (do NOT import the api package's mapper — reimplement the same two-placeholder substitution inline here, it's a one-line `.replace().replace()`, not worth sharing across the api/web boundary).
- Produces: `<EtsyPushDialog design={Design} open={boolean} onOpenChange={(open: boolean) => void} />` — a modal showing the editable composed description, resolved category (from `design.designType` looked up in `etsyTaxonomyMap`, rendered as read-only text — category is a settings-time decision, not edited per-push), price (prefilled from `design.price`), the list of product photo ids that will be sent (never diagram images), and a submit button that calls `useEtsyPush().push({ description, price })` and closes the dialog on success.

- [ ] **Step 1: Write `EtsyPushDialog`**

```typescript
// packages/web/src/components/EtsyPushDialog/index.tsx
import type { Design } from '@jewellery-catalogue/types';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useEtsyPush } from '../../hooks/useEtsyPush';
import { useUserSettings } from '../../hooks/useUserSettings';

interface EtsyPushDialogProps {
    design: Design;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const renderTemplate = (template: string, description: string, materials: Array<{ name: string }>): string =>
    template.replace(/\{description\}/g, description).replace(/\{materials\}/g, materials.map((m) => m.name).join(', '));

const EtsyPushDialog: React.FC<EtsyPushDialogProps> = ({ design, open, onOpenChange }) => {
    const { etsyDescriptionTemplate, etsyTaxonomyMap } = useUserSettings();
    const { push, isPushing, pushError } = useEtsyPush(design.id);

    const [description, setDescription] = useState(() =>
        renderTemplate(etsyDescriptionTemplate, design.description, design.materials)
    );
    const [price, setPrice] = useState(design.price);

    const taxonomyId = design.designType ? etsyTaxonomyMap[design.designType] : undefined;

    const handleSend = async () => {
        await push({ description, price });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send to Etsy</DialogTitle>
                    <DialogDescription>Review before creating the draft listing on Etsy.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Description</Label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Category</Label>
                        <p className="text-sm text-muted-foreground">
                            {taxonomyId
                                ? `Taxonomy #${taxonomyId} (set for ${design.designType} in Settings)`
                                : 'No category mapped for this design type — set one in Settings before sending.'}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Price</Label>
                        <InputGroup className="max-w-[160px]">
                            <InputGroupAddon align="inline-start">
                                <InputGroupText>£</InputGroupText>
                            </InputGroupAddon>
                            <InputGroupInput
                                type="number"
                                min="0"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                            />
                        </InputGroup>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Photos</Label>
                        <p className="text-sm text-muted-foreground">
                            {design.imageIds.length > 0
                                ? `${design.imageIds.length} product photo(s) will be sent.`
                                : 'No product photos — you can add them on Etsy before publishing.'}
                        </p>
                    </div>

                    {pushError && (
                        <p className="text-sm text-destructive">
                            {pushError instanceof Error ? pushError.message : 'Failed to send to Etsy.'}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPushing}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSend} disabled={isPushing || !taxonomyId}>
                        {isPushing ? 'Sending…' : 'Send to Etsy'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EtsyPushDialog;
```

- [ ] **Step 2: Typecheck**

Run: `cd packages/web && bunx tsc --build --force 2>&1 | grep -E "error TS"` from repo root, filter to lines referencing `EtsyPushDialog` — expect none beyond pre-existing/known noise. Clean generated artifacts afterward with `git clean -fd -- packages/`.

(If `Dialog`/`DialogContent`/`DialogFooter`/`InputGroup` import paths don't match this repo's actual `components/ui` exports, read the nearest existing dialog usage — e.g. search for `from '@/components/ui/dialog'` elsewhere in `packages/web/src` — and correct the import paths to match; keep the component's props/logic identical.)

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/EtsyPushDialog
git commit -m "feat(web): add EtsyPushDialog for reviewing a design before sending to Etsy"
```

---

### Task 10: Web — wire "Send to Etsy" + Etsy chip into `ViewDesign`

**Files:**
- Modify: `packages/web/src/pages/ViewDesign/index.tsx`

**Interfaces:**
- Consumes: `Design.etsy` (Task 1), `useEtsyConnection` (existing, sub-project 1), `EtsyPushDialog` (Task 9).
- Produces: an Etsy state chip (`Draft`/`Active` + external link to `https://www.etsy.com/your/shops/me/listing-editor/edit/{listingId}` when linked) and a "Send to Etsy" button (hidden entirely when `!connected`; disabled with a reason string in a tooltip/title attribute when `design.etsy?.listingId && !design.etsy.pushIncomplete`) that opens `EtsyPushDialog`.

- [ ] **Step 1: Read the current page header/action-button area**

Read `packages/web/src/pages/ViewDesign/index.tsx` around its top action-button row (near where "Edit Details" or similar buttons already render) and its destructure of `design` (already extended in sub-project 2 with `diagramImageIds`/`makingNotes` — add `etsy` to the same destructure) — find the exact existing button-row markup to match its spacing/variant conventions.

- [ ] **Step 2: Add imports and state**

Add imports:

```typescript
import { ExternalLink } from 'lucide-react';

import { useEtsyConnection } from '../../hooks/useEtsyConnection';
import EtsyPushDialog from '../../components/EtsyPushDialog';
```

Add to the component body (alongside other `useState` hooks):

```typescript
    const { connected: etsyConnected } = useEtsyConnection();
    const [etsyDialogOpen, setEtsyDialogOpen] = useState(false);
```

Add `etsy` to the existing `design ?? {}` destructure.

- [ ] **Step 3: Add the chip + button**

In the action-button row (read the file to find its exact JSX — likely a `<div className="flex ... gap-2">` alongside an existing "Edit Details" button), add, only when `etsyConnected`:

```typescript
                    {etsyConnected && (
                        <>
                            {etsy?.listingId && (
                                <a
                                    href={`https://www.etsy.com/your/shops/me/listing-editor/edit/${etsy.listingId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                                >
                                    {etsy.state === 'active' ? 'Active' : 'Draft'} on Etsy
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                disabled={!!etsy?.listingId && !etsy.pushIncomplete}
                                title={
                                    etsy?.listingId && !etsy.pushIncomplete
                                        ? 'This design is already on Etsy'
                                        : undefined
                                }
                                onClick={() => setEtsyDialogOpen(true)}
                            >
                                Send to Etsy
                            </Button>
                        </>
                    )}
```

(Match the existing `Button` import already present in this file — do not add a duplicate import if one exists.)

- [ ] **Step 4: Render the dialog**

At the end of the component's JSX (as a sibling to the main returned markup, same level as any other existing dialogs on this page), add:

```typescript
            {design && <EtsyPushDialog design={design} open={etsyDialogOpen} onOpenChange={setEtsyDialogOpen} />}
```

- [ ] **Step 5: Typecheck**

Run: `cd packages/web && bunx tsc --build --force 2>&1 | grep -E "error TS"` from repo root, filter to lines referencing `ViewDesign` — expect none beyond pre-existing/known noise. Clean generated artifacts afterward with `git clean -fd -- packages/`.

- [ ] **Step 6: Manual smoke test**

Same sandbox caveats as sub-project 2's tasks (no seeded DB, mock-auth-server bug) — attempt best-effort only; confirm the page renders without crashing when `etsyConnected` is false (chip/button simply absent) is reasonable evidence given the auth/seed limitations already documented in this repo's prior task reports.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/pages/ViewDesign/index.tsx
git commit -m "feat(web): add Send to Etsy button and Etsy state chip to ViewDesign"
```

---

### Task 11: Web — Settings page: description template + taxonomy map

**Files:**
- Modify: `packages/web/src/pages/Settings/index.tsx`

**Interfaces:**
- Consumes: `useUserSettings()` (Task 8, now returning/accepting `etsyDescriptionTemplate`/`etsyTaxonomyMap`), `useEtsyTaxonomy` (Task 8), `useEtsyConnection` (existing).
- Produces: a new "Etsy defaults" section on `/settings` (description template textarea; one `designType → taxonomy_id` dropdown per `DesignType` enum value, fed by `useEtsyTaxonomy`'s flattened options) — shown only when `useEtsyConnection().connected` is true (per spec's UI surface map). `handleSavePricing` (or a new sibling `handleSaveEtsyDefaults`, matching whichever save-button granularity this page already uses for its other sections — read the file first) sends the two new fields.

- [ ] **Step 1: Read the current Settings page structure**

Read `packages/web/src/pages/Settings/index.tsx` in full — note whether each `<section>` (Etsy Connection, Pricing) has its own independent save action or shares one page-level save, and match that pattern for the new section rather than inventing a third pattern.

- [ ] **Step 2: Add local state**

Alongside the existing `local*` `useState` declarations, add:

```typescript
    const [localEtsyDescriptionTemplate, setLocalEtsyDescriptionTemplate] = useState(etsyDescriptionTemplate);
    const [localEtsyTaxonomyMap, setLocalEtsyTaxonomyMap] = useState<Record<string, number>>(etsyTaxonomyMap);
```

Destructure `etsyDescriptionTemplate`, `etsyTaxonomyMap` from `useUserSettings()` alongside the existing fields. Add the same fields to this page's existing sync `useEffect` (the one that resets local state when the hook's data changes), following its exact pattern.

- [ ] **Step 3: Update the save call**

Wherever this page currently calls `updateSettings({ hourlyWage, profitMargin, markupMultiplier, hourlyRate })` (from sub-project 2's Task 11), extend it to include the two new fields:

```typescript
            await updateSettings({
                hourlyWage: wage,
                profitMargin: margin,
                markupMultiplier: Number(localMarkupMultiplier),
                hourlyRate: Number(localHourlyRate),
                etsyDescriptionTemplate: localEtsyDescriptionTemplate,
                etsyTaxonomyMap: localEtsyTaxonomyMap,
            });
```

(If this page's save actions are per-section rather than one shared call, add the two new fields to whichever single call already sends the full settings object — this page's `updateSettings` mutation always sends the complete `UserSettings` shape per Task 4's handler contract, which requires all 6 fields together; there is no partial-update endpoint.)

- [ ] **Step 4: Add the Etsy defaults section markup**

Add the import:

```typescript
import { useEtsyTaxonomy } from '../../hooks/useEtsyTaxonomy';
import { DesignType } from '@jewellery-catalogue/types';
```

Call the hook near the top of the component (alongside `useEtsyConnection()`):

```typescript
    const { options: taxonomyOptions, isLoading: taxonomyLoading } = useEtsyTaxonomy(etsyConnected);
```

Add a new `<Card>` section (matching the existing `Etsy Connection`/`Pricing` cards' structure — read one for the exact wrapper markup), rendered only when `etsyConnected`:

```typescript
                {etsyConnected && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Etsy Defaults</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label>Description template</Label>
                                <Textarea
                                    value={localEtsyDescriptionTemplate}
                                    onChange={(e) => setLocalEtsyDescriptionTemplate(e.target.value)}
                                    placeholder="{description}\n\nMaterials: {materials}"
                                    rows={4}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use {'{description}'} and {'{materials}'} as placeholders.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Label>Category by design type</Label>
                                {Object.values(DesignType).map((designType) => (
                                    <div key={designType} className="flex items-center gap-3">
                                        <span className="w-28 text-sm">{designType}</span>
                                        <select
                                            className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                                            disabled={taxonomyLoading}
                                            value={localEtsyTaxonomyMap[designType] ?? ''}
                                            onChange={(e) =>
                                                setLocalEtsyTaxonomyMap((prev) => ({
                                                    ...prev,
                                                    [designType]: Number(e.target.value),
                                                }))
                                            }
                                        >
                                            <option value="" disabled>
                                                Select a category…
                                            </option>
                                            {taxonomyOptions.map((opt) => (
                                                <option key={opt.id} value={opt.id}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
```

(Match this page's existing `Card`/`CardHeader`/`CardTitle`/`CardContent`/`Label`/`Textarea` import sources exactly — read the top of the file rather than guessing.)

- [ ] **Step 5: Typecheck**

Run: `cd packages/web && bunx tsc --build --force 2>&1 | grep -E "error TS"` from repo root, filter to lines referencing `Settings/index.tsx` — expect none beyond pre-existing/known noise (this task should make the `updateSettings(...)` arity error from Task 8 disappear, mirroring how sub-project 2's Task 11 resolved its own carried-forward error). Clean generated artifacts afterward with `git clean -fd -- packages/`.

- [ ] **Step 6: Manual smoke test**

Best-effort only, same sandbox caveats as prior tasks — confirm `/settings` renders without crashing and the Etsy Defaults section is entirely absent when not connected.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/pages/Settings/index.tsx
git commit -m "feat(web): add Etsy description template and category mapping to Settings"
```

---

## Self-Review Notes

- **Spec coverage:** Entry button + push dialog (Task 9, 10) · Server flow's 4 sequential steps — createDraftListing, uploadListingImage, updateListingInventory, persist `etsy` block (Task 6) · >2 variation groups rejected before any Etsy call (Task 6) · Fixed fields `who_made`/`when_made`/`quantity` (Task 5 mapper) · Failure/resume model with `pushIncomplete` + `getListingImages`-checked idempotent image upload + always-safe inventory re-put (Task 6) · Description template with `{description}`/`{materials}` placeholders, editable before send (Task 5 mapper on the API side for the *initial* render only, Task 9 dialog for the editable copy) · Category via `designType → taxonomy_id` settings map fed by `getSellerTaxonomyNodes` (Task 2, 8, 11) · Diagrams never sent — verified by construction: `EtsyPushService` only ever reads `design.imageIds`, never `design.diagramImageIds` (Task 6, and asserted directly in Task 6's test `expect(mockImageService.getImage).not.toHaveBeenCalledWith('diagram-1')`) · Re-push blocked with "already on Etsy" (Task 6) · Unique sparse index on `etsy.listingId` (Task 7).
- **Out of scope, confirmed not implemented here:** status refresh polling (sub-project 4), the one-time linking script (sub-project 5), re-push/update-after-push (spec Non-goal), orders/receipts (spec Non-goal), AI-generated descriptions (spec Non-goal — the template `{description}`/`{materials}` slot is designed so this can be added later without touching this plan's code).
- **Placeholder scan:** no TBD/TODO markers; every step has runnable code or an exact command. Task 9/10/11's UI steps ask the implementer to read the exact existing `components/ui` import paths and section-save-granularity before inserting (rather than guessing a shape that might not match this repo's actual primitives) — same intentional pattern sub-project 2's Task 9/12 used, not a placeholder.
- **Type consistency:** `EtsyPushService.push`'s constructor dependency order (`designRepo, imageService, etsyClient, etsyConnectionService, userSettingsService`) is used identically in Task 6's test, implementation, and Task 7's DI registration. `EtsyClient`'s new method signatures (Task 2) match exactly how `EtsyPushService` (Task 6) and `handlers/Etsy` (Task 7) call them. `flattenTaxonomyNodes`'s `{id, label}` shape (Task 8) matches exactly what `Settings`' taxonomy dropdown (Task 11) renders. `UserSettings.etsyDescriptionTemplate`/`etsyTaxonomyMap` field names are identical from the schema (Task 1) through the service (Task 4), the hook (Task 8), and every UI consumer (Task 9, 11).
