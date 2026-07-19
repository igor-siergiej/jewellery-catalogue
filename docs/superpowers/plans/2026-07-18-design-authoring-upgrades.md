# Design Authoring Upgrades (Sub-project 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give designs private "maker docs" (diagram photos + free-text notes that never reach Etsy) and a read-only price-suggestion formula beside the price field — Sub-project 2 of `docs/superpowers/specs/2026-07-16-etsy-api-integration-design.md`. No Etsy API calls of any kind; this sub-project doesn't depend on the OAuth connection working.

**Architecture:** Follows the exact patterns already in place for product images and the existing pricing panel: `diagramImageIds`/`makingNotes` are new `Design` fields uploaded/edited through the same multipart-form + `ImageService` pipeline as `imageIds`, just under separate field names so they never get mixed into the Etsy-facing photo list. The price suggestion is a pure, client-only formula (never persisted, never auto-applied) driven by two new `UserSettings` fields.

**Tech Stack:** Same as sub-project 1 — Bun + TypeScript + Hono (api), React + react-hook-form + Zod (web), MongoDB.

## Global Constraints

- `diagramImageIds`/`makingNotes` are **private maker documentation** — the push-to-Etsy mapper (built in sub-project 3, not this one) will only ever read a whitelisted field set from `Design`, and these two fields must never be added to that whitelist. This plan does not touch any Etsy code; the constraint just governs field naming/placement so a future reader doesn't assume they're photo-list candidates.
- Suggested price formula (verbatim from spec): `suggestedPrice = totalMaterialCosts × markupMultiplier + parsedTimeRequired(hours) × hourlyRate`. Defaults: `markupMultiplier = 2.5`, `hourlyRate = 0`.
- The suggestion is **read-only display only** — never auto-applied to the `price` field. A click on a "Use this price" button copies the value in; nothing else may mutate `price` from the suggestion.
- `timeRequired` is stored `"HH:MM"` string format; reuse the existing `getWageCosts(time: string): number` util (`packages/web/src/utils/getWageCost/index.ts`) to parse it to hours — do not reimplement time parsing.
- Diagram images reuse the exact upload/storage pipeline as product images (`ImageService.uploadImage`, same Mongo/bucket infra) — just a separate field name (`diagramImageIds` vs `imageIds`) so they're never confused with product photos.
- Follow the existing repo's layered pattern exactly: `packages/types` (zod schemas) → `packages/api/src/domain/DesignService` + `packages/api/src/handlers/Design` (server) → `packages/web/src/api/endpoints/*` + `packages/web/src/pages/*` + `packages/web/src/components/*` (client). Don't introduce a different pattern.
- Tests: `bun:test` for api (mocks via `mock()`, following `DesignService/index.test.ts` conventions), no new web test framework — this repo's web package doesn't have a unit-test runner wired up for components (only Playwright e2e exists under `packages/web/tests/e2e`); web-side changes in this plan are UI wiring with no new pure-logic web unit beyond `getSuggestedPrice`, which does get a `bun:test`-style unit test (the util is plain TS, testable the same way api utils are — see `packages/api/src/utils/material-conversion.test.ts` for the pattern, but this file lives in `packages/web` so use `packages/web/src/utils/getSuggestedPrice/index.test.ts` with the same `bun:test` API since the whole repo uses Bun as the test runner).
- Lint/format: `bun run lint` (Biome) must pass on touched files before each commit.

---

## File Structure

```
packages/types/src/design/index.ts                        # + diagramImageIds, makingNotes
packages/types/src/formDesign/index.ts                     # + diagramImages, makingNotes
packages/types/src/editDesign/index.ts                     # + diagramImageIds, makingNotes (optional)
packages/types/src/uploadDesign/index.ts                   # + makingNotes
packages/types/src/userSettings/index.ts                   # + markupMultiplier, hourlyRate

packages/api/src/domain/DesignService/index.ts              # addDesign/editDesignProperties: diagram images + makingNotes
packages/api/src/handlers/Design/index.ts                   # addDesign/editDesignProperties: parse diagramFiles/existingDiagramImageIds/keepDiagramImageIds/makingNotes
packages/api/src/domain/UserSettingsService/index.ts        # + markupMultiplier, hourlyRate defaults + upsert fields

packages/web/src/utils/getSuggestedPrice/index.ts            # new pure formula util
packages/web/src/utils/getSuggestedPrice/index.test.ts
packages/web/src/api/endpoints/addDesign/index.ts            # + diagramImages FormData handling
packages/web/src/api/endpoints/editDesign/index.ts           # + diagramImages FormData handling
packages/web/src/api/endpoints/userSettings/index.ts         # + markupMultiplier, hourlyRate
packages/web/src/hooks/useUserSettings.ts                    # + markupMultiplier, hourlyRate
packages/web/src/components/MakerDocsSection/index.tsx       # new shared "Maker docs" form section (diagram upload + notes)
packages/web/src/components/SuggestedPrice/index.tsx         # new read-only suggestion + "Use this price" button
packages/web/src/pages/AddDesign/index.tsx                   # + Maker docs section, + suggested price
packages/web/src/components/DesignEditForm/index.tsx         # + Maker docs section, + suggested price
packages/web/src/components/VariationGroupBuilder/index.tsx  # + per-variant suggested price column
packages/web/src/pages/Settings/index.tsx                    # + markupMultiplier, hourlyRate fields (Pricing section)
packages/web/src/pages/ViewDesign/index.tsx                  # + Maker docs display (diagram gallery + notes)
```

---

### Task 1: Types — schema additions

**Files:**
- Modify: `packages/types/src/design/index.ts`
- Modify: `packages/types/src/formDesign/index.ts`
- Modify: `packages/types/src/editDesign/index.ts`
- Modify: `packages/types/src/uploadDesign/index.ts`
- Modify: `packages/types/src/userSettings/index.ts`

**Interfaces:**
- Produces: `Design.diagramImageIds: string[]`, `Design.makingNotes: string`, `FormDesign.diagramImages: Array<File|string>`, `FormDesign.makingNotes: string`, `EditDesign.diagramImageIds?: string[]`, `EditDesign.makingNotes?: string`, `UploadDesign.makingNotes: string`, `UserSettings.markupMultiplier: number`, `UserSettings.hourlyRate: number` — consumed by every later task in this plan.

- [ ] **Step 1: Add fields to `designSchema`**

In `packages/types/src/design/index.ts`, add two lines to the `z.object({...})` (after `imageIds`):

```typescript
    imageIds: z.array(z.string()),
    diagramImageIds: z.array(z.string()).default([]),
    makingNotes: z.string().default(''),
```

- [ ] **Step 2: Add fields to `formDesignSchema`**

In `packages/types/src/formDesign/index.ts`, add to the `.object({...})` (after `images`):

```typescript
        images: z
            .array(z.union([z.instanceof(File), z.string()]))
            .optional()
            .default([]),
        diagramImages: z
            .array(z.union([z.instanceof(File), z.string()]))
            .optional()
            .default([]),
        makingNotes: z.string().optional().default(''),
```

- [ ] **Step 3: Add fields to `editDesignSchema`**

In `packages/types/src/editDesign/index.ts`, add (both optional, matching every other field in this schema):

```typescript
    diagramImageIds: z.array(z.string()).optional(),
    makingNotes: z.string().optional(),
```

- [ ] **Step 4: Add field to `UploadDesign`**

In `packages/types/src/uploadDesign/index.ts`, add to the interface:

```typescript
export interface UploadDesign {
    materials: string;
    name: string;
    description: string;
    timeRequired: string;
    image: PersistentFile;
    totalMaterialCosts: number;
    price: number;
    lowStockThreshold?: number;
    variationGroups?: string;
    variants?: string;
    designType?: DesignType;
    makingNotes?: string;
}
```

- [ ] **Step 5: Add fields to `userSettingsSchema`**

In `packages/types/src/userSettings/index.ts`:

```typescript
import { z } from 'zod';

export const userSettingsSchema = z.object({
    userId: z.string(),
    hourlyWage: z.number().nonnegative(),
    profitMargin: z.number().nonnegative(),
    markupMultiplier: z.number().nonnegative(),
    hourlyRate: z.number().nonnegative(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;
```

- [ ] **Step 6: Typecheck**

Run: `cd packages/types && bunx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add packages/types/src/design/index.ts packages/types/src/formDesign/index.ts packages/types/src/editDesign/index.ts packages/types/src/uploadDesign/index.ts packages/types/src/userSettings/index.ts
git commit -m "feat(types): add maker-docs and price-suggestion fields"
```

---

### Task 2: API — diagram images + makingNotes on the create-design flow

**Files:**
- Modify: `packages/api/src/domain/DesignService/index.ts` (the `addDesign` method)
- Modify: `packages/api/src/domain/DesignService/index.test.ts`
- Modify: `packages/api/src/handlers/Design/index.ts` (the `addDesign` handler)

**Interfaces:**
- Consumes: `Design.diagramImageIds`/`makingNotes`, `UploadDesign.makingNotes` (Task 1).
- Produces: `DesignService.addDesign(designData: UploadDesign, imageBuffers, existingImageIds, diagramImageBuffers: Array<{buffer: Buffer; contentType: string}>, existingDiagramImageIds: string[], userId: string): Promise<Design>` (note the two new parameters, inserted after `existingImageIds` and before `userId`) — consumed by the handler in this task and reviewed by later tasks for signature consistency.

- [ ] **Step 1: Write the failing test**

Add to `packages/api/src/domain/DesignService/index.test.ts`, inside the existing `describe('DesignService')` block (find the existing `describe('addDesign', ...)` block and add this test inside it — read the file first to match the existing mock setup exactly, in particular reuse the existing `mockDesignRepo`/`mockImageService`/`mockIdGenerator` from the top of the file):

```typescript
describe('addDesign — maker docs', () => {
    it('uploads diagram images separately from product images and stores both id lists plus makingNotes', async () => {
        mockIdGenerator.generate
            .mockReturnValueOnce('design-1')
            .mockReturnValueOnce('product-img-1')
            .mockReturnValueOnce('diagram-img-1');
        mockImageService.uploadImage.mockResolvedValue(undefined);

        const designData = {
            name: 'Test',
            description: 'desc',
            timeRequired: '01:00',
            materials: JSON.stringify([]),
            totalMaterialCosts: 10,
            price: 20,
            image: undefined,
            makingNotes: 'Solder the clasp before adding the chain.',
        } as any;

        const result = await service.addDesign(
            designData,
            [{ buffer: Buffer.from('product'), contentType: 'image/png' }],
            [],
            [{ buffer: Buffer.from('diagram'), contentType: 'image/png' }],
            [],
            'user-1'
        );

        expect(result.imageIds).toEqual(['product-img-1']);
        expect(result.diagramImageIds).toEqual(['diagram-img-1']);
        expect(result.makingNotes).toBe('Solder the clasp before adding the chain.');
        expect(mockImageService.uploadImage).toHaveBeenCalledTimes(2);
    });

    it('defaults makingNotes to empty string and diagramImageIds to empty array when omitted', async () => {
        mockIdGenerator.generate.mockReturnValueOnce('design-2');

        const designData = {
            name: 'Test',
            description: 'desc',
            timeRequired: '01:00',
            materials: JSON.stringify([]),
            totalMaterialCosts: 10,
            price: 20,
            image: undefined,
        } as any;

        const result = await service.addDesign(designData, [], [], [], [], 'user-1');

        expect(result.diagramImageIds).toEqual([]);
        expect(result.makingNotes).toBe('');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/DesignService/index.test.ts`
Expected: FAIL — `service.addDesign` called with 6 args but current signature only accepts 4 (TypeScript error or wrong-arity runtime behavior)

- [ ] **Step 3: Update `DesignService.addDesign`**

In `packages/api/src/domain/DesignService/index.ts`, replace the `addDesign` method signature and body:

```typescript
    async addDesign(
        designData: UploadDesign,
        imageBuffers: Array<{ buffer: Buffer; contentType: string }>,
        existingImageIds: string[],
        diagramImageBuffers: Array<{ buffer: Buffer; contentType: string }>,
        existingDiagramImageIds: string[],
        userId: string
    ): Promise<Design> {
        if (!userId) {
            throw Object.assign(new Error('User ID is required'), { status: 400 });
        }

        const designId = this.idGenerator.generate();

        const newImageIds = await Promise.all(
            imageBuffers.map(async ({ buffer, contentType }) => {
                const imageId = this.idGenerator.generate();
                await this.imageService.uploadImage(imageId, buffer, contentType);
                return imageId;
            })
        );

        const newDiagramImageIds = await Promise.all(
            diagramImageBuffers.map(async ({ buffer, contentType }) => {
                const imageId = this.idGenerator.generate();
                await this.imageService.uploadImage(imageId, buffer, contentType);
                return imageId;
            })
        );

        const imageIds = [...existingImageIds, ...newImageIds];
        const diagramImageIds = [...existingDiagramImageIds, ...newDiagramImageIds];

        let materials: Array<RequiredMaterial>;

        try {
            materials =
                typeof designData.materials === 'string' ? JSON.parse(designData.materials) : designData.materials;
        } catch {
            throw Object.assign(new Error('Invalid materials format'), { status: 400 });
        }

        let variationGroups: VariationGroup[] | undefined;
        let variants: DesignVariant[] | undefined;

        if (designData.variationGroups) {
            try {
                variationGroups =
                    typeof designData.variationGroups === 'string'
                        ? JSON.parse(designData.variationGroups)
                        : designData.variationGroups;
            } catch {
                throw Object.assign(new Error('Invalid variationGroups format'), { status: 400 });
            }
        }

        if (designData.variants) {
            try {
                const parsed: DesignVariant[] =
                    typeof designData.variants === 'string' ? JSON.parse(designData.variants) : designData.variants;
                variants = parsed.map((v) => ({ ...v, totalQuantity: 0 }));
            } catch {
                throw Object.assign(new Error('Invalid variants format'), { status: 400 });
            }
        }

        const design: Design = {
            id: designId,
            userId: userId,
            name: designData.name,
            description: designData.description,
            timeRequired: designData.timeRequired,
            totalMaterialCosts: designData.totalMaterialCosts,
            price: designData.price,
            imageIds,
            diagramImageIds,
            makingNotes: designData.makingNotes ?? '',
            materials,
            dateAdded: new Date(),
            totalQuantity: 0,
            lowStockThreshold: designData.lowStockThreshold,
            variationGroups,
            variants,
            designType: designData.designType,
        };

        await this.designRepo.insert(design);

        return design;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/DesignService/index.test.ts`
Expected: PASS (including all pre-existing `addDesign` tests — check none of them broke from the new required parameters; if any pre-existing test calls `service.addDesign(...)` with the old 4-arg signature, update those call sites to pass `[]` and `[]` for the two new params, since this is a source-compatible-but-not-binary-compatible internal method change)

- [ ] **Step 5: Update the `addDesign` handler**

In `packages/api/src/handlers/Design/index.ts`, replace the `addDesign` handler:

```typescript
export const addDesign = async (c: Ctx) => {
    const userId = c.get('userId');
    const isJson = (c.req.header('content-type') ?? '').includes('application/json');
    const body = isJson ? await c.req.json() : await c.req.parseBody({ all: true });
    const files = isJson ? [] : collectFiles(body.files);
    const diagramFiles = isJson ? [] : collectFiles(body.diagramFiles);

    const {
        name,
        description,
        timeRequired,
        materials,
        totalMaterialCosts,
        price,
        lowStockThreshold,
        variationGroups,
        variants,
        designType,
        makingNotes,
        existingImageIds: existingImageIdsRaw,
        existingDiagramImageIds: existingDiagramImageIdsRaw,
    } = body as unknown as Partial<UploadDesign> & {
        existingImageIds?: string;
        existingDiagramImageIds?: string;
        designType?: string;
    };

    const existingImageIds: string[] =
        typeof existingImageIdsRaw === 'string' && existingImageIdsRaw ? JSON.parse(existingImageIdsRaw) : [];
    const existingDiagramImageIds: string[] =
        typeof existingDiagramImageIdsRaw === 'string' && existingDiagramImageIdsRaw
            ? JSON.parse(existingDiagramImageIdsRaw)
            : [];

    if (files.length === 0 && existingImageIds.length === 0) {
        throw new APIError('At least one image file or imageId is required', 400);
    }

    const designData: UploadDesign = {
        name: name!,
        description: description!,
        timeRequired: timeRequired!,
        materials: materials!,
        totalMaterialCosts: Number(totalMaterialCosts),
        price: Number(price),
        image: files[0]! as unknown as UploadDesign['image'],
        lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : undefined,
        variationGroups,
        variants,
        designType,
        makingNotes,
    };

    const imageBuffers = await Promise.all(files.map(toImageBuffer));
    const diagramImageBuffers = await Promise.all(diagramFiles.map(toImageBuffer));
    const design = await getDesignService().addDesign(
        designData,
        imageBuffers,
        existingImageIds,
        diagramImageBuffers,
        existingDiagramImageIds,
        userId
    );
    return c.json(design, 200);
};
```

- [ ] **Step 6: Run the full api test suite**

Run: `cd packages/api && bun test`
Expected: all tests pass (including `handlers/Design/index.test.ts` — if it directly asserts on `addDesign`'s call arguments to `DesignService`, check and update those assertions for the new parameters)

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/domain/DesignService/index.ts packages/api/src/domain/DesignService/index.test.ts packages/api/src/handlers/Design/index.ts
git commit -m "feat(api): support diagram images and making notes on design create"
```

---

### Task 3: API — diagram images + makingNotes on the edit-design flow

**Files:**
- Modify: `packages/api/src/domain/DesignService/index.ts` (the `editDesignProperties` method)
- Modify: `packages/api/src/domain/DesignService/index.test.ts`
- Modify: `packages/api/src/handlers/Design/index.ts` (the `editDesignProperties` handler)

**Interfaces:**
- Consumes: `Design.diagramImageIds`/`makingNotes`, `EditDesign.diagramImageIds`/`makingNotes` (Task 1).
- Produces: `DesignService.editDesignProperties(id, updates: EditDesign, imageBuffers, keepImageIds: string[], diagramImageBuffers: Array<{buffer: Buffer; contentType: string}>, keepDiagramImageIds: string[], userId: string): Promise<Design>` (two new parameters inserted after `keepImageIds` and before `userId`).

- [ ] **Step 1: Write the failing test**

Add to `packages/api/src/domain/DesignService/index.test.ts`, inside the existing `describe('editDesignProperties', ...)` block:

```typescript
describe('editDesignProperties — maker docs', () => {
    it('merges kept + newly uploaded diagram image ids and updates makingNotes', async () => {
        const existing: Design = {
            id: 'design-1',
            userId: 'user-1',
            name: 'Existing',
            description: 'desc',
            timeRequired: '01:00',
            materials: [],
            imageIds: ['product-1'],
            diagramImageIds: ['old-diagram-1', 'old-diagram-2'],
            makingNotes: 'Old notes',
            price: 20,
            totalMaterialCosts: 10,
            dateAdded: new Date(),
            totalQuantity: 0,
        };
        mockDesignRepo.getByIdAndUserId.mockResolvedValue(existing);
        mockIdGenerator.generate.mockReturnValueOnce('new-diagram-1');
        mockImageService.uploadImage.mockResolvedValue(undefined);

        const result = await service.editDesignProperties(
            'design-1',
            { makingNotes: 'Updated notes' },
            [],
            ['product-1'],
            [{ buffer: Buffer.from('diagram'), contentType: 'image/png' }],
            ['old-diagram-1'],
            'user-1'
        );

        expect(result.diagramImageIds).toEqual(['old-diagram-1', 'new-diagram-1']);
        expect(result.makingNotes).toBe('Updated notes');
        expect(result.imageIds).toEqual(['product-1']);
    });

    it('leaves diagramImageIds and makingNotes unchanged when not part of the update', async () => {
        const existing: Design = {
            id: 'design-1',
            userId: 'user-1',
            name: 'Existing',
            description: 'desc',
            timeRequired: '01:00',
            materials: [],
            imageIds: ['product-1'],
            diagramImageIds: ['old-diagram-1'],
            makingNotes: 'Keep me',
            price: 20,
            totalMaterialCosts: 10,
            dateAdded: new Date(),
            totalQuantity: 0,
        };
        mockDesignRepo.getByIdAndUserId.mockResolvedValue(existing);

        const result = await service.editDesignProperties(
            'design-1',
            { name: 'Renamed' },
            [],
            ['product-1'],
            [],
            ['old-diagram-1'],
            'user-1'
        );

        expect(result.diagramImageIds).toEqual(['old-diagram-1']);
        expect(result.makingNotes).toBe('Keep me');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/DesignService/index.test.ts`
Expected: FAIL — wrong arity / `diagramImageIds` not merged

- [ ] **Step 3: Update `DesignService.editDesignProperties`**

In `packages/api/src/domain/DesignService/index.ts`, replace the `editDesignProperties` method:

```typescript
    async editDesignProperties(
        id: string,
        updates: EditDesign,
        imageBuffers: Array<{ buffer: Buffer; contentType: string }>,
        keepImageIds: string[],
        diagramImageBuffers: Array<{ buffer: Buffer; contentType: string }>,
        keepDiagramImageIds: string[],
        userId: string
    ): Promise<Design> {
        if (!id) {
            throw Object.assign(new Error('Design ID is required'), { status: 400 });
        }

        const existing = await this.designRepo.getByIdAndUserId(id, userId);

        if (!existing) {
            throw Object.assign(new Error('Design not found'), { status: 404 });
        }

        const newImageIds = await Promise.all(
            imageBuffers.map(async ({ buffer, contentType }) => {
                const imageId = this.idGenerator.generate();
                await this.imageService.uploadImage(imageId, buffer, contentType);
                return imageId;
            })
        );

        const newDiagramImageIds = await Promise.all(
            diagramImageBuffers.map(async ({ buffer, contentType }) => {
                const imageId = this.idGenerator.generate();
                await this.imageService.uploadImage(imageId, buffer, contentType);
                return imageId;
            })
        );

        const imageIds = [...keepImageIds, ...newImageIds];
        const diagramImageIds = [...keepDiagramImageIds, ...newDiagramImageIds];

        let materials = existing.materials;
        if (updates.materials) {
            materials = typeof updates.materials === 'string' ? JSON.parse(updates.materials) : updates.materials;
        }

        let variationGroups = existing.variationGroups;
        let variants = existing.variants;

        if (updates.variationGroups !== undefined) {
            variationGroups = updates.variationGroups;
        }

        if (updates.variants !== undefined) {
            variants = mergeVariants(existing.variants ?? [], updates.variants);
        }

        const updated: Design = {
            ...existing,
            ...updates,
            materials,
            imageIds,
            diagramImageIds,
            makingNotes: updates.makingNotes ?? existing.makingNotes,
            variationGroups,
            variants,
        };

        await this.designRepo.update(id, updated);

        return updated;
    }
```

Note: `diagramImageIds` is always recomputed from `keepDiagramImageIds`/new uploads (same as `imageIds` already does) rather than falling through `...updates`, so it can't be silently overwritten by a stray `updates.diagramImageIds` — this mirrors exactly how `imageIds` already avoids that trap in this method.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/DesignService/index.test.ts`
Expected: PASS (fix any pre-existing `editDesignProperties` test call sites the same way as Task 2 — pass `[]` and the design's current `diagramImageIds` for the two new params)

- [ ] **Step 5: Update the `editDesignProperties` handler**

In `packages/api/src/handlers/Design/index.ts`, replace the `editDesignProperties` handler:

```typescript
export const editDesignProperties = async (c: Ctx) => {
    const userId = c.get('userId');
    const body = await c.req.parseBody({ all: true });
    const files = collectFiles(body.files);
    const diagramFiles = collectFiles(body.diagramFiles);

    const {
        name,
        description,
        timeRequired,
        materials,
        totalMaterialCosts,
        price,
        lowStockThreshold,
        variationGroups,
        variants,
        designType,
        makingNotes,
        keepImageIds: keepImageIdsRaw,
        keepDiagramImageIds: keepDiagramImageIdsRaw,
    } = body as unknown as Partial<EditDesign> & {
        lowStockThreshold?: string;
        variationGroups?: string;
        variants?: string;
        keepImageIds?: string;
        keepDiagramImageIds?: string;
        designType?: string;
    };

    const keepImageIds: string[] =
        typeof keepImageIdsRaw === 'string' && keepImageIdsRaw ? JSON.parse(keepImageIdsRaw) : [];
    const keepDiagramImageIds: string[] =
        typeof keepDiagramImageIdsRaw === 'string' && keepDiagramImageIdsRaw ? JSON.parse(keepDiagramImageIdsRaw) : [];

    const imageBuffers = await Promise.all(files.map(toImageBuffer));
    const diagramImageBuffers = await Promise.all(diagramFiles.map(toImageBuffer));
    const updates: EditDesign = {};

    if (name) updates.name = name as EditDesign['name'];
    if (description !== undefined) updates.description = description as EditDesign['description'];
    if (timeRequired) updates.timeRequired = timeRequired as EditDesign['timeRequired'];
    if (materials) updates.materials = materials as EditDesign['materials'];
    if (totalMaterialCosts !== undefined) updates.totalMaterialCosts = Number(totalMaterialCosts);
    if (price !== undefined) updates.price = Number(price);
    if (variationGroups !== undefined) {
        updates.variationGroups = typeof variationGroups === 'string' ? JSON.parse(variationGroups) : variationGroups;
    }
    if (variants !== undefined) {
        updates.variants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    }
    if (designType !== undefined) updates.designType = designType as EditDesign['designType'];
    if (lowStockThreshold !== undefined) updates.lowStockThreshold = Number(lowStockThreshold);
    if (makingNotes !== undefined) updates.makingNotes = makingNotes as EditDesign['makingNotes'];

    const design = await getDesignService().editDesignProperties(
        c.req.param('id'),
        updates,
        imageBuffers,
        keepImageIds,
        diagramImageBuffers,
        keepDiagramImageIds,
        userId
    );
    return c.json(design, 200);
};
```

- [ ] **Step 6: Run the full api test suite**

Run: `cd packages/api && bun test`
Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/domain/DesignService/index.ts packages/api/src/domain/DesignService/index.test.ts packages/api/src/handlers/Design/index.ts
git commit -m "feat(api): support diagram images and making notes on design edit"
```

---

### Task 4: API — price-suggestion settings on `UserSettingsService`

**Files:**
- Modify: `packages/api/src/domain/UserSettingsService/index.ts`
- Modify: `packages/api/src/domain/UserSettingsService/index.test.ts` (create if it doesn't already exist — check first; if `UserSettingsService` currently has no test file, follow `DesignService/index.test.ts`'s mock-based style to create one covering both the pre-existing behavior and the new fields, since this task is extending untested code)
- Modify: `packages/api/src/handlers/UserSettings/index.ts`

**Interfaces:**
- Consumes: `UserSettings.markupMultiplier`/`hourlyRate` (Task 1).
- Produces: `UserSettingsService.get(userId)` now returns `markupMultiplier`/`hourlyRate` with defaults `2.5`/`0` when unset; `UserSettingsService.upsert(userId, { hourlyWage, profitMargin, markupMultiplier, hourlyRate })`.

- [ ] **Step 1: Check for an existing test file**

Run: `ls packages/api/src/domain/UserSettingsService/`
If `index.test.ts` exists, add to it. If not, create it fresh with a `describe('UserSettingsService')` block mirroring `DesignService/index.test.ts`'s mock style (`mockSettingsRepo`, `mockDesignRepo` mocks, `beforeEach` clearing them).

- [ ] **Step 2: Write the failing tests**

```typescript
describe('get', () => {
    it('returns markupMultiplier 2.5 and hourlyRate 0 defaults when no settings stored', async () => {
        mockSettingsRepo.getByUserId.mockResolvedValue(null);

        const result = await service.get('user-1');

        expect(result.markupMultiplier).toBe(2.5);
        expect(result.hourlyRate).toBe(0);
    });

    it('returns stored markupMultiplier and hourlyRate when present', async () => {
        mockSettingsRepo.getByUserId.mockResolvedValue({
            userId: 'user-1',
            hourlyWage: 10,
            profitMargin: 15,
            markupMultiplier: 3,
            hourlyRate: 5,
        });

        const result = await service.get('user-1');

        expect(result.markupMultiplier).toBe(3);
        expect(result.hourlyRate).toBe(5);
    });
});

describe('upsert — price suggestion fields', () => {
    it('persists markupMultiplier and hourlyRate alongside the existing fields', async () => {
        const result = await service.upsert('user-1', {
            hourlyWage: 12,
            profitMargin: 20,
            markupMultiplier: 2,
            hourlyRate: 8,
        });

        expect(result).toEqual({
            userId: 'user-1',
            hourlyWage: 12,
            profitMargin: 20,
            markupMultiplier: 2,
            hourlyRate: 8,
        });
        expect(mockSettingsRepo.upsert).toHaveBeenCalledWith(result);
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/UserSettingsService/index.test.ts`
Expected: FAIL — `markupMultiplier`/`hourlyRate` undefined, or wrong-arity `upsert` call

- [ ] **Step 4: Update `UserSettingsService`**

In `packages/api/src/domain/UserSettingsService/index.ts`:

```typescript
import type { UserSettings } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { UserSettingsRepository } from '../UserSettingsRepository';

const DEFAULT_HOURLY_WAGE = 10;
const DEFAULT_PROFIT_MARGIN = 15;
const DEFAULT_MARKUP_MULTIPLIER = 2.5;
const DEFAULT_HOURLY_RATE = 0;

function parseTimeToHours(timeRequired: string): number {
    const [hoursStr, minutesStr] = timeRequired.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
    return hours + minutes / 60;
}

function calcPrice(materialsCost: number, timeRequired: string, hourlyWage: number, profitMargin: number): number {
    const hours = parseTimeToHours(timeRequired);
    const labour = hours * hourlyWage;
    return parseFloat(((materialsCost + labour) * (1 + profitMargin / 100)).toFixed(2));
}

export class UserSettingsService {
    constructor(
        private readonly settingsRepo: UserSettingsRepository,
        private readonly designRepo: DesignRepository
    ) {}

    async get(userId: string): Promise<UserSettings> {
        const stored = await this.settingsRepo.getByUserId(userId);
        return (
            stored ?? {
                userId,
                hourlyWage: DEFAULT_HOURLY_WAGE,
                profitMargin: DEFAULT_PROFIT_MARGIN,
                markupMultiplier: DEFAULT_MARKUP_MULTIPLIER,
                hourlyRate: DEFAULT_HOURLY_RATE,
            }
        );
    }

    async upsert(
        userId: string,
        updates: { hourlyWage: number; profitMargin: number; markupMultiplier: number; hourlyRate: number }
    ): Promise<UserSettings> {
        const settings: UserSettings = { userId, ...updates };
        await this.settingsRepo.upsert(settings);
        return settings;
    }

    // ... recalculatePricesForMaterial and recalculatePrices are unchanged — do not touch them, they don't use markupMultiplier/hourlyRate
```

(Leave `recalculatePricesForMaterial` and `recalculatePrices` exactly as they are — they use `hourlyWage`/`profitMargin` only, which is a deliberately separate mechanism from the new `markupMultiplier`/`hourlyRate` price-suggestion formula per the spec.)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/UserSettingsService/index.test.ts`
Expected: PASS

- [ ] **Step 6: Update the `updateUserSettings` handler**

In `packages/api/src/handlers/UserSettings/index.ts`, replace `updateUserSettings`:

```typescript
export const updateUserSettings = async (c: Ctx) => {
    const { hourlyWage, profitMargin, markupMultiplier, hourlyRate } = (await c.req.json()) as {
        hourlyWage?: number;
        profitMargin?: number;
        markupMultiplier?: number;
        hourlyRate?: number;
    };

    if (
        hourlyWage === undefined ||
        profitMargin === undefined ||
        markupMultiplier === undefined ||
        hourlyRate === undefined
    ) {
        throw new APIError('hourlyWage, profitMargin, markupMultiplier and hourlyRate are required', 400);
    }

    return c.json(
        await getService().upsert(c.get('userId'), {
            hourlyWage: Number(hourlyWage),
            profitMargin: Number(profitMargin),
            markupMultiplier: Number(markupMultiplier),
            hourlyRate: Number(hourlyRate),
        })
    );
};
```

- [ ] **Step 7: Run the full api test suite**

Run: `cd packages/api && bun test`
Expected: all pass — check `handlers/UserSettings` has no dedicated test file to update (per Task 5 of the sub-project 1 plan's precedent, `UserSettingsDialog`/settings handlers weren't independently tested; if you find a test file here, update it the same way)

- [ ] **Step 8: Commit**

```bash
git add packages/api/src/domain/UserSettingsService packages/api/src/handlers/UserSettings/index.ts
git commit -m "feat(api): add markupMultiplier and hourlyRate to user settings"
```

---

### Task 5: Web — `getSuggestedPrice` util

**Files:**
- Create: `packages/web/src/utils/getSuggestedPrice/index.ts`
- Create: `packages/web/src/utils/getSuggestedPrice/index.test.ts`

**Interfaces:**
- Consumes: `getWageCosts` from `packages/web/src/utils/getWageCost/index.ts` (existing, `(time: string) => number`, returns hours).
- Produces: `getSuggestedPrice(args: { materialsCost: number; timeRequired: string; markupMultiplier: number; hourlyRate: number }): number` — consumed by Tasks 8, 9, 10.

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/web/src/utils/getSuggestedPrice/index.test.ts
import { describe, expect, it } from 'bun:test';

import { getSuggestedPrice } from './index';

describe('getSuggestedPrice', () => {
    it('applies materialsCost × markupMultiplier + hours × hourlyRate', () => {
        const result = getSuggestedPrice({
            materialsCost: 10,
            timeRequired: '02:00',
            markupMultiplier: 2.5,
            hourlyRate: 5,
        });

        // 10 * 2.5 = 25, + 2 hours * 5 = 10 -> 35
        expect(result).toBe(35);
    });

    it('handles minutes correctly (partial hours)', () => {
        const result = getSuggestedPrice({
            materialsCost: 0,
            timeRequired: '00:30',
            markupMultiplier: 1,
            hourlyRate: 10,
        });

        // 0.5 hours * 10 = 5
        expect(result).toBe(5);
    });

    it('rounds to 2 decimal places', () => {
        const result = getSuggestedPrice({
            materialsCost: 10,
            timeRequired: '00:10',
            markupMultiplier: 1.111,
            hourlyRate: 3,
        });

        // 10 * 1.111 = 11.11, + (10/60)*3 = 0.5 -> 11.61
        expect(result).toBeCloseTo(11.61, 2);
    });

    it('returns 0 for an unparseable timeRequired without throwing', () => {
        const result = getSuggestedPrice({
            materialsCost: 5,
            timeRequired: '',
            markupMultiplier: 2,
            hourlyRate: 10,
        });

        // materialsCost * markupMultiplier = 10, + 0 hours (unparseable -> NaN -> treated as 0)
        expect(result).toBe(10);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && bun test src/utils/getSuggestedPrice/index.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// packages/web/src/utils/getSuggestedPrice/index.ts
import { getWageCosts } from '../getWageCost';

interface GetSuggestedPriceArgs {
    materialsCost: number;
    timeRequired: string;
    markupMultiplier: number;
    hourlyRate: number;
}

export const getSuggestedPrice = ({
    materialsCost,
    timeRequired,
    markupMultiplier,
    hourlyRate,
}: GetSuggestedPriceArgs): number => {
    const hours = timeRequired ? getWageCosts(timeRequired) : 0;
    const safeHours = Number.isFinite(hours) ? hours : 0;
    const suggested = materialsCost * markupMultiplier + safeHours * hourlyRate;
    return parseFloat(suggested.toFixed(2));
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && bun test src/utils/getSuggestedPrice/index.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/utils/getSuggestedPrice
git commit -m "feat(web): add getSuggestedPrice formula util"
```

---

### Task 6: Web — API client changes (diagram images + settings fields)

**Files:**
- Modify: `packages/web/src/api/endpoints/addDesign/index.ts`
- Modify: `packages/web/src/api/endpoints/editDesign/index.ts`
- Modify: `packages/web/src/api/endpoints/userSettings/index.ts`

**Interfaces:**
- Consumes: `FormDesign.diagramImages` (Task 1), `UserSettings.markupMultiplier`/`hourlyRate` (Task 1).
- Produces: `makeAddDesignRequest`/`makeEditDesignRequest` now send `diagramFiles`/`existingDiagramImageIds`/`keepDiagramImageIds` alongside the existing `files`/`existingImageIds`/`keepImageIds`; `makeUpdateUserSettingsRequest` now accepts/sends `markupMultiplier`/`hourlyRate`.

- [ ] **Step 1: Update `makeAddDesignRequest`**

In `packages/web/src/api/endpoints/addDesign/index.ts`, add diagram handling right after the existing image handling block (before the `for (const key in formDesign)` loop), and exclude `diagramImages` from that generic loop the same way `images` already is:

```typescript
    const images = formDesign.images ?? [];
    const existingImageIds = images.filter((v): v is string => typeof v === 'string');
    const newFiles = images.filter((v): v is File => v instanceof File);

    for (const file of newFiles) {
        formData.append('files', file);
    }

    if (existingImageIds.length > 0) {
        formData.append('existingImageIds', JSON.stringify(existingImageIds));
    }

    const diagramImages = formDesign.diagramImages ?? [];
    const existingDiagramImageIds = diagramImages.filter((v): v is string => typeof v === 'string');
    const newDiagramFiles = diagramImages.filter((v): v is File => v instanceof File);

    for (const file of newDiagramFiles) {
        formData.append('diagramFiles', file);
    }

    if (existingDiagramImageIds.length > 0) {
        formData.append('existingDiagramImageIds', JSON.stringify(existingDiagramImageIds));
    }

    for (const key in formDesign) {
        if (Object.hasOwn(formDesign, key)) {
            const value = formDesign[key as keyof typeof formDesign];

            if (key === 'images' || key === 'diagramImages') {
                // handled above
            } else if (
                (key === 'materials' || key === 'variationGroups' || key === 'variants') &&
                Array.isArray(value)
            ) {
                formData.append(key, JSON.stringify(value));
            } else if (typeof value === 'string' || typeof value === 'number') {
                formData.append(key, value.toString());
            }
        }
    }
```

- [ ] **Step 2: Update `makeEditDesignRequest`**

In `packages/web/src/api/endpoints/editDesign/index.ts`, apply the same pattern (using `keepDiagramImageIds` instead of `existingDiagramImageIds`, matching the existing `keepImageIds` naming in this file):

```typescript
    const images = formDesign.images ?? [];
    const keepImageIds = images.filter((v): v is string => typeof v === 'string');
    const newFiles = images.filter((v): v is File => v instanceof File);

    for (const file of newFiles) {
        formData.append('files', file);
    }

    formData.append('keepImageIds', JSON.stringify(keepImageIds));

    const diagramImages = formDesign.diagramImages ?? [];
    const keepDiagramImageIds = diagramImages.filter((v): v is string => typeof v === 'string');
    const newDiagramFiles = diagramImages.filter((v): v is File => v instanceof File);

    for (const file of newDiagramFiles) {
        formData.append('diagramFiles', file);
    }

    formData.append('keepDiagramImageIds', JSON.stringify(keepDiagramImageIds));

    for (const key in formDesign) {
        if (Object.hasOwn(formDesign, key)) {
            const value = formDesign[key as keyof FormDesign];

            if (key === 'images' || key === 'diagramImages') {
                // handled above
            } else if (
                (key === 'materials' || key === 'variationGroups' || key === 'variants') &&
                Array.isArray(value)
            ) {
                formData.append(key, JSON.stringify(value));
            } else if (typeof value === 'string' || typeof value === 'number') {
                formData.append(key, value.toString());
            }
        }
    }
```

- [ ] **Step 3: Update `userSettings` endpoint functions**

In `packages/web/src/api/endpoints/userSettings/index.ts`, update `makeUpdateUserSettingsRequest`'s parameter type and body:

```typescript
export const makeUpdateUserSettingsRequest = (
    updates: { hourlyWage: number; profitMargin: number; markupMultiplier: number; hourlyRate: number },
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

- [ ] **Step 4: Typecheck**

Run: `cd packages/web && bunx tsc --noEmit`
Expected: errors at every call site of `makeUpdateUserSettingsRequest` that doesn't yet pass `markupMultiplier`/`hourlyRate` — this is expected; Task 7 fixes the one call site (`useUserSettings.ts`)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/api/endpoints/addDesign packages/web/src/api/endpoints/editDesign packages/web/src/api/endpoints/userSettings
git commit -m "feat(web): send diagram images and price-suggestion settings to the api"
```

(Typecheck errors from Step 4 are expected to persist until Task 7 — do not try to fix `useUserSettings.ts` in this task, it's the next one.)

---

### Task 7: Web — `useUserSettings` hook

**Files:**
- Modify: `packages/web/src/hooks/useUserSettings.ts`

**Interfaces:**
- Consumes: `makeUpdateUserSettingsRequest` (Task 6).
- Produces: `useUserSettings()` now also returns `markupMultiplier: number` and `hourlyRate: number`; `updateSettings` now accepts `{ hourlyWage, profitMargin, markupMultiplier, hourlyRate }` — consumed by Tasks 8, 9, 11.

- [ ] **Step 1: Update the hook**

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
        mutationFn: (updates: { hourlyWage: number; profitMargin: number; markupMultiplier: number; hourlyRate: number }) =>
            makeUpdateUserSettingsRequest(updates, () => accessToken, login, logout),
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
        isLoading,
        updateSettings: updateMutation.mutateAsync,
        recalculate: recalculateMutation.mutateAsync,
        isRecalculating: recalculateMutation.isPending,
        recalculateResult: recalculateMutation.data,
        recalculateError: recalculateMutation.error,
    };
};
```

- [ ] **Step 2: Typecheck**

Run: `cd packages/web && bunx tsc --noEmit`
Expected: this fixes the `useUserSettings.ts` call site from Task 6; new errors will appear at every caller of `updateSettings(...)` in `packages/web/src/pages/Settings/index.tsx` that doesn't yet pass the two new fields — expected, fixed in Task 11

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/hooks/useUserSettings.ts
git commit -m "feat(web): expose markupMultiplier and hourlyRate from useUserSettings"
```

---

### Task 8: Web — shared "Maker docs" and "Suggested price" components

**Files:**
- Create: `packages/web/src/components/MakerDocsSection/index.tsx`
- Create: `packages/web/src/components/SuggestedPrice/index.tsx`

**Interfaces:**
- Consumes: `MultiImageUpload` (existing, `packages/web/src/components/MultiImageUpload`), `Textarea` (existing, `packages/web/src/components/ui/textarea`), `getSuggestedPrice` (Task 5), react-hook-form `Control`/`FormField` primitives (existing, `packages/web/src/components/ui/form`).
- Produces: `<MakerDocsSection control={form.control} />` — a self-contained pair of `FormField`s for `diagramImages` (via `MultiImageUpload`) and `makingNotes` (via `Textarea`), matching the "Upload Images"/"Add Description" section markup pattern in `AddDesign`/`DesignEditForm` exactly (12-column grid, `hr` separators are added by the caller, not this component — this component renders only the inner content of one section). `<SuggestedPrice materialsCost={number} timeRequired={string} markupMultiplier={number} hourlyRate={number} onUse={(price: number) => void} />` — renders the read-only suggestion text and a "Use this price" button that calls `onUse` with the computed value.

- [ ] **Step 1: Write `MakerDocsSection`**

```typescript
// packages/web/src/components/MakerDocsSection/index.tsx
import type { Control } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

import MultiImageUpload from '../MultiImageUpload';

interface MakerDocsSectionProps {
    control: Control<any>;
}

const MakerDocsSection: React.FC<MakerDocsSectionProps> = ({ control }) => (
    <div className="space-y-4">
        <FormField
            control={control}
            name="diagramImages"
            render={({ field, fieldState }) => (
                <FormItem>
                    <FormLabel>Diagrams (private — never shown on Etsy)</FormLabel>
                    <FormControl>
                        <MultiImageUpload
                            value={field.value ?? []}
                            onChange={field.onChange}
                            hasError={!!fieldState.error}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={control}
            name="makingNotes"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Making notes (private — never shown on Etsy)</FormLabel>
                    <FormControl>
                        <Textarea
                            placeholder="Steps, measurements, gotchas for making this design again..."
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            rows={4}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    </div>
);

export default MakerDocsSection;
```

- [ ] **Step 2: Write `SuggestedPrice`**

```typescript
// packages/web/src/components/SuggestedPrice/index.tsx
import { Button } from '@/components/ui/button';

import { getSuggestedPrice } from '../../utils/getSuggestedPrice';

interface SuggestedPriceProps {
    materialsCost: number;
    timeRequired: string;
    markupMultiplier: number;
    hourlyRate: number;
    onUse: (price: number) => void;
}

const SuggestedPrice: React.FC<SuggestedPriceProps> = ({
    materialsCost,
    timeRequired,
    markupMultiplier,
    hourlyRate,
    onUse,
}) => {
    const suggested = getSuggestedPrice({ materialsCost, timeRequired, markupMultiplier, hourlyRate });

    return (
        <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
                Suggested: <span className="font-mono text-foreground">£{suggested.toFixed(2)}</span>
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onUse(suggested)}>
                Use this price
            </Button>
        </div>
    );
};

export default SuggestedPrice;
```

- [ ] **Step 3: Typecheck**

Run: `cd packages/web && bunx tsc --noEmit`
Expected: no errors from these two new files (unused-export warnings are fine — they're consumed starting Task 9)

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/MakerDocsSection packages/web/src/components/SuggestedPrice
git commit -m "feat(web): add MakerDocsSection and SuggestedPrice components"
```

---

### Task 9: Web — wire Maker docs + suggested price into `AddDesign` and `DesignEditForm`

**Files:**
- Modify: `packages/web/src/pages/AddDesign/index.tsx`
- Modify: `packages/web/src/components/DesignEditForm/index.tsx`

**Interfaces:**
- Consumes: `MakerDocsSection`, `SuggestedPrice` (Task 8), `useUserSettings().markupMultiplier`/`hourlyRate` (Task 7).
- Produces: both forms gain a "Maker Docs" section (after "Upload Images", before "Add Materials" — matches the spec's stated form order intent of grouping maker-only content near the top) and a `SuggestedPrice` shown beside the "Final Price" field, non-variant case only (the variant case already shows "Varies per variant" text — Task 10 adds a per-variant suggestion column separately, not here).

- [ ] **Step 1: Update `AddDesign`**

In `packages/web/src/pages/AddDesign/index.tsx`:

1. Add the import:

```typescript
import MakerDocsSection from '../../components/MakerDocsSection';
import SuggestedPrice from '../../components/SuggestedPrice';
```

2. Add `diagramImages: []` and `makingNotes: ''` to the `defaultValues` object (alongside the existing `images: []`).

3. Destructure `markupMultiplier`/`hourlyRate` alongside the existing `hourlyWage`/`profitMargin`:

```typescript
    const { hourlyWage, profitMargin, markupMultiplier, hourlyRate } = useUserSettings();
```

4. Insert a new section immediately after the "Upload Images Section" `<hr />` (i.e., right after the closing `</div>` of that section's grid, before the "Add Materials Section" comment):

```typescript
                        <hr className="border-t border-border" />

                        {/* Maker Docs Section */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-4">
                                <h2 className="text-lg font-medium text-center">Maker Docs</h2>
                                <p className="text-xs text-muted-foreground text-center mt-1">
                                    Private — diagrams and notes never sent to Etsy
                                </p>
                            </div>
                            <div className="col-span-8">
                                <MakerDocsSection control={form.control} />
                            </div>
                        </div>
```

5. In the non-variant branch of the "Final Price" `FormField` (inside `PriceBreakdown`'s `priceField` prop), add `<SuggestedPrice>` right after the closing `</InputGroup>` and before `<FormDescription>`:

```typescript
                                                        </InputGroup>
                                                    </FormControl>
                                                    <SuggestedPrice
                                                        materialsCost={form.watch('totalMaterialCosts') ?? 0}
                                                        timeRequired={currentTimeRequired}
                                                        markupMultiplier={markupMultiplier}
                                                        hourlyRate={hourlyRate}
                                                        onUse={(price) => field.onChange(price)}
                                                    />
                                                    <FormDescription>
```

- [ ] **Step 2: Update `DesignEditForm`**

Apply the identical four changes to `packages/web/src/components/DesignEditForm/index.tsx`:
1. Same two imports.
2. Add `diagramImages: design.diagramImageIds ?? []` and `makingNotes: design.makingNotes ?? ''` to `defaultValues` (note: unlike `AddDesign`, this form pre-fills from an existing `design` prop — follow the exact pattern already used for `images: design.imageIds`).
3. Same `markupMultiplier`/`hourlyRate` destructure from `useUserSettings()`.
4. Same Maker Docs section insertion after "Upload Images Section", and same `<SuggestedPrice>` insertion in the non-variant price field branch.

- [ ] **Step 3: Typecheck**

Run: `cd packages/web && bunx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Manual smoke test**

Run the web+api dev servers (check root `package.json` for `bun run start` or `bun run start:with-mock`), navigate to `/addDesign`, confirm: the Maker Docs section renders with a diagram upload area and notes textarea; entering a materials cost + time shows a "Suggested: £X.XX" line beside the Final Price field with a working "Use this price" button that copies the value in without changing anything else. Repeat on an existing design's "Edit Details" dialog (`DesignEditForm`, reached from `/designs/:id`) — confirm existing diagram images (none yet, since this is the first design to have any) and notes prefill correctly, i.e. render as empty without crashing.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/pages/AddDesign/index.tsx packages/web/src/components/DesignEditForm/index.tsx
git commit -m "feat(web): wire Maker Docs section and price suggestion into design forms"
```

---

### Task 10: Web — per-variant suggested price column

**Files:**
- Modify: `packages/web/src/components/VariationGroupBuilder/index.tsx`

**Interfaces:**
- Consumes: `getSuggestedPrice` (Task 5).
- Produces: the variant preview table gains a "Suggested" column next to the existing "Price" column, computed per-row from that variant's `totalMaterialCosts` and the shared design-level `timeRequired`.

- [ ] **Step 1: Read the current table structure**

Read `packages/web/src/components/VariationGroupBuilder/index.tsx` around the table rendering (near the `<TableCell>£{v.totalMaterialCosts.toFixed(2)}</TableCell>` / `<TableCell>£{v.price.toFixed(2)}</TableCell>` lines found earlier) to see the exact `<TableHeader>`/`<TableRow>` structure and what props (`hourlyWage`, `profitMargin`, `timeRequired`) this component already receives — this task adds two more props (`markupMultiplier`, `hourlyRate`) alongside those existing ones, following the identical prop-passing pattern.

- [ ] **Step 2: Add the two new props**

Add `markupMultiplier: number` and `hourlyRate: number` to this component's props interface, next to the existing `hourlyWage`/`profitMargin` props.

- [ ] **Step 3: Add the import and table column**

Add the import:

```typescript
import { getSuggestedPrice } from '../../utils/getSuggestedPrice';
```

In the `<TableHeader>`'s row, add a new `<TableHead>Suggested</TableHead>` immediately after the existing `<TableHead>Price</TableHead>` (or equivalent — match whatever the existing price column header text is).

In the variant preview `<TableRow>` mapping, add a new `<TableCell>` immediately after the existing `<TableCell>£{v.price.toFixed(2)}</TableCell>`:

```typescript
                            <TableCell>
                                £
                                {getSuggestedPrice({
                                    materialsCost: v.totalMaterialCosts,
                                    timeRequired,
                                    markupMultiplier,
                                    hourlyRate,
                                }).toFixed(2)}
                            </TableCell>
```

- [ ] **Step 4: Update both callers to pass the new props**

In `packages/web/src/pages/AddDesign/index.tsx` and `packages/web/src/components/DesignEditForm/index.tsx`, find the existing `<VariationGroupBuilder ... hourlyWage={hourlyWage} profitMargin={profitMargin} timeRequired={currentTimeRequired} />` usage and add:

```typescript
                                        markupMultiplier={markupMultiplier}
                                        hourlyRate={hourlyRate}
```

- [ ] **Step 5: Typecheck**

Run: `cd packages/web && bunx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Manual smoke test**

On `/addDesign`, add a variation group with at least one option, confirm the variant preview table now shows a "Suggested" column with a plausible value that updates as materials/time change.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/components/VariationGroupBuilder/index.tsx packages/web/src/pages/AddDesign/index.tsx packages/web/src/components/DesignEditForm/index.tsx
git commit -m "feat(web): show per-variant suggested price in variation preview"
```

---

### Task 11: Web — price-suggestion settings on the Settings page

**Files:**
- Modify: `packages/web/src/pages/Settings/index.tsx`

**Interfaces:**
- Consumes: `useUserSettings()` (Task 7, now returning/accepting `markupMultiplier`/`hourlyRate`).
- Produces: the existing "Pricing" section on `/settings` gains two more fields; `handleSavePricing` sends all four values on save.

- [ ] **Step 1: Read the current Pricing section**

Read `packages/web/src/pages/Settings/index.tsx`'s Pricing `<section>` (built in the sub-project 1 plan — has "Hourly Wage" and "Profit Margin" `InputGroup` fields, `localWage`/`localMargin` local state, and a `handleSavePricing` function that calls `updateSettings({ hourlyWage, profitMargin })`).

- [ ] **Step 2: Add local state for the two new fields**

Alongside the existing `localWage`/`localMargin` `useState` declarations, add:

```typescript
    const [localMarkupMultiplier, setLocalMarkupMultiplier] = useState<number | ''>(markupMultiplier);
    const [localHourlyRate, setLocalHourlyRate] = useState<number | ''>(hourlyRate);
```

Destructure `markupMultiplier`, `hourlyRate` from `useUserSettings()` alongside the existing `hourlyWage`, `profitMargin`.

In the existing `useEffect` that syncs local state when `hourlyWage`/`profitMargin` change, add the same sync for the two new fields (same dependency-array pattern).

- [ ] **Step 3: Update `handleSavePricing` to include the new fields**

Wherever `handleSavePricing` currently calls `updateSettings({ hourlyWage: wage, profitMargin: margin })`, change it to:

```typescript
            await updateSettings({
                hourlyWage: wage,
                profitMargin: margin,
                markupMultiplier: Number(localMarkupMultiplier),
                hourlyRate: Number(localHourlyRate),
            });
```

- [ ] **Step 4: Add the two new fields to the Pricing section markup**

Immediately after the existing "Profit Margin" `InputGroup` block in the Pricing `<section>`, add:

```typescript
                <div className="space-y-1.5">
                    <Label>Etsy Price Suggestion — Markup Multiplier</Label>
                    <InputGroup className="max-w-[140px]">
                        <InputGroupInput
                            type="number"
                            min="0"
                            step="0.1"
                            disabled={pricingBusy}
                            value={localMarkupMultiplier}
                            onChange={(e) =>
                                setLocalMarkupMultiplier(e.target.value === '' ? '' : parseFloat(e.target.value))
                            }
                        />
                        <InputGroupAddon align="inline-end">
                            <InputGroupText>×</InputGroupText>
                        </InputGroupAddon>
                    </InputGroup>
                </div>
                <div className="space-y-1.5">
                    <Label>Etsy Price Suggestion — Hourly Rate</Label>
                    <InputGroup className="max-w-[160px]">
                        <InputGroupAddon align="inline-start">
                            <InputGroupText>£</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                            type="number"
                            min="0"
                            step="0.50"
                            disabled={pricingBusy}
                            value={localHourlyRate}
                            onChange={(e) =>
                                setLocalHourlyRate(e.target.value === '' ? '' : parseFloat(e.target.value))
                            }
                        />
                        <InputGroupAddon align="inline-end">
                            <InputGroupText>/hr</InputGroupText>
                        </InputGroupAddon>
                    </InputGroup>
                </div>
```

(Uses the existing `pricingBusy` derived flag already present on this page from the sub-project 1 fix — reuse it, don't reintroduce a new disabled-state variable.)

- [ ] **Step 5: Typecheck**

Run: `cd packages/web && bunx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Manual smoke test**

Navigate to `/settings`, confirm the two new fields appear under Pricing with the correct defaults (2.5 and 0 for a fresh user), edit them, save, refresh the page, confirm the values persisted.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/pages/Settings/index.tsx
git commit -m "feat(web): add price-suggestion fields to Settings pricing section"
```

---

### Task 12: Web — Maker docs display on `ViewDesign`

**Files:**
- Modify: `packages/web/src/pages/ViewDesign/index.tsx`

**Interfaces:**
- Consumes: `Design.diagramImageIds`/`makingNotes` (Task 1), `Image` component (existing, `packages/web/src/components/Image`).
- Produces: a new "Maker Docs" display section on the design detail page, visible only to the design's owner (this page is already scoped to the logged-in user's own designs via `getDesignQuery`, so no extra auth check is needed — every design shown here already belongs to the viewer).

- [ ] **Step 1: Destructure the new fields**

In the existing destructure of `design` (the block starting `const { timeRequired, imageIds, name, ... } = design ?? {};`), add `diagramImageIds` and `makingNotes`.

- [ ] **Step 2: Add a display section**

Find a sensible spot in the existing 2-column layout (near the existing description/materials display — read the rest of the file past line 120 to find where `description`/`hasDescription` is rendered, and add the Maker Docs block immediately after that same section, following its markup style):

```typescript
                {(diagramImageIds && diagramImageIds.length > 0) || makingNotes ? (
                    <div className="mt-8 rounded-lg border border-border bg-muted/30 p-6">
                        <h2 className="text-lg font-medium mb-1">Maker Docs</h2>
                        <p className="text-xs text-muted-foreground mb-4">Private — never shown on Etsy</p>

                        {diagramImageIds && diagramImageIds.length > 0 && (
                            <div className="flex flex-wrap gap-3 mb-4">
                                {diagramImageIds.map((id) => (
                                    <div
                                        key={id}
                                        className="w-24 h-24 rounded-md overflow-hidden border border-border"
                                    >
                                        <Image imageId={id} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {makingNotes && <p className="text-sm whitespace-pre-wrap">{makingNotes}</p>}
                    </div>
                ) : null}
```

Adjust the exact placement/wrapping `<div>` nesting to match whatever container the description section already lives in — read the surrounding JSX before inserting, since this page's layout (2-column grid split at line 116) means the right place is inside the right-hand ("info") column, not the left-hand ("image") column.

- [ ] **Step 3: Typecheck**

Run: `cd packages/web && bunx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Manual smoke test**

Add a design with diagram images + notes via `/addDesign`, view it at `/designs/:id`, confirm the Maker Docs section renders the diagrams and notes. Add a design with neither, confirm the section doesn't render at all (no empty box).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/pages/ViewDesign/index.tsx
git commit -m "feat(web): display maker docs on the design detail page"
```

---

## Self-Review Notes

- **Spec coverage:** Schema (`diagramImageIds`/`makingNotes` on `Design`, private-by-construction since the Etsy push mapper in sub-project 3 simply won't read these fields — Task 1) · Forms get a "Maker docs" section reusing the existing image pipeline (Task 8, 9) · Drafts autosave "covers new fields for free" — verified true for `makingNotes` (plain string flows through `useDraftAutosave`'s generic `serializableData` spread) and accepted as the same pre-existing limitation as multi-image drafts for `diagramImages` File objects (documented in Global Constraints, not a new gap) · Pricing suggestion formula, defaults, settings fields (Task 4, 5) · shown read-only beside price input on design and per-variant, never auto-applied, one-click copy (Task 9, 10, 11).
- **Placeholder scan:** no TBD/TODO markers; every step has runnable code or an exact command. Two steps (Task 9 Step 1.2/2, Task 12 Step 2) ask the implementer to read surrounding code before inserting rather than giving a full-file diff — this is intentional, not a placeholder: the exact insertion point depends on file content already described precisely enough to locate (a named comment/JSX block), and reproducing the entire 400+ line surrounding file for context would fail DRY without adding accuracy.
- **Type consistency:** `DesignService.addDesign`/`editDesignProperties` new parameter order (`diagramImageBuffers`, then `existingDiagramImageIds`/`keepDiagramImageIds`, both before `userId`) is used identically in Task 2/3's tests, implementation, and handler call sites. `getSuggestedPrice`'s parameter object shape (`materialsCost`, `timeRequired`, `markupMultiplier`, `hourlyRate`) matches exactly between Task 5's definition and every consumer (Tasks 8, 9, 10). `useUserSettings()`'s returned/accepted field names (`markupMultiplier`, `hourlyRate`) match `UserSettings` (Task 1) and `UserSettingsService` (Task 4) throughout.
