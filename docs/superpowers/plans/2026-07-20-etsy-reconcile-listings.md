# Etsy Reconcile — Create/Link Designs From Listings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** From the Etsy Listings page, reconcile each unlinked active listing into a catalogue design — either create a new stub design pre-filled from the listing, or link an existing unlinked design to it.

**Architecture:** New `EtsyReconcileService` (api domain) orchestrates both flows on top of the existing `DesignRepository`, `EtsyClient`, and `EtsyConnectionService`. A new `EtsyClient.getListingDetail` read pulls title/description/price/image-URLs from Etsy. Two new authenticated POST routes back a `useEtsyReconcile` web hook. The `pages/Listings` table gains per-row `Create design` / `Link existing` actions. Stub designs store Etsy image URLs in a new optional `etsy.imageUrls` field, rendered directly on ViewDesign.

**Tech Stack:** TypeScript, Bun (`bun test`, `mock` from `bun:test`), Hono handlers, tsyringe-style DI container, Zod (`@jewellery-catalogue/types`), React + `@tanstack/react-query`, Tailwind UI primitives.

## Global Constraints

- API base: `https://api.etsy.com/v3/application` (already in `EtsyClient`). Public reads use header `x-api-key: <keystring>:<shared_secret>` via `this.apiKeyHeader()` — no OAuth needed for active-listing reads.
- Etsy prices arrive as `{ amount, divisor }`; convert with `amount / divisor`.
- Etsy shop id: `47408839` (used in test fixtures).
- Link marker on a design is `etsy: { listingId, state, lastPushedAt, pushIncomplete?, imageUrls? }`. A design counts as "linked" iff `design.etsy?.listingId` is set.
- Errors: surface real messages, never opaque 500s. Use `APIError` from `@imapps/api-utils/hono` with explicit status codes (409 already-linked, 404 not-found, 400 bad-input).
- `bunx tsc --noEmit` inside `packages/web` is a silent no-op (solution-style tsconfig) — verify web types with `bunx tsc --build --force` from repo root.
- `fallow-audit` pre-push hook hard-fails on dead-code findings. A method reached only via `dependencyContainer.resolve(...)` may read as unreachable — add `// fallow-ignore-next-line unused-class-member` above it, matching `EtsyClient.getSellerTaxonomyNodes`.

---

### Task 1: Add `imageUrls` to the design Etsy schema

**Files:**
- Modify: `packages/types/src/design/index.ts:13-18`

**Interfaces:**
- Consumes: nothing.
- Produces: `designEtsySchema` now accepts optional `imageUrls: string[]`; `DesignEtsy` type gains `imageUrls?: string[]`.

- [ ] **Step 1: Add the field to the schema**

In `packages/types/src/design/index.ts`, change the `designEtsySchema` object:

```typescript
export const designEtsySchema = z.object({
    listingId: z.number(),
    state: etsyListingStateSchema,
    lastPushedAt: z.number().nullable(),
    pushIncomplete: z.boolean().optional(),
    imageUrls: z.array(z.string()).optional(),
});
```

- [ ] **Step 2: Verify the types package builds**

Run: `bunx tsc --build --force packages/types`
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/design/index.ts
git commit -m "feat(types): add optional etsy.imageUrls to design schema"
```

---

### Task 2: `EtsyClient.getListingDetail`

**Files:**
- Modify: `packages/api/src/domain/EtsyClient/index.ts`
- Test: `packages/api/src/domain/EtsyClient/getListingDetail.test.ts`

**Interfaces:**
- Consumes: existing `API_BASE`, `this.apiKeyHeader()`, `etsyError`.
- Produces:
  ```typescript
  export interface EtsyListingDetail {
      title: string;
      description: string;
      price: number;
      imageUrls: string[];
  }
  // EtsyClient method:
  getListingDetail(listingId: number): Promise<EtsyListingDetail>
  ```

- [ ] **Step 1: Write the failing test**

Create `packages/api/src/domain/EtsyClient/getListingDetail.test.ts`:

```typescript
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { EtsyClient } from './index';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

describe('EtsyClient.getListingDetail', () => {
    it('fetches a listing with images and maps title, description, price and image urls', async () => {
        const fetchMock = mock(async () =>
            new Response(
                JSON.stringify({
                    listing_id: 123,
                    title: 'Silver Ring',
                    description: 'A lovely ring.',
                    price: { amount: 2500, divisor: 100 },
                    images: [
                        { url_fullxfull: 'https://i.etsy.com/1.jpg' },
                        { url_fullxfull: 'https://i.etsy.com/2.jpg' },
                    ],
                }),
                { status: 200 }
            )
        );
        globalThis.fetch = fetchMock as unknown as typeof fetch;

        const client = new EtsyClient('key', 'secret');
        const detail = await client.getListingDetail(123);

        expect(detail).toEqual({
            title: 'Silver Ring',
            description: 'A lovely ring.',
            price: 25,
            imageUrls: ['https://i.etsy.com/1.jpg', 'https://i.etsy.com/2.jpg'],
        });
        const calledUrl = fetchMock.mock.calls[0]![0] as string;
        expect(calledUrl).toBe('https://api.etsy.com/v3/application/listings/123?includes=Images');
    });

    it('returns empty imageUrls when the listing has no images', async () => {
        globalThis.fetch = mock(async () =>
            new Response(
                JSON.stringify({
                    listing_id: 5,
                    title: 'T',
                    description: 'D',
                    price: { amount: 999, divisor: 100 },
                }),
                { status: 200 }
            )
        ) as unknown as typeof fetch;

        const client = new EtsyClient('key', 'secret');
        const detail = await client.getListingDetail(5);
        expect(detail.imageUrls).toEqual([]);
        expect(detail.price).toBe(9.99);
    });

    it('throws when the Etsy response is not ok', async () => {
        globalThis.fetch = mock(async () => new Response('nope', { status: 404 })) as unknown as typeof fetch;
        const client = new EtsyClient('key', 'secret');
        await expect(client.getListingDetail(7)).rejects.toThrow();
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/api && bun test src/domain/EtsyClient/getListingDetail.test.ts`
Expected: FAIL — `getListingDetail` is not a function.

- [ ] **Step 3: Implement the method and interface**

In `packages/api/src/domain/EtsyClient/index.ts`, add the interface near the other `Etsy*` interfaces (after `EtsyListingSummary`):

```typescript
export interface EtsyListingDetail {
    title: string;
    description: string;
    price: number;
    imageUrls: string[];
}
```

Add the method to the `EtsyClient` class, right after `getListing`:

```typescript
async getListingDetail(listingId: number): Promise<EtsyListingDetail> {
    const response = await fetch(`${API_BASE}/listings/${listingId}?includes=Images`, {
        headers: { 'x-api-key': this.apiKeyHeader() },
    });

    if (!response.ok) {
        throw await etsyError('getListingDetail', response);
    }

    const body = (await response.json()) as {
        title: string;
        description: string;
        price: { amount: number; divisor: number };
        images?: Array<{ url_fullxfull: string }>;
    };

    return {
        title: body.title,
        description: body.description,
        price: body.price.amount / body.price.divisor,
        imageUrls: (body.images ?? []).map((img) => img.url_fullxfull),
    };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/api && bun test src/domain/EtsyClient/getListingDetail.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/EtsyClient/index.ts packages/api/src/domain/EtsyClient/getListingDetail.test.ts
git commit -m "feat(api): add EtsyClient.getListingDetail for reconcile pre-fill"
```

---

### Task 3: `EtsyReconcileService` — `createDesignFromListing`

**Files:**
- Create: `packages/api/src/domain/EtsyReconcileService/index.ts`
- Test: `packages/api/src/domain/EtsyReconcileService/index.test.ts`

**Interfaces:**
- Consumes: `DesignRepository` (`getByUserId`, `getByIdAndUserId`, `insert`, `update`), `EtsyClient` (`getShopListingsActive`, `getListingDetail`), `EtsyConnectionService` (`getShopId`), `IdGenerator` (`generate`).
- Produces:
  ```typescript
  class EtsyReconcileService {
      constructor(
          designRepo: DesignRepository,
          etsyClient: EtsyClient,
          etsyConnectionService: EtsyConnectionService,
          idGenerator: IdGenerator
      );
      createDesignFromListing(listingId: number, userId: string): Promise<{ designId: string }>;
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `packages/api/src/domain/EtsyReconcileService/index.test.ts`:

```typescript
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { Design } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import type { IdGenerator } from '../IdGenerator';
import { EtsyReconcileService } from './index';

const mockDesignRepo = { getByUserId: mock(), getByIdAndUserId: mock(), insert: mock(), update: mock() };
const mockEtsyClient = { getShopListingsActive: mock(), getListingDetail: mock() };
const mockEtsyConnectionService = { getShopId: mock() };
const mockIdGenerator = { generate: mock() };

function makeDesign(overrides: Partial<Design> = {}): Design {
    return {
        id: 'design-1',
        userId: 'user-1',
        name: 'Existing',
        description: '',
        timeRequired: '00:00',
        materials: [],
        imageIds: [],
        diagramImageIds: [],
        makingNotes: '',
        price: 10,
        totalMaterialCosts: 0,
        dateAdded: new Date(),
        totalQuantity: 0,
        ...overrides,
    };
}

function makeService() {
    return new EtsyReconcileService(
        mockDesignRepo as unknown as DesignRepository,
        mockEtsyClient as unknown as EtsyClient,
        mockEtsyConnectionService as unknown as EtsyConnectionService,
        mockIdGenerator as unknown as IdGenerator
    );
}

describe('EtsyReconcileService.createDesignFromListing', () => {
    beforeEach(() => {
        for (const m of [
            ...Object.values(mockDesignRepo),
            ...Object.values(mockEtsyClient),
            ...Object.values(mockEtsyConnectionService),
            ...Object.values(mockIdGenerator),
        ]) {
            m.mockClear();
        }
        mockEtsyConnectionService.getShopId.mockResolvedValue(47408839);
        mockIdGenerator.generate.mockReturnValue('new-design-1');
        mockDesignRepo.getByUserId.mockResolvedValue([]);
        mockEtsyClient.getShopListingsActive.mockResolvedValue([
            { listingId: 555, title: 'Silver Ring', price: 25, url: 'https://etsy.com/555' },
        ]);
        mockEtsyClient.getListingDetail.mockResolvedValue({
            title: 'Silver Ring',
            description: 'A lovely ring.',
            price: 25,
            imageUrls: ['https://i.etsy.com/1.jpg'],
        });
    });

    it('creates a stub design pre-filled from the listing and returns its id', async () => {
        const result = await makeService().createDesignFromListing(555, 'user-1');

        expect(result).toEqual({ designId: 'new-design-1' });
        expect(mockDesignRepo.insert).toHaveBeenCalledTimes(1);
        const inserted = mockDesignRepo.insert.mock.calls[0]![0] as Design;
        expect(inserted.id).toBe('new-design-1');
        expect(inserted.userId).toBe('user-1');
        expect(inserted.name).toBe('Silver Ring');
        expect(inserted.description).toBe('A lovely ring.');
        expect(inserted.price).toBe(25);
        expect(inserted.materials).toEqual([]);
        expect(inserted.imageIds).toEqual([]);
        expect(inserted.etsy).toEqual({
            listingId: 555,
            state: 'active',
            lastPushedAt: null,
            pushIncomplete: true,
            imageUrls: ['https://i.etsy.com/1.jpg'],
        });
    });

    it('rejects with 400 when the listing is not in the shop', async () => {
        await expect(makeService().createDesignFromListing(999, 'user-1')).rejects.toMatchObject({ status: 400 });
        expect(mockDesignRepo.insert).not.toHaveBeenCalled();
    });

    it('rejects with 409 when the listing is already linked to a design', async () => {
        mockDesignRepo.getByUserId.mockResolvedValue([makeDesign({ etsy: { listingId: 555, state: 'active', lastPushedAt: null } })]);
        await expect(makeService().createDesignFromListing(555, 'user-1')).rejects.toMatchObject({ status: 409 });
        expect(mockDesignRepo.insert).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/api && bun test src/domain/EtsyReconcileService/index.test.ts`
Expected: FAIL — cannot find module `./index`.

- [ ] **Step 3: Implement the service**

Create `packages/api/src/domain/EtsyReconcileService/index.ts`:

```typescript
import { APIError } from '@imapps/api-utils/hono';
import type { Design } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { EtsyClient } from '../EtsyClient';
import type { EtsyConnectionService } from '../EtsyConnectionService';
import type { IdGenerator } from '../IdGenerator';

export class EtsyReconcileService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly etsyClient: EtsyClient,
        private readonly etsyConnectionService: EtsyConnectionService,
        private readonly idGenerator: IdGenerator
    ) {}

    async createDesignFromListing(listingId: number, userId: string): Promise<{ designId: string }> {
        const shopId = await this.etsyConnectionService.getShopId(userId);
        const [listings, designs] = await Promise.all([
            this.etsyClient.getShopListingsActive(shopId),
            this.designRepo.getByUserId(userId),
        ]);

        if (!listings.some((l) => l.listingId === listingId)) {
            throw new APIError('Listing not found in your Etsy shop', 400);
        }
        if (designs.some((d) => d.etsy?.listingId === listingId)) {
            throw new APIError('This listing is already linked to a design', 409);
        }

        const detail = await this.etsyClient.getListingDetail(listingId);
        const designId = this.idGenerator.generate();

        const design: Design = {
            id: designId,
            userId,
            name: detail.title,
            description: detail.description,
            timeRequired: '00:00',
            materials: [],
            imageIds: [],
            diagramImageIds: [],
            makingNotes: '',
            price: detail.price,
            totalMaterialCosts: 0,
            dateAdded: new Date(),
            totalQuantity: 0,
            etsy: {
                listingId,
                state: 'active',
                lastPushedAt: null,
                pushIncomplete: true,
                imageUrls: detail.imageUrls,
            },
        };

        await this.designRepo.insert(design);
        return { designId };
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/api && bun test src/domain/EtsyReconcileService/index.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/EtsyReconcileService/index.ts packages/api/src/domain/EtsyReconcileService/index.test.ts
git commit -m "feat(api): add EtsyReconcileService.createDesignFromListing"
```

---

### Task 4: `EtsyReconcileService.linkListingToDesign`

**Files:**
- Modify: `packages/api/src/domain/EtsyReconcileService/index.ts`
- Test: `packages/api/src/domain/EtsyReconcileService/index.test.ts`

**Interfaces:**
- Consumes: same deps as Task 3, plus `DesignRepository.getByIdAndUserId`.
- Produces: `linkListingToDesign(listingId: number, designId: string, userId: string): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Append inside `packages/api/src/domain/EtsyReconcileService/index.test.ts` (after the `createDesignFromListing` describe block, before the final closing of file):

```typescript
describe('EtsyReconcileService.linkListingToDesign', () => {
    beforeEach(() => {
        for (const m of [
            ...Object.values(mockDesignRepo),
            ...Object.values(mockEtsyClient),
            ...Object.values(mockEtsyConnectionService),
            ...Object.values(mockIdGenerator),
        ]) {
            m.mockClear();
        }
        mockEtsyConnectionService.getShopId.mockResolvedValue(47408839);
        mockDesignRepo.getByUserId.mockResolvedValue([]);
        mockEtsyClient.getShopListingsActive.mockResolvedValue([
            { listingId: 555, title: 'Silver Ring', price: 25, url: 'https://etsy.com/555' },
        ]);
    });

    it('writes the etsy link onto an existing unlinked design', async () => {
        mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign({ id: 'design-9' }));

        await makeService().linkListingToDesign(555, 'design-9', 'user-1');

        expect(mockDesignRepo.update).toHaveBeenCalledTimes(1);
        const [id, updated] = mockDesignRepo.update.mock.calls[0]! as [string, Design];
        expect(id).toBe('design-9');
        expect(updated.etsy).toEqual({ listingId: 555, state: 'active', lastPushedAt: null });
    });

    it('rejects with 404 when the design does not belong to the user', async () => {
        mockDesignRepo.getByIdAndUserId.mockResolvedValue(null);
        await expect(makeService().linkListingToDesign(555, 'nope', 'user-1')).rejects.toMatchObject({ status: 404 });
        expect(mockDesignRepo.update).not.toHaveBeenCalled();
    });

    it('rejects with 409 when the design is already linked', async () => {
        mockDesignRepo.getByIdAndUserId.mockResolvedValue(
            makeDesign({ id: 'design-9', etsy: { listingId: 1, state: 'active', lastPushedAt: null } })
        );
        await expect(makeService().linkListingToDesign(555, 'design-9', 'user-1')).rejects.toMatchObject({ status: 409 });
        expect(mockDesignRepo.update).not.toHaveBeenCalled();
    });

    it('rejects with 400 when the listing is not in the shop', async () => {
        mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign({ id: 'design-9' }));
        await expect(makeService().linkListingToDesign(999, 'design-9', 'user-1')).rejects.toMatchObject({ status: 400 });
        expect(mockDesignRepo.update).not.toHaveBeenCalled();
    });

    it('rejects with 409 when the listing is already linked to another design', async () => {
        mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign({ id: 'design-9' }));
        mockDesignRepo.getByUserId.mockResolvedValue([
            makeDesign({ id: 'design-7', etsy: { listingId: 555, state: 'active', lastPushedAt: null } }),
        ]);
        await expect(makeService().linkListingToDesign(555, 'design-9', 'user-1')).rejects.toMatchObject({ status: 409 });
        expect(mockDesignRepo.update).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/api && bun test src/domain/EtsyReconcileService/index.test.ts`
Expected: FAIL — `linkListingToDesign` is not a function.

- [ ] **Step 3: Implement the method**

In `packages/api/src/domain/EtsyReconcileService/index.ts`, add this method to the class (after `createDesignFromListing`):

```typescript
async linkListingToDesign(listingId: number, designId: string, userId: string): Promise<void> {
    const design = await this.designRepo.getByIdAndUserId(designId, userId);
    if (!design) {
        throw new APIError('Design not found', 404);
    }
    if (design.etsy?.listingId) {
        throw new APIError('This design is already linked to an Etsy listing', 409);
    }

    const shopId = await this.etsyConnectionService.getShopId(userId);
    const [listings, designs] = await Promise.all([
        this.etsyClient.getShopListingsActive(shopId),
        this.designRepo.getByUserId(userId),
    ]);

    if (!listings.some((l) => l.listingId === listingId)) {
        throw new APIError('Listing not found in your Etsy shop', 400);
    }
    if (designs.some((d) => d.etsy?.listingId === listingId)) {
        throw new APIError('This listing is already linked to a design', 409);
    }

    const updated: Design = { ...design, etsy: { listingId, state: 'active', lastPushedAt: null } };
    await this.designRepo.update(designId, updated);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/api && bun test src/domain/EtsyReconcileService/index.test.ts`
Expected: PASS (8 tests total across both describe blocks).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/EtsyReconcileService/index.ts packages/api/src/domain/EtsyReconcileService/index.test.ts
git commit -m "feat(api): add EtsyReconcileService.linkListingToDesign"
```

---

### Task 5: Wire DI, handlers, and routes

**Files:**
- Modify: `packages/api/src/dependencies/types.ts` (add token + Dependencies entry)
- Modify: `packages/api/src/dependencies/index.ts` (register singleton)
- Modify: `packages/api/src/handlers/Etsy/index.ts` (two handlers)
- Modify: `packages/api/src/routes/index.ts` (two routes)
- Test: `packages/api/src/handlers/Etsy/reconcile.test.ts`

**Interfaces:**
- Consumes: `EtsyReconcileService` from Task 3/4; `DependencyToken`, `dependencyContainer`.
- Produces: handlers `createDesignFromEtsyListing`, `linkEtsyListingToDesign`; routes `POST /api/etsy/reconcile/create`, `POST /api/etsy/reconcile/link`.

- [ ] **Step 1: Register the DI token**

In `packages/api/src/dependencies/types.ts`:
- Add import near the other Etsy imports: `import type { EtsyReconcileService } from '../domain/EtsyReconcileService';`
- Add to the `DependencyToken` enum, next to `EtsyStatusService`: `EtsyReconcileService = 'EtsyReconcileService',`
- Add to the `Dependencies` type, next to the `EtsyStatusService` entry: `[DependencyToken.EtsyReconcileService]: EtsyReconcileService;`

- [ ] **Step 2: Register the singleton**

In `packages/api/src/dependencies/index.ts`:
- Add import near the other Etsy imports: `import { EtsyReconcileService } from '../domain/EtsyReconcileService';`
- After the `EtsyStatusService` registration block, add:

```typescript
    dependencyContainer.registerSingleton(
        DependencyToken.EtsyReconcileService,
        {
            useFactory: () =>
                new EtsyReconcileService(
                    dependencyContainer.resolve(DependencyToken.DesignRepository),
                    dependencyContainer.resolve(DependencyToken.EtsyClient),
                    dependencyContainer.resolve(DependencyToken.EtsyConnectionService),
                    dependencyContainer.resolve(DependencyToken.IdGenerator)
                ),
        }
    );
```

(Match the exact `registerSingleton(token, { useFactory: () => ... })` shape used by the neighbouring `EtsyStatusService` block — copy its punctuation.)

- [ ] **Step 3: Write the failing handler test**

Create `packages/api/src/handlers/Etsy/reconcile.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test';
import * as etsyHandlers from './index';

describe('Etsy reconcile handlers', () => {
    it('exports createDesignFromEtsyListing', () => {
        expect(typeof etsyHandlers.createDesignFromEtsyListing).toBe('function');
    });
    it('exports linkEtsyListingToDesign', () => {
        expect(typeof etsyHandlers.linkEtsyListingToDesign).toBe('function');
    });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd packages/api && bun test src/handlers/Etsy/reconcile.test.ts`
Expected: FAIL — handlers are `undefined`.

- [ ] **Step 5: Add the handlers**

In `packages/api/src/handlers/Etsy/index.ts`, add near the other service getters:

```typescript
const getReconcileService = (): EtsyReconcileService =>
    dependencyContainer.resolve(DependencyToken.EtsyReconcileService);
```

Add the import at the top with the other domain type imports:

```typescript
import type { EtsyReconcileService } from '../../domain/EtsyReconcileService';
```

Add the two handlers (mirror the `pushDesignToEtsy` error-surfacing style):

```typescript
export const createDesignFromEtsyListing = async (c: AuthedCtx) => {
    const { listingId } = (await c.req.json()) as { listingId: number };
    try {
        const result = await getReconcileService().createDesignFromListing(listingId, c.get('userId'));
        return c.json(result, 201);
    } catch (error) {
        dependencyContainer.resolve(DependencyToken.Logger).error('Etsy reconcile create failed', {
            listingId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
};

export const linkEtsyListingToDesign = async (c: AuthedCtx) => {
    const { listingId, designId } = (await c.req.json()) as { listingId: number; designId: string };
    try {
        await getReconcileService().linkListingToDesign(listingId, designId, c.get('userId'));
        return c.json({ message: 'Listing linked to design' }, 200);
    } catch (error) {
        dependencyContainer.resolve(DependencyToken.Logger).error('Etsy reconcile link failed', {
            listingId,
            designId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
};
```

- [ ] **Step 6: Wire the routes**

In `packages/api/src/routes/index.ts`:
- Add `createDesignFromEtsyListing,` and `linkEtsyListingToDesign,` to the destructured import from `'../handlers/Etsy'`.
- After the `getEtsyShopListings` route line, add:

```typescript
    app.post('/api/etsy/reconcile/create', authenticate, createDesignFromEtsyListing);
    app.post('/api/etsy/reconcile/link', authenticate, linkEtsyListingToDesign);
```

- [ ] **Step 7: Run the handler test + full api suite**

Run: `cd packages/api && bun test src/handlers/Etsy/reconcile.test.ts && bun test`
Expected: reconcile test PASS; full suite PASS (no regressions).

- [ ] **Step 8: Commit**

```bash
git add packages/api/src/dependencies packages/api/src/handlers/Etsy packages/api/src/routes/index.ts
git commit -m "feat(api): wire EtsyReconcileService handlers and routes"
```

---

### Task 6: Web endpoint client + `useEtsyReconcile` hook

**Files:**
- Modify: `packages/web/src/api/endpoints.ts` (two endpoint consts)
- Create: `packages/web/src/api/endpoints/etsyReconcile/index.ts`
- Create: `packages/web/src/hooks/useEtsyReconcile.ts`

**Interfaces:**
- Consumes: `makeRequestWithAutoRefresh`, `MethodType`, `useAuth`, `useMutation`, `useQueryClient`.
- Produces:
  ```typescript
  makeCreateDesignFromListingRequest(listingId, getToken, onRefresh, onClear): Promise<{ designId: string }>
  makeLinkListingToDesignRequest(listingId, designId, getToken, onRefresh, onClear): Promise<{ message: string }>
  // hook:
  useEtsyReconcile(): { createFromListing, linkToDesign, isCreating, isLinking }
  ```

- [ ] **Step 1: Add endpoint constants**

In `packages/web/src/api/endpoints.ts`, after `ETSY_LISTINGS_ENDPOINT`:

```typescript
export const ETSY_RECONCILE_CREATE_ENDPOINT = '/api/etsy/reconcile/create';
export const ETSY_RECONCILE_LINK_ENDPOINT = '/api/etsy/reconcile/link';
```

- [ ] **Step 2: Create the endpoint client**

Create `packages/web/src/api/endpoints/etsyReconcile/index.ts`:

```typescript
import { MethodType } from '@jewellery-catalogue/types';

import { ETSY_RECONCILE_CREATE_ENDPOINT, ETSY_RECONCILE_LINK_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeCreateDesignFromListingRequest = (
    listingId: number,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<{ designId: string }>(
        {
            pathname: ETSY_RECONCILE_CREATE_ENDPOINT,
            method: MethodType.POST,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'create design from etsy listing',
            body: { listingId },
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );

export const makeLinkListingToDesignRequest = (
    listingId: number,
    designId: string,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<{ message: string }>(
        {
            pathname: ETSY_RECONCILE_LINK_ENDPOINT,
            method: MethodType.POST,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'link etsy listing to design',
            body: { listingId, designId },
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
```

- [ ] **Step 3: Create the hook**

Create `packages/web/src/hooks/useEtsyReconcile.ts`:

```typescript
import { useAuth } from '@imapps/web-utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
    makeCreateDesignFromListingRequest,
    makeLinkListingToDesignRequest,
} from '../api/endpoints/etsyReconcile';

export const useEtsyReconcile = () => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: (listingId: number) =>
            makeCreateDesignFromListingRequest(listingId, () => accessToken, login, logout),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['etsy-listings'] });
            queryClient.invalidateQueries({ queryKey: ['designs'] });
        },
    });

    const linkMutation = useMutation({
        mutationFn: ({ listingId, designId }: { listingId: number; designId: string }) =>
            makeLinkListingToDesignRequest(listingId, designId, () => accessToken, login, logout),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['etsy-listings'] });
            queryClient.invalidateQueries({ queryKey: ['designs'] });
        },
    });

    return {
        createFromListing: createMutation.mutateAsync,
        linkToDesign: linkMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isLinking: linkMutation.isPending,
    };
};
```

- [ ] **Step 4: Verify web build**

Run: `bunx tsc --build --force` (from repo root)
Expected: exit 0. Then `git clean -fd -- packages/` to drop generated artifacts.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/api/endpoints.ts packages/web/src/api/endpoints/etsyReconcile packages/web/src/hooks/useEtsyReconcile.ts
git commit -m "feat(web): add etsy reconcile endpoints and useEtsyReconcile hook"
```

---

### Task 7: Listings page actions + Link-existing dialog

**Files:**
- Create: `packages/web/src/components/LinkDesignDialog/index.tsx`
- Modify: `packages/web/src/pages/Listings/index.tsx`

**Interfaces:**
- Consumes: `useEtsyReconcile` (Task 6), `getDesignsQuery` from `../../api/endpoints/getDesigns`, `useAuth`, `useQuery`, UI `dialog`/`button`/`table` primitives, `useNavigate`, `VIEW_DESIGN_PAGE`.
- Produces: `LinkDesignDialog` component:
  ```typescript
  interface LinkDesignDialogProps {
      listingId: number;
      open: boolean;
      onOpenChange: (open: boolean) => void;
      onLinked: () => void;
  }
  ```

- [ ] **Step 1: Build the Link-existing dialog**

Create `packages/web/src/components/LinkDesignDialog/index.tsx`:

```tsx
import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';

import { getDesignsQuery } from '../../api/endpoints/getDesigns';
import { useEtsyReconcile } from '../../hooks/useEtsyReconcile';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

interface LinkDesignDialogProps {
    listingId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLinked: () => void;
}

export const LinkDesignDialog: React.FC<LinkDesignDialogProps> = ({ listingId, open, onOpenChange, onLinked }) => {
    const { accessToken, login, logout } = useAuth();
    const { linkToDesign, isLinking } = useEtsyReconcile();

    const { data: designs } = useQuery({
        ...getDesignsQuery(() => accessToken, login, logout),
        enabled: open && !!accessToken,
    });

    const unlinked = (designs ?? []).filter((d) => !d.etsy?.listingId);

    const handleLink = async (designId: string) => {
        await linkToDesign({ listingId, designId });
        onLinked();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Link an existing design</DialogTitle>
                    <DialogDescription>Pick a design to link to this Etsy listing.</DialogDescription>
                </DialogHeader>
                <div className="max-h-80 overflow-y-auto divide-y">
                    {unlinked.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">No unlinked designs available.</p>
                    ) : (
                        unlinked.map((d) => (
                            <div key={d.id} className="flex items-center justify-between py-2">
                                <span className="text-sm">{d.name}</span>
                                <Button size="sm" variant="secondary" disabled={isLinking} onClick={() => handleLink(d.id)}>
                                    Link
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
```

(If the `dialog` primitive does not export `DialogDescription`, open `packages/web/src/components/ui/dialog.tsx` and use whatever subcomponents it does export — match the existing dialog usage in `EtsyPushDialog`.)

- [ ] **Step 2: Wire actions into the Listings table**

In `packages/web/src/pages/Listings/index.tsx`:
- Add imports:
  ```tsx
  import { useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { Button } from '../../components/ui/button';
  import { LinkDesignDialog } from '../../components/LinkDesignDialog';
  import { useEtsyReconcile } from '../../hooks/useEtsyReconcile';
  ```
- Inside the `Listings` component, add:
  ```tsx
  const navigate = useNavigate();
  const { createFromListing, isCreating } = useEtsyReconcile();
  const [linkDialogListingId, setLinkDialogListingId] = useState<number | null>(null);

  const handleCreate = async (listingId: number) => {
      const { designId } = await createFromListing(listingId);
      navigate(VIEW_DESIGN_PAGE.getRoute(designId));
  };
  ```
- Replace the `Not linked` badge branch (lines ~90-92) so an unlinked row renders actions instead:
  ```tsx
  {listing.linkedDesignId ? (
      <Link to={VIEW_DESIGN_PAGE.getRoute(listing.linkedDesignId)} className="text-primary hover:underline">
          View design
      </Link>
  ) : (
      <div className="flex gap-2">
          <Button size="sm" disabled={isCreating} onClick={() => handleCreate(listing.listingId)}>
              Create design
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setLinkDialogListingId(listing.listingId)}>
              Link existing
          </Button>
      </div>
  )}
  ```
- Before the closing `</div>` of the returned tree, render the dialog once:
  ```tsx
  {linkDialogListingId !== null && (
      <LinkDesignDialog
          listingId={linkDialogListingId}
          open={linkDialogListingId !== null}
          onOpenChange={(o) => !o && setLinkDialogListingId(null)}
          onLinked={() => setLinkDialogListingId(null)}
      />
  )}
  ```

- [ ] **Step 3: Verify web build**

Run: `bunx tsc --build --force` (from repo root)
Expected: exit 0. Then `git clean -fd -- packages/`.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/LinkDesignDialog packages/web/src/pages/Listings/index.tsx
git commit -m "feat(web): add create/link design actions to Etsy Listings page"
```

---

### Task 8: Render `etsy.imageUrls` on ViewDesign when a stub has no internal images

**Files:**
- Modify: `packages/web/src/pages/ViewDesign/index.tsx:51,163-176`

**Interfaces:**
- Consumes: `etsy` from the design object (already destructured or add it).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Destructure `etsy` from the design**

In `packages/web/src/pages/ViewDesign/index.tsx`, add `etsy,` to the object destructured from the design (near line 51 where `imageIds` is pulled).

- [ ] **Step 2: Add the external-image fallback in the image block**

In the left sticky-image block (around line 163), replace the outer conditional so it also handles `etsy.imageUrls`. The internal-id path is unchanged; only the empty-`imageIds` branch gains a fallback:

```tsx
{imageIds && imageIds.length > 0 ? (
    <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${imageIndex * 100}%)` }}
    >
        {imageIds.map((id) => (
            <div key={id} className="w-full h-full flex-shrink-0">
                <Image imageId={id} />
            </div>
        ))}
    </div>
) : etsy?.imageUrls && etsy.imageUrls.length > 0 ? (
    <img src={etsy.imageUrls[0]} alt={name} className="w-full h-full object-cover rounded-md" />
) : (
    <Image imageId="" />
)}
```

(Use whatever variable holds the design name in this component for `alt`; if `name` isn't in scope, use `""`.)

- [ ] **Step 3: Verify web build**

Run: `bunx tsc --build --force` (from repo root)
Expected: exit 0. Then `git clean -fd -- packages/`.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/pages/ViewDesign/index.tsx
git commit -m "feat(web): show Etsy listing image on stub designs without internal images"
```

---

## Final verification

- [ ] Run the full api suite: `cd packages/api && bun test` — expect all green.
- [ ] Run repo-root type build: `bunx tsc --build --force` then `git clean -fd -- packages/`.
- [ ] Manual smoke (optional, needs Etsy connection): open Listings, on an unlinked row click **Create design** → lands on a pre-filled ViewDesign showing the Etsy photo; back on Listings the row shows **View design**. On another row click **Link existing** → pick a design → row flips to **View design**.

## Notes / out of scope

- Running the sub-project 5 CLI (`link-etsy-listings`) against prod to link the 5 pre-existing designs remains a separate one-time manual migration step.
- Images are linked (Etsy URLs), not copied into the internal store — revisit later if full offline source-of-truth is wanted.
