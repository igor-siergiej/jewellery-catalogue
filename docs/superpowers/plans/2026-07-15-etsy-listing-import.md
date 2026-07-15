# Etsy Listing Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a re-runnable, UI-driven import that turns an Etsy CSV export into catalogue `Design` records, skipping already-imported listings and letting the user apply changed ones.

**Architecture:** A new server-side `DesignImportService` parses the CSV, diffs against the user's existing designs (NEW / CHANGED / SAME), and — on a separate commit call — fetches Etsy images, creates generic placeholder materials, and writes designs. A new web page drives a two-step preview → commit flow via TanStack Query.

**Tech Stack:** Bun + Hono + MongoDB + Zod (api); React + TanStack Query + shadcn/ui (web); `bun:test` (api tests), `vitest` (web tests); `csv-parse` for CSV.

## Global Constraints

- API runtime is **Bun**; API tests use `bun:test` (`import { describe, it, expect, mock, jest, beforeEach } from 'bun:test'`).
- Web tests use **vitest** (`import { describe, it, expect, vi } from 'vitest'`).
- Domain services take dependencies via constructor injection; external I/O (image fetch) is injected as an interface for testability.
- Image fetching is restricted to host **`i.etsystatic.com`** only (SSRF guard).
- Placeholder materials use price `0` everywhere and required amount `0` so `produceDesigns` never blocks on stock.
- `totalQuantity` is seeded from Etsy `QUANTITY` on NEW only; CHANGED never overwrites stock.
- New `Design` fields are all optional/additive: `importSource`, `importKey`, `etsyImageSignature`, `etsyMaterials`.
- Follow existing patterns: services throw `Object.assign(new Error(msg), { status })`; handlers use `APIError` from `@imapps/api-utils/hono`.
- Commit conventions: Conventional Commits; end message with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

> **Design note / spec deviation:** the spec named a single `importHash` for drift detection. This plan stores `etsyImageSignature` on the design instead and diffs name/description/price directly against the stored design (which holds the Etsy-owned values). This gives exact field-level `changedFields` without a separate hash. Creation is done directly via `designRepo.insert` in the import service (not by extending `DesignService.addDesign`), keeping the interactive path untouched.

---

## File Structure

**types** (`packages/types/src`)
- Modify `design/index.ts` — add 4 optional fields to `designSchema`.
- Create `etsyImport/index.ts` — shared import DTOs (`EtsyRow`, `ImportCandidate`, `ImportPreviewResult`, `ImportCommitRequest`, `ImportCommitResult`, `ImportStatus`).
- Modify `index.ts` — re-export `./etsyImport`.

**api** (`packages/api/src`)
- Create `domain/DesignImportService/parseCsv.ts` — CSV text → `EtsyRow[]`.
- Create `domain/DesignImportService/deriveKeys.ts` — `normalise`, `deriveImportKey`, `extractEtsyImageId`, `imageSignature`, `diffChangedFields`, `round2`.
- Create `domain/DesignImportService/inferDesignType.ts` — title → `DesignType | undefined`.
- Create `domain/DesignImportService/placeholderMaterials.ts` — tag → placeholder `Material` builders + `PlaceholderMaterialResolver` (get-or-create).
- Create `domain/DesignImportService/imageFetcher.ts` — `EtsyImageFetcher` interface + `HttpEtsyImageFetcher` (host allowlist).
- Create `domain/DesignImportService/index.ts` — `DesignImportService` (`preview`, `commit`).
- Modify `dependencies/types.ts` — add `DesignImportService` token + type.
- Modify `dependencies/index.ts` — register `DesignImportService`.
- Modify `handlers/Design/index.ts` — add `previewImport`, `commitImport`.
- Modify `routes/index.ts` — add two routes.
- Modify `package.json` — add `csv-parse`.

**web** (`packages/web/src`)
- Modify `api/endpoints.ts` — add two endpoint constants.
- Create `api/endpoints/importDesigns/index.ts` — `makePreviewImportRequest`, `makeCommitImportRequest`.
- Create `api/endpoints/importDesigns/index.test.ts` — request builder tests.
- Modify `constants/routes.ts` — add `IMPORT_DESIGNS_PAGE`.
- Create `pages/ImportDesigns/index.tsx` — the page.
- Modify `index.tsx` — add route.
- Modify `pages/Designs/index.tsx` — add "Import from Etsy" button.

---

### Task 1: Types — Design fields + import DTOs

**Files:**
- Modify: `packages/types/src/design/index.ts`
- Create: `packages/types/src/etsyImport/index.ts`
- Modify: `packages/types/src/index.ts`
- Test: `packages/types/src/etsyImport/index.test.ts`

**Interfaces:**
- Produces: `Design` gains optional `importSource?: 'ETSY'`, `importKey?: string`, `etsyImageSignature?: string`, `etsyMaterials?: string[]`. Types: `EtsyRow`, `ImportStatus`, `ImportCandidate`, `ImportPreviewResult`, `ImportCommitRequest`, `ImportCommitResult`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/types/src/etsyImport/index.test.ts
import { describe, it, expect } from 'bun:test';
import { designSchema } from '../design';
import type { ImportCandidate } from './index';

describe('etsyImport types', () => {
    it('designSchema accepts optional import fields', () => {
        const parsed = designSchema.parse({
            id: 'd1', userId: 'u1', name: 'Ring', timeRequired: '0',
            materials: [], imageIds: ['i1'], price: 6.15, description: 'x',
            totalMaterialCosts: 0, dateAdded: new Date(), totalQuantity: 3,
            importSource: 'ETSY', importKey: 'abc',
            etsyImageSignature: '123', etsyMaterials: ['Copper'],
        });
        expect(parsed.importKey).toBe('abc');
    });

    it('ImportCandidate shape compiles', () => {
        const c: ImportCandidate = {
            importKey: 'k', name: 'Ring', status: 'NEW', changedFields: [],
            price: 6.15, designType: undefined, imageUrls: ['u'],
            mappedMaterials: ['Generic Copper Wire'],
            row: { title: 'Ring', description: 'x', price: 6.15, quantity: 3,
                   materials: ['Copper'], imageUrls: ['u'], sku: '' },
        };
        expect(c.status).toBe('NEW');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/types && bun test src/etsyImport/index.test.ts`
Expected: FAIL — `Cannot find module './index'` / unknown key `importSource`.

- [ ] **Step 3: Add the Design fields**

In `packages/types/src/design/index.ts`, add these four lines inside the `designSchema` object (after `designType`):

```ts
    importSource: z.literal('ETSY').optional(),
    importKey: z.string().optional(),
    etsyImageSignature: z.string().optional(),
    etsyMaterials: z.array(z.string()).optional(),
```

- [ ] **Step 4: Create the import DTOs**

```ts
// packages/types/src/etsyImport/index.ts
import type { DesignType } from '../design/enum';

export interface EtsyRow {
    title: string;
    description: string;
    price: number;
    quantity: number;
    materials: string[];
    imageUrls: string[];
    sku: string;
}

export type ImportStatus = 'NEW' | 'CHANGED' | 'SAME';

export interface ImportCandidate {
    importKey: string;
    name: string;
    status: ImportStatus;
    changedFields: string[];
    price: number;
    designType?: DesignType;
    imageUrls: string[];
    mappedMaterials: string[];
    row: EtsyRow;
}

export interface ImportInvalidRow {
    title: string;
    reason: string;
}

export interface ImportPreviewResult {
    candidates: ImportCandidate[];
    invalid: ImportInvalidRow[];
    summary: { new: number; changed: number; same: number; invalid: number };
}

export interface ImportCommitRequest {
    candidates: ImportCandidate[];
}

export interface ImportCommitResult {
    created: number;
    updated: number;
    failed: { name: string; reason: string }[];
}
```

Add to `packages/types/src/index.ts` (follow the existing re-export style in that file):

```ts
export * from './etsyImport';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/types && bun test src/etsyImport/index.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/types/src/design/index.ts packages/types/src/etsyImport packages/types/src/index.ts
git commit -m "feat(types): add Etsy import fields and DTOs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: CSV parsing

**Files:**
- Modify: `packages/api/package.json` (add `csv-parse`)
- Create: `packages/api/src/domain/DesignImportService/parseCsv.ts`
- Test: `packages/api/src/domain/DesignImportService/parseCsv.test.ts`

**Interfaces:**
- Produces: `parseCsv(csvText: string): EtsyRow[]` — maps columns `TITLE, DESCRIPTION, PRICE, QUANTITY, MATERIALS, IMAGE1..IMAGE10, SKU`. `materials` = `MATERIALS` split on `,` trimmed non-empty. `imageUrls` = present `IMAGE1..IMAGE10` in order. `price` = `Number(PRICE)`, `quantity` = `Number(QUANTITY)` (NaN → 0).

- [ ] **Step 1: Add the dependency**

Run: `cd packages/api && bun add csv-parse`

- [ ] **Step 2: Write the failing test**

```ts
// packages/api/src/domain/DesignImportService/parseCsv.test.ts
import { describe, it, expect } from 'bun:test';
import { parseCsv } from './parseCsv';

const CSV = `TITLE,DESCRIPTION,PRICE,CURRENCY_CODE,QUANTITY,TAGS,MATERIALS,IMAGE1,IMAGE2,SKU
Green Ring,"Line one
Line two",6.15,GBP,3,tag1,"Aventurine,Copper,Stone",https://i.etsystatic.com/1/il/a/111/il_x.jpg,,
Silver Ring,Simple,8.30,GBP,1,tag2,"Silver,Stone",https://i.etsystatic.com/1/il/b/222/il_y.jpg,https://i.etsystatic.com/1/il/c/333/il_z.jpg,SKU-1`;

describe('parseCsv', () => {
    it('parses rows including quoted embedded newlines', () => {
        const rows = parseCsv(CSV);
        expect(rows).toHaveLength(2);
        expect(rows[0].title).toBe('Green Ring');
        expect(rows[0].description).toBe('Line one\nLine two');
        expect(rows[0].price).toBe(6.15);
        expect(rows[0].quantity).toBe(3);
        expect(rows[0].materials).toEqual(['Aventurine', 'Copper', 'Stone']);
        expect(rows[0].imageUrls).toEqual(['https://i.etsystatic.com/1/il/a/111/il_x.jpg']);
        expect(rows[0].sku).toBe('');
    });

    it('collects multiple images and reads sku', () => {
        const rows = parseCsv(CSV);
        expect(rows[1].imageUrls).toHaveLength(2);
        expect(rows[1].sku).toBe('SKU-1');
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/DesignImportService/parseCsv.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```ts
// packages/api/src/domain/DesignImportService/parseCsv.ts
import type { EtsyRow } from '@jewellery-catalogue/types';
import { parse } from 'csv-parse/sync';

export const parseCsv = (csvText: string): EtsyRow[] => {
    const records: Record<string, string>[] = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        bom: true,
    });

    return records.map((r) => {
        const imageUrls: string[] = [];
        for (let i = 1; i <= 10; i++) {
            const url = (r[`IMAGE${i}`] ?? '').trim();
            if (url) imageUrls.push(url);
        }

        const materials = (r.MATERIALS ?? '')
            .split(',')
            .map((m) => m.trim())
            .filter((m) => m.length > 0);

        const price = Number(r.PRICE);
        const quantity = Number(r.QUANTITY);

        return {
            title: (r.TITLE ?? '').trim(),
            description: r.DESCRIPTION ?? '',
            price: Number.isFinite(price) ? price : 0,
            quantity: Number.isFinite(quantity) ? quantity : 0,
            materials,
            imageUrls,
            sku: (r.SKU ?? '').trim(),
        };
    });
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/DesignImportService/parseCsv.test.ts`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add packages/api/package.json packages/api/bun.lock packages/api/src/domain/DesignImportService/parseCsv.ts packages/api/src/domain/DesignImportService/parseCsv.test.ts
git commit -m "feat(api): parse Etsy CSV export into rows

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Key derivation & change detection

**Files:**
- Create: `packages/api/src/domain/DesignImportService/deriveKeys.ts`
- Test: `packages/api/src/domain/DesignImportService/deriveKeys.test.ts`

**Interfaces:**
- Consumes: `EtsyRow` (Task 1), `Design` type.
- Produces:
  - `normalise(s: string): string` — lowercase, collapse whitespace, trim.
  - `deriveImportKey(row: EtsyRow): string` — `row.sku` if non-empty else `sha1(normalise(row.title))`.
  - `extractEtsyImageId(url: string): string` — the id before `/il_`, else the raw url.
  - `imageSignature(urls: string[]): string` — image ids joined by `,`.
  - `round2(n: number): number`.
  - `diffChangedFields(row: EtsyRow, design: Design): string[]` — subset of `['name','description','price','images']`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/api/src/domain/DesignImportService/deriveKeys.test.ts
import { describe, it, expect } from 'bun:test';
import type { Design } from '@jewellery-catalogue/types';
import { deriveImportKey, imageSignature, extractEtsyImageId, diffChangedFields, normalise } from './deriveKeys';

const row = {
    title: '  Green   Ring ', description: 'desc', price: 6.15, quantity: 3,
    materials: ['Copper'],
    imageUrls: ['https://i.etsystatic.com/1/il/a/111/il_fullxfull.111_x.jpg'], sku: '',
};

describe('deriveKeys', () => {
    it('normalises whitespace and case', () => {
        expect(normalise('  Green   Ring ')).toBe('green ring');
    });

    it('prefers SKU when present, else title hash', () => {
        expect(deriveImportKey({ ...row, sku: 'SKU-9' })).toBe('SKU-9');
        const k = deriveImportKey(row);
        expect(k).toHaveLength(40);
        expect(k).toBe(deriveImportKey({ ...row, title: 'green ring' }));
    });

    it('extracts etsy image id and signature', () => {
        expect(extractEtsyImageId(row.imageUrls[0])).toBe('111');
        expect(imageSignature(row.imageUrls)).toBe('111');
    });

    it('diffs only changed etsy-owned fields', () => {
        const design = {
            name: 'Green Ring', description: 'desc', price: 6.15,
            etsyImageSignature: '111',
        } as unknown as Design;
        expect(diffChangedFields(row, design)).toEqual([]);
        expect(diffChangedFields({ ...row, price: 9.99 }, design)).toEqual(['price']);
        expect(diffChangedFields({ ...row, imageUrls: [] }, design)).toEqual(['images']);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/DesignImportService/deriveKeys.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// packages/api/src/domain/DesignImportService/deriveKeys.ts
import { createHash } from 'node:crypto';
import type { Design, EtsyRow } from '@jewellery-catalogue/types';

export const normalise = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim();

const sha1 = (s: string): string => createHash('sha1').update(s).digest('hex');

export const deriveImportKey = (row: EtsyRow): string =>
    row.sku.trim() ? row.sku.trim() : sha1(normalise(row.title));

export const extractEtsyImageId = (url: string): string => {
    const match = url.match(/\/(\d+)\/il_/);
    return match ? match[1] : url;
};

export const imageSignature = (urls: string[]): string => urls.map(extractEtsyImageId).join(',');

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export const diffChangedFields = (row: EtsyRow, design: Design): string[] => {
    const changed: string[] = [];
    if (row.title.trim() !== design.name) changed.push('name');
    if (row.description !== design.description) changed.push('description');
    if (round2(row.price) !== round2(design.price)) changed.push('price');
    if (imageSignature(row.imageUrls) !== (design.etsyImageSignature ?? '')) changed.push('images');
    return changed;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/DesignImportService/deriveKeys.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/DesignImportService/deriveKeys.ts packages/api/src/domain/DesignImportService/deriveKeys.test.ts
git commit -m "feat(api): derive import keys and detect Etsy field drift

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: designType inference

**Files:**
- Create: `packages/api/src/domain/DesignImportService/inferDesignType.ts`
- Test: `packages/api/src/domain/DesignImportService/inferDesignType.test.ts`

**Interfaces:**
- Produces: `inferDesignType(title: string): DesignType | undefined`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/api/src/domain/DesignImportService/inferDesignType.test.ts
import { describe, it, expect } from 'bun:test';
import { DesignType } from '@jewellery-catalogue/types';
import { inferDesignType } from './inferDesignType';

describe('inferDesignType', () => {
    it('maps title keywords to a design type', () => {
        expect(inferDesignType('Adjustable Green Ring')).toBe(DesignType.RING);
        expect(inferDesignType('Sun Spiral Earrings')).toBe(DesignType.EARRINGS);
        expect(inferDesignType('Ear Cuff, no piercing')).toBe(DesignType.EARCUFF);
        expect(inferDesignType('Garnet Pendant Necklace')).toBe(DesignType.NECKLACE);
        expect(inferDesignType('Beaded Bangle')).toBe(DesignType.BRACELET);
    });

    it('returns undefined when nothing matches', () => {
        expect(inferDesignType('Mystery Trinket')).toBeUndefined();
    });

    it('prefers ear cuff over earring', () => {
        expect(inferDesignType('Earring-style Ear Cuff')).toBe(DesignType.EARCUFF);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/DesignImportService/inferDesignType.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// packages/api/src/domain/DesignImportService/inferDesignType.ts
import { type DesignType, DesignType as DT } from '@jewellery-catalogue/types';

export const inferDesignType = (title: string): DesignType | undefined => {
    const t = title.toLowerCase();
    if (t.includes('ear cuff') || t.includes('earcuff')) return DT.EARCUFF;
    if (t.includes('earring')) return DT.EARRINGS;
    if (t.includes('necklace') || t.includes('pendant')) return DT.NECKLACE;
    if (t.includes('bracelet') || t.includes('bangle')) return DT.BRACELET;
    if (t.includes('ring')) return DT.RING;
    return undefined;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/DesignImportService/inferDesignType.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/DesignImportService/inferDesignType.ts packages/api/src/domain/DesignImportService/inferDesignType.test.ts
git commit -m "feat(api): infer design type from Etsy title

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Placeholder material mapping & resolver

**Files:**
- Create: `packages/api/src/domain/DesignImportService/placeholderMaterials.ts`
- Test: `packages/api/src/domain/DesignImportService/placeholderMaterials.test.ts`

**Interfaces:**
- Consumes: `MaterialRepository` (`getByUserId`, `insert`), `IdGenerator` (`generate`), `Material`, `RequiredMaterial`, `MaterialType`, `METAL_TYPE`, `WIRE_TYPE`.
- Produces:
  - `placeholderNameForTag(tag: string): string` — e.g. `Copper`/`Yellow gold` → `Generic Gold Wire`; `Amethyst` → `Generic Amethyst Bead`; `Stainless steel` → `Generic Stainless Steel Bead`.
  - `class PlaceholderMaterialResolver` with `constructor(materialRepo, idGenerator)` and `async resolve(tags: string[], userId: string): Promise<RequiredMaterial[]>` — get-or-create by name (idempotent within a run and across runs), required amount `0`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/api/src/domain/DesignImportService/placeholderMaterials.test.ts
import { describe, it, expect, beforeEach, mock, jest } from 'bun:test';
import { MaterialType } from '@jewellery-catalogue/types';
import type { MaterialRepository } from '../MaterialRepository';
import type { IdGenerator } from '../IdGenerator';
import { placeholderNameForTag, PlaceholderMaterialResolver } from './placeholderMaterials';

const materialRepo = { getByUserId: mock(), insert: mock(), getById: mock(), getByIdAndUserId: mock(), getAll: mock(), update: mock(), delete: mock() };
let idCounter = 0;
const idGenerator = { generate: mock(() => `id-${++idCounter}`) };

describe('placeholderMaterials', () => {
    beforeEach(() => { jest.clearAllMocks(); idCounter = 0; });

    it('names metals as generic wire by metal type, non-metals as generic bead', () => {
        expect(placeholderNameForTag('Copper')).toBe('Generic Copper Wire');
        expect(placeholderNameForTag('Yellow gold')).toBe('Generic Gold Wire');
        expect(placeholderNameForTag('Gold')).toBe('Generic Gold Wire');
        expect(placeholderNameForTag('Amethyst')).toBe('Generic Amethyst Bead');
        expect(placeholderNameForTag('Stainless steel')).toBe('Generic Stainless Steel Bead');
    });

    it('creates missing placeholders once and reuses existing', async () => {
        materialRepo.getByUserId.mockResolvedValue([]);
        const resolver = new PlaceholderMaterialResolver(
            materialRepo as unknown as MaterialRepository,
            idGenerator as unknown as IdGenerator,
        );
        const required = await resolver.resolve(['Copper', 'Copper', 'Amethyst'], 'u1');
        expect(required).toHaveLength(2); // deduped
        expect(materialRepo.insert).toHaveBeenCalledTimes(2);
        const wire = required.find((r) => r.type === MaterialType.WIRE) as any;
        expect(wire.name).toBe('Generic Copper Wire');
        expect(wire.requiredLength).toBe(0);
        expect(wire.pricePerMeter).toBe(0);
        const bead = required.find((r) => r.type === MaterialType.BEAD) as any;
        expect(bead.requiredQuantity).toBe(0);
    });

    it('reuses a placeholder already in the repo without inserting', async () => {
        materialRepo.getByUserId.mockResolvedValue([
            { id: 'existing', userId: 'u1', name: 'Generic Copper Wire', type: MaterialType.WIRE, requiredLength: undefined } as any,
        ]);
        const resolver = new PlaceholderMaterialResolver(
            materialRepo as unknown as MaterialRepository,
            idGenerator as unknown as IdGenerator,
        );
        const required = await resolver.resolve(['Copper'], 'u1');
        expect(materialRepo.insert).not.toHaveBeenCalled();
        expect(required[0].id).toBe('existing');
        expect((required[0] as any).requiredLength).toBe(0);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/DesignImportService/placeholderMaterials.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// packages/api/src/domain/DesignImportService/placeholderMaterials.ts
import {
    type Material, type RequiredMaterial,
    MaterialType, METAL_TYPE, WIRE_TYPE,
} from '@jewellery-catalogue/types';
import type { IdGenerator } from '../IdGenerator';
import type { MaterialRepository } from '../MaterialRepository';

const SENTINEL_STOCK = 1_000_000;

const METAL_TAG_TO_TYPE: Record<string, METAL_TYPE> = {
    copper: METAL_TYPE.COPPER,
    silver: METAL_TYPE.SILVER,
    brass: METAL_TYPE.BRASS,
    gold: METAL_TYPE.GOLD,
    'yellow gold': METAL_TYPE.GOLD,
    gilt: METAL_TYPE.GILT,
};

const titleCase = (s: string): string =>
    s.split(' ').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const metalTypeForTag = (tag: string): METAL_TYPE | undefined => METAL_TAG_TO_TYPE[tag.trim().toLowerCase()];

export const placeholderNameForTag = (tag: string): string => {
    const metal = metalTypeForTag(tag);
    if (metal) return `Generic ${titleCase(metal.toLowerCase())} Wire`;
    return `Generic ${titleCase(tag)} Bead`;
};

const buildPlaceholderMaterial = (tag: string, id: string, userId: string): Material => {
    const name = placeholderNameForTag(tag);
    const metal = metalTypeForTag(tag);
    const base = { id, userId, name, brand: 'Generic', purchaseUrl: '', dateAdded: new Date() as unknown as string };

    if (metal) {
        return {
            ...base, type: MaterialType.WIRE, metalType: metal, wireType: WIRE_TYPE.FULL,
            diameter: 1, lengthPerPack: 1, pricePerPack: 0, totalLength: SENTINEL_STOCK, pricePerMeter: 0,
        } as Material;
    }
    return {
        ...base, type: MaterialType.BEAD, diameter: 1, colour: '',
        quantityPerPack: 1, pricePerPack: 0, totalQuantity: SENTINEL_STOCK, pricePerBead: 0,
    } as Material;
};

const toRequired = (material: Material): RequiredMaterial =>
    material.type === MaterialType.WIRE
        ? ({ ...material, requiredLength: 0 } as RequiredMaterial)
        : ({ ...material, requiredQuantity: 0 } as RequiredMaterial);

export class PlaceholderMaterialResolver {
    constructor(
        private readonly materialRepo: MaterialRepository,
        private readonly idGenerator: IdGenerator,
    ) {}

    async resolve(tags: string[], userId: string): Promise<RequiredMaterial[]> {
        const existing = await this.materialRepo.getByUserId(userId);
        const byName = new Map<string, Material>();
        for (const m of existing) byName.set(m.name, m);

        const uniqueNames = new Map<string, string>(); // name -> originating tag
        for (const tag of tags) {
            const name = placeholderNameForTag(tag);
            if (!uniqueNames.has(name)) uniqueNames.set(name, tag);
        }

        const result: RequiredMaterial[] = [];
        for (const [name, tag] of uniqueNames) {
            let material = byName.get(name);
            if (!material) {
                material = buildPlaceholderMaterial(tag, this.idGenerator.generate(), userId);
                await this.materialRepo.insert(material);
                byName.set(name, material);
            }
            result.push(toRequired(material));
        }
        return result;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/DesignImportService/placeholderMaterials.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/DesignImportService/placeholderMaterials.ts packages/api/src/domain/DesignImportService/placeholderMaterials.test.ts
git commit -m "feat(api): map Etsy material tags to placeholder materials

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Etsy image fetcher (host allowlist)

**Files:**
- Create: `packages/api/src/domain/DesignImportService/imageFetcher.ts`
- Test: `packages/api/src/domain/DesignImportService/imageFetcher.test.ts`

**Interfaces:**
- Produces:
  - `interface EtsyImageFetcher { fetch(url: string): Promise<{ buffer: Buffer; contentType: string }> }`
  - `isAllowedEtsyUrl(url: string): boolean` — true only for `https:` host `i.etsystatic.com`.
  - `class HttpEtsyImageFetcher implements EtsyImageFetcher` — throws on disallowed host, uses global `fetch`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/api/src/domain/DesignImportService/imageFetcher.test.ts
import { describe, it, expect, mock } from 'bun:test';
import { isAllowedEtsyUrl, HttpEtsyImageFetcher } from './imageFetcher';

describe('imageFetcher', () => {
    it('allows only https i.etsystatic.com', () => {
        expect(isAllowedEtsyUrl('https://i.etsystatic.com/1/il/a/1/il_x.jpg')).toBe(true);
        expect(isAllowedEtsyUrl('http://i.etsystatic.com/x.jpg')).toBe(false);
        expect(isAllowedEtsyUrl('https://evil.com/x.jpg')).toBe(false);
        expect(isAllowedEtsyUrl('not a url')).toBe(false);
    });

    it('rejects disallowed hosts before fetching', async () => {
        const fetcher = new HttpEtsyImageFetcher();
        await expect(fetcher.fetch('https://evil.com/x.jpg')).rejects.toThrow(/host/i);
    });

    it('returns buffer and content type on success', async () => {
        const fakeFetch = mock(async () => new Response(new Uint8Array([1, 2, 3]), {
            headers: { 'content-type': 'image/jpeg' },
        }));
        const fetcher = new HttpEtsyImageFetcher(fakeFetch as unknown as typeof fetch);
        const res = await fetcher.fetch('https://i.etsystatic.com/1/il/a/1/il_x.jpg');
        expect(res.contentType).toBe('image/jpeg');
        expect(res.buffer.length).toBe(3);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/DesignImportService/imageFetcher.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// packages/api/src/domain/DesignImportService/imageFetcher.ts
export interface EtsyImageFetcher {
    fetch(url: string): Promise<{ buffer: Buffer; contentType: string }>;
}

export const isAllowedEtsyUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && parsed.hostname === 'i.etsystatic.com';
    } catch {
        return false;
    }
};

export class HttpEtsyImageFetcher implements EtsyImageFetcher {
    constructor(private readonly fetchFn: typeof fetch = fetch) {}

    async fetch(url: string): Promise<{ buffer: Buffer; contentType: string }> {
        if (!isAllowedEtsyUrl(url)) {
            throw Object.assign(new Error(`Refusing to fetch image from disallowed host: ${url}`), { status: 400 });
        }
        const res = await this.fetchFn(url);
        if (!res.ok) {
            throw Object.assign(new Error(`Image fetch failed (${res.status}) for ${url}`), { status: 502 });
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get('content-type') ?? 'image/jpeg';
        return { buffer, contentType };
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/DesignImportService/imageFetcher.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/DesignImportService/imageFetcher.ts packages/api/src/domain/DesignImportService/imageFetcher.test.ts
git commit -m "feat(api): add Etsy image fetcher with host allowlist

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: DesignImportService.preview

**Files:**
- Create: `packages/api/src/domain/DesignImportService/index.ts`
- Test: `packages/api/src/domain/DesignImportService/index.test.ts`

**Interfaces:**
- Consumes: `DesignRepository` (`getByUserId`, `insert`, `update`), `MaterialRepository`, `ImageService` (`uploadImage`), `IdGenerator`, `EtsyImageFetcher`, plus Task 2–5 helpers.
- Produces: `class DesignImportService` with `constructor(designRepo, materialRepo, imageService, idGenerator, imageFetcher)` and `async preview(csvText: string, userId: string): Promise<ImportPreviewResult>`.

Behaviour: parse CSV; drop rows with empty title into `invalid`; load user's designs, index by `importKey`; for each row compute `importKey`; if no existing design → `NEW` (changedFields `[]`); else `diffChangedFields` → `CHANGED` if non-empty else `SAME`. `mappedMaterials` = names via `placeholderNameForTag` (deduped). No writes.

- [ ] **Step 1: Write the failing test**

```ts
// packages/api/src/domain/DesignImportService/index.test.ts
import { describe, it, expect, beforeEach, mock, jest } from 'bun:test';
import type { Design } from '@jewellery-catalogue/types';
import type { DesignRepository } from '../DesignRepository';
import type { MaterialRepository } from '../MaterialRepository';
import type { ImageService } from '../ImageService';
import type { IdGenerator } from '../IdGenerator';
import type { EtsyImageFetcher } from './imageFetcher';
import { DesignImportService } from './index';

const designRepo = { getByUserId: mock(), insert: mock(), update: mock(), getById: mock(), getByIdAndUserId: mock(), getAll: mock(), delete: mock(), findByMaterialId: mock() };
const materialRepo = { getByUserId: mock(), insert: mock(), getById: mock(), getByIdAndUserId: mock(), getAll: mock(), update: mock(), delete: mock() };
const imageService = { uploadImage: mock(), getImage: mock() };
let idc = 0;
const idGenerator = { generate: mock(() => `id-${++idc}`) };
const imageFetcher = { fetch: mock(async () => ({ buffer: Buffer.from([1]), contentType: 'image/jpeg' })) };

const CSV = `TITLE,DESCRIPTION,PRICE,CURRENCY_CODE,QUANTITY,TAGS,MATERIALS,IMAGE1,SKU
New Ring,desc,6.15,GBP,3,t,"Copper,Stone",https://i.etsystatic.com/1/il/a/111/il_x.jpg,
,orphan,1,GBP,1,t,Copper,https://i.etsystatic.com/1/il/a/999/il_z.jpg,`;

const makeService = () => new DesignImportService(
    designRepo as unknown as DesignRepository,
    materialRepo as unknown as MaterialRepository,
    imageService as unknown as ImageService,
    idGenerator as unknown as IdGenerator,
    imageFetcher as unknown as EtsyImageFetcher,
);

describe('DesignImportService.preview', () => {
    beforeEach(() => { jest.clearAllMocks(); idc = 0; });

    it('buckets rows into NEW and invalid, mapping materials', async () => {
        designRepo.getByUserId.mockResolvedValue([]);
        const result = await makeService().preview(CSV, 'u1');
        expect(result.summary).toEqual({ new: 1, changed: 0, same: 0, invalid: 1 });
        expect(result.candidates[0].status).toBe('NEW');
        expect(result.candidates[0].mappedMaterials).toEqual(['Generic Copper Wire', 'Generic Stone Bead']);
        expect(result.invalid[0].title).toBe('');
        expect(designRepo.insert).not.toHaveBeenCalled();
    });

    it('marks matching listing SAME and drifted listing CHANGED', async () => {
        const existing = {
            id: 'd1', userId: 'u1', name: 'New Ring', description: 'desc', price: 6.15,
            importKey: undefined, etsyImageSignature: '111',
        } as unknown as Design;
        // importKey is title-hash of 'New Ring'
        const { deriveImportKey } = await import('./deriveKeys');
        existing.importKey = deriveImportKey({ title: 'New Ring', sku: '' } as any);
        designRepo.getByUserId.mockResolvedValue([existing]);

        const same = await makeService().preview(CSV, 'u1');
        expect(same.candidates.find((c) => c.name === 'New Ring')?.status).toBe('SAME');

        const changedCsv = CSV.replace('6.15', '9.99');
        const changed = await makeService().preview(changedCsv, 'u1');
        const cand = changed.candidates.find((c) => c.name === 'New Ring');
        expect(cand?.status).toBe('CHANGED');
        expect(cand?.changedFields).toEqual(['price']);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/DesignImportService/index.test.ts`
Expected: FAIL — `DesignImportService` not found.

- [ ] **Step 3: Implement preview (commit added next task)**

```ts
// packages/api/src/domain/DesignImportService/index.ts
import type {
    Design, EtsyRow, ImportCandidate, ImportCommitRequest,
    ImportCommitResult, ImportInvalidRow, ImportPreviewResult,
} from '@jewellery-catalogue/types';
import type { DesignRepository } from '../DesignRepository';
import type { IdGenerator } from '../IdGenerator';
import type { ImageService } from '../ImageService';
import type { MaterialRepository } from '../MaterialRepository';
import { deriveImportKey, diffChangedFields, imageSignature } from './deriveKeys';
import type { EtsyImageFetcher } from './imageFetcher';
import { inferDesignType } from './inferDesignType';
import { parseCsv } from './parseCsv';
import { placeholderNameForTag, PlaceholderMaterialResolver } from './placeholderMaterials';

export class DesignImportService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly materialRepo: MaterialRepository,
        private readonly imageService: ImageService,
        private readonly idGenerator: IdGenerator,
        private readonly imageFetcher: EtsyImageFetcher,
    ) {}

    async preview(csvText: string, userId: string): Promise<ImportPreviewResult> {
        const rows = parseCsv(csvText);
        const existing = await this.designRepo.getByUserId(userId);
        const byKey = new Map<string, Design>();
        for (const d of existing) if (d.importKey) byKey.set(d.importKey, d);

        const candidates: ImportCandidate[] = [];
        const invalid: ImportInvalidRow[] = [];

        for (const row of rows) {
            if (!row.title.trim()) {
                invalid.push({ title: row.title, reason: 'Missing title' });
                continue;
            }
            const importKey = deriveImportKey(row);
            const match = byKey.get(importKey);
            const changedFields = match ? diffChangedFields(row, match) : [];
            const status = !match ? 'NEW' : changedFields.length ? 'CHANGED' : 'SAME';

            candidates.push({
                importKey,
                name: row.title.trim(),
                status,
                changedFields,
                price: row.price,
                designType: inferDesignType(row.title),
                imageUrls: row.imageUrls,
                mappedMaterials: [...new Set(row.materials.map(placeholderNameForTag))],
                row,
            });
        }

        const summary = {
            new: candidates.filter((c) => c.status === 'NEW').length,
            changed: candidates.filter((c) => c.status === 'CHANGED').length,
            same: candidates.filter((c) => c.status === 'SAME').length,
            invalid: invalid.length,
        };

        return { candidates, invalid, summary };
    }

    // commit() implemented in Task 8

    private async uploadImages(row: EtsyRow): Promise<string[]> {
        const ids: string[] = [];
        for (const url of row.imageUrls) {
            try {
                const { buffer, contentType } = await this.imageFetcher.fetch(url);
                const id = this.idGenerator.generate();
                await this.imageService.uploadImage(id, buffer, contentType);
                ids.push(id);
            } catch {
                // skip individual image failures
            }
        }
        return ids;
    }

    private newDesign(candidate: ImportCandidate, imageIds: string[], materials: Design['materials']): Design {
        const { row } = candidate;
        return {
            id: this.idGenerator.generate(),
            userId: '', // set by caller
            name: row.title.trim(),
            description: row.description,
            timeRequired: '0',
            materials,
            imageIds,
            price: row.price,
            totalMaterialCosts: 0,
            dateAdded: new Date(),
            totalQuantity: row.quantity,
            designType: candidate.designType,
            importSource: 'ETSY',
            importKey: candidate.importKey,
            etsyImageSignature: imageSignature(row.imageUrls),
            etsyMaterials: row.materials,
        };
    }
}

export { PlaceholderMaterialResolver };
```

Note: `newDesign` and `uploadImages` are used by `commit` in Task 8; they are defined here so the file stays cohesive. `userId` is overwritten in `commit`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/DesignImportService/index.test.ts`
Expected: PASS (both preview tests).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/DesignImportService/index.ts packages/api/src/domain/DesignImportService/index.test.ts
git commit -m "feat(api): add design import preview diffing

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: DesignImportService.commit

**Files:**
- Modify: `packages/api/src/domain/DesignImportService/index.ts`
- Test: `packages/api/src/domain/DesignImportService/index.test.ts` (add a `commit` describe block)

**Interfaces:**
- Produces: `async commit(request: ImportCommitRequest, userId: string): Promise<ImportCommitResult>`.

Behaviour: reload user's designs, index by `importKey`. For each candidate re-derive status from stored design (guard against stale client). NEW without existing → fetch images (Task 7 `uploadImages`), resolve placeholder materials (Task 5), build via `newDesign`, set `userId`, `insert`; if 0 images → push to `failed`, skip. CHANGED with existing → recompute `diffChangedFields`; update `name`/`description`/`price`; if `changedFields` includes `images` → re-upload and replace `imageIds` + `etsyImageSignature`; preserve everything else; `update`. Candidates that resolve to SAME are skipped silently.

- [ ] **Step 1: Write the failing test (append to index.test.ts)**

```ts
describe('DesignImportService.commit', () => {
    beforeEach(() => { jest.clearAllMocks(); idc = 0; });

    const candidate = (over: Partial<import('@jewellery-catalogue/types').ImportCandidate> = {}) => ({
        importKey: 'k1', name: 'New Ring', status: 'NEW' as const, changedFields: [],
        price: 6.15, designType: undefined,
        imageUrls: ['https://i.etsystatic.com/1/il/a/111/il_x.jpg'],
        mappedMaterials: ['Generic Copper Wire'],
        row: { title: 'New Ring', description: 'desc', price: 6.15, quantity: 3,
               materials: ['Copper'], imageUrls: ['https://i.etsystatic.com/1/il/a/111/il_x.jpg'], sku: '' },
        ...over,
    });

    it('creates a new design with seeded quantity and placeholder material', async () => {
        designRepo.getByUserId.mockResolvedValue([]);
        materialRepo.getByUserId.mockResolvedValue([]);
        const res = await makeService().commit({ candidates: [candidate({ importKey: 'k1' })] }, 'u1');
        expect(res.created).toBe(1);
        expect(designRepo.insert).toHaveBeenCalledTimes(1);
        const inserted = designRepo.insert.mock.calls[0][0];
        expect(inserted.userId).toBe('u1');
        expect(inserted.totalQuantity).toBe(3);
        expect(inserted.importSource).toBe('ETSY');
        expect(inserted.materials).toHaveLength(1);
        expect(inserted.imageIds).toHaveLength(1);
    });

    it('reports failure when no images could be fetched', async () => {
        designRepo.getByUserId.mockResolvedValue([]);
        materialRepo.getByUserId.mockResolvedValue([]);
        imageFetcher.fetch.mockRejectedValueOnce(new Error('boom'));
        const res = await makeService().commit({ candidates: [candidate({ importKey: 'k1' })] }, 'u1');
        expect(res.created).toBe(0);
        expect(res.failed[0].name).toBe('New Ring');
        expect(designRepo.insert).not.toHaveBeenCalled();
    });

    it('updates only etsy-owned fields on a changed match, preserving materials', async () => {
        const existing = {
            id: 'd1', userId: 'u1', name: 'New Ring', description: 'desc', price: 6.15,
            importKey: 'k1', etsyImageSignature: '111',
            materials: [{ id: 'real', type: 'WIRE' }], totalMaterialCosts: 42, totalQuantity: 9,
            imageIds: ['old-img'],
        } as any;
        designRepo.getByUserId.mockResolvedValue([existing]);
        materialRepo.getByUserId.mockResolvedValue([]);
        const res = await makeService().commit({
            candidates: [candidate({ importKey: 'k1', status: 'CHANGED',
                row: { title: 'New Ring', description: 'desc', price: 9.99, quantity: 3,
                       materials: ['Copper'], imageUrls: ['https://i.etsystatic.com/1/il/a/111/il_x.jpg'], sku: '' } })],
        }, 'u1');
        expect(res.updated).toBe(1);
        const updated = designRepo.update.mock.calls[0][1];
        expect(updated.price).toBe(9.99);
        expect(updated.materials).toEqual([{ id: 'real', type: 'WIRE' }]);
        expect(updated.totalMaterialCosts).toBe(42);
        expect(updated.totalQuantity).toBe(9);
        expect(updated.imageIds).toEqual(['old-img']); // image signature unchanged -> not refetched
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && bun test src/domain/DesignImportService/index.test.ts`
Expected: FAIL — `commit` is not a function.

- [ ] **Step 3: Implement commit**

Add this method to the `DesignImportService` class (after `preview`), and import `RequiredMaterial`:

Add to the type import at the top: `RequiredMaterial` and the resolver is already imported.

```ts
    async commit(request: ImportCommitRequest, userId: string): Promise<ImportCommitResult> {
        const existing = await this.designRepo.getByUserId(userId);
        const byKey = new Map<string, Design>();
        for (const d of existing) if (d.importKey) byKey.set(d.importKey, d);

        const resolver = new PlaceholderMaterialResolver(this.materialRepo, this.idGenerator);
        const result: ImportCommitResult = { created: 0, updated: 0, failed: [] };

        for (const candidate of request.candidates) {
            const match = byKey.get(candidate.importKey);
            const name = candidate.row.title.trim();

            if (!match) {
                const imageIds = await this.uploadImages(candidate.row);
                if (imageIds.length === 0) {
                    result.failed.push({ name, reason: 'No images could be fetched' });
                    continue;
                }
                const materials = await resolver.resolve(candidate.row.materials, userId);
                const design = { ...this.newDesign(candidate, imageIds, materials), userId };
                await this.designRepo.insert(design);
                result.created += 1;
                continue;
            }

            const changedFields = diffChangedFields(candidate.row, match);
            if (changedFields.length === 0) continue; // resolved SAME

            let imageIds = match.imageIds;
            let etsyImageSignature = match.etsyImageSignature;
            if (changedFields.includes('images')) {
                const fetched = await this.uploadImages(candidate.row);
                if (fetched.length > 0) {
                    imageIds = fetched;
                    etsyImageSignature = imageSignature(candidate.row.imageUrls);
                }
            }

            const updated: Design = {
                ...match,
                name,
                description: candidate.row.description,
                price: candidate.row.price,
                imageIds,
                etsyImageSignature,
            };
            await this.designRepo.update(match.id, updated);
            result.updated += 1;
        }

        return result;
    }
```

Update the `newDesign` return: change the `materials` parameter type usage — it already accepts `Design['materials']`, and `resolver.resolve` returns `RequiredMaterial[]` which is assignable. No further change needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/api && bun test src/domain/DesignImportService/index.test.ts`
Expected: PASS (preview + commit blocks).

- [ ] **Step 5: Run the full service suite**

Run: `cd packages/api && bun test src/domain/DesignImportService`
Expected: PASS across all files in the folder.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/domain/DesignImportService/index.ts packages/api/src/domain/DesignImportService/index.test.ts
git commit -m "feat(api): commit imported designs with placeholders and images

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Wire up DI, handlers, routes

**Files:**
- Modify: `packages/api/src/dependencies/types.ts`
- Modify: `packages/api/src/dependencies/index.ts`
- Modify: `packages/api/src/handlers/Design/index.ts`
- Modify: `packages/api/src/routes/index.ts`
- Test: `packages/api/src/routes/routes.test.ts` (add two route-existence assertions)

**Interfaces:**
- Consumes: `DesignImportService` (Task 7/8), `HttpEtsyImageFetcher` (Task 6).
- Produces: `POST /api/designs/import/preview`, `POST /api/designs/import/commit`.

- [ ] **Step 1: Register the dependency token**

In `packages/api/src/dependencies/types.ts`:
- Add to the `DependencyToken` enum (in the Services group): `DesignImportService = 'DesignImportService',`
- Add the import at top: `import type { DesignImportService } from '../domain/DesignImportService';`
- Add to the `Dependencies` type: `[DependencyToken.DesignImportService]: DesignImportService;`

- [ ] **Step 2: Register the service instance**

In `packages/api/src/dependencies/index.ts`, add these imports:

```ts
import { DesignImportService } from '../domain/DesignImportService';
import { HttpEtsyImageFetcher } from '../domain/DesignImportService/imageFetcher';
```

And register (after the `DesignService` registration block):

```ts
    dependencyContainer.registerSingleton(
        DependencyToken.DesignImportService,
        class {
            constructor() {
                return new DesignImportService(
                    dependencyContainer.resolve(DependencyToken.DesignRepository),
                    dependencyContainer.resolve(DependencyToken.MaterialRepository),
                    dependencyContainer.resolve(DependencyToken.ImageService),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    new HttpEtsyImageFetcher()
                );
            }
        } as any
    );
```

- [ ] **Step 3: Add handlers**

In `packages/api/src/handlers/Design/index.ts`, add:

```ts
import type { DesignImportService } from '../../domain/DesignImportService';

const getDesignImportService = (): DesignImportService =>
    dependencyContainer.resolve(DependencyToken.DesignImportService);

export const previewImport = async (c: Ctx) => {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) {
        throw new APIError('CSV file is required', 400);
    }
    const csvText = await file.text();
    const result = await getDesignImportService().preview(csvText, c.get('userId'));
    return c.json(result, 200);
};

export const commitImport = async (c: Ctx) => {
    const request = await c.req.json();
    const result = await getDesignImportService().commit(request, c.get('userId'));
    return c.json(result, 200);
};
```

- [ ] **Step 4: Register routes**

In `packages/api/src/routes/index.ts`:
- Add `previewImport, commitImport` to the existing import from `'../handlers/Design'`.
- Add these two lines immediately after the `app.post('/api/designs/recalculate-prices', ...)` line (they must precede `'/api/designs/:id'` so the literal paths win):

```ts
    app.post('/api/designs/import/preview', authenticate, previewImport);
    app.post('/api/designs/import/commit', authenticate, commitImport);
```

- [ ] **Step 5: Add route assertions**

Open `packages/api/src/routes/routes.test.ts`, mirror an existing route-existence test, and assert both new POST routes are registered. Run:

Run: `cd packages/api && bun test src/routes/routes.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck + full api tests**

Run: `cd packages/api && bun test && bunx tsc -p tsconfig.check.json --noEmit`
Expected: tests PASS; no type errors. (If `tsconfig.check.json` is absent, use `bunx tsc --noEmit`.)

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/dependencies packages/api/src/handlers/Design/index.ts packages/api/src/routes/index.ts packages/api/src/routes/routes.test.ts
git commit -m "feat(api): expose Etsy import preview/commit endpoints

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Web request builders

**Files:**
- Modify: `packages/web/src/api/endpoints.ts`
- Create: `packages/web/src/api/endpoints/importDesigns/index.ts`
- Test: `packages/web/src/api/endpoints/importDesigns/index.test.ts`

**Interfaces:**
- Consumes: `makeRequestWithAutoRefresh`, `MethodType`, `ImportPreviewResult`, `ImportCommitRequest`, `ImportCommitResult`.
- Produces:
  - `makePreviewImportRequest(file: File, getAccessToken, onTokenRefresh, onTokenClear): Promise<ImportPreviewResult>` — multipart, field `file`.
  - `makeCommitImportRequest(request: ImportCommitRequest, getAccessToken, onTokenRefresh, onTokenClear): Promise<ImportCommitResult>` — JSON body.

- [ ] **Step 1: Add endpoint constants**

In `packages/web/src/api/endpoints.ts`:

```ts
export const DESIGNS_IMPORT_PREVIEW_ENDPOINT = '/api/designs/import/preview';
export const DESIGNS_IMPORT_COMMIT_ENDPOINT = '/api/designs/import/commit';
```

- [ ] **Step 2: Write the failing test**

```ts
// packages/web/src/api/endpoints/importDesigns/index.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makePreviewImportRequest, makeCommitImportRequest } from './index';

const noop = () => {};
const token = () => 'tok';

describe('importDesigns requests', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('posts CSV as multipart to preview endpoint', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ candidates: [], invalid: [], summary: { new: 0, changed: 0, same: 0, invalid: 0 } }), { status: 200 }),
        );
        const file = new File(['TITLE\nx'], 'export.csv', { type: 'text/csv' });
        const res = await makePreviewImportRequest(file, token, noop, noop);
        expect(res.summary.new).toBe(0);
        const [, init] = fetchSpy.mock.calls[0];
        expect(init?.method).toBe('POST');
        expect(init?.body).toBeInstanceOf(FormData);
    });

    it('posts JSON to commit endpoint', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ created: 1, updated: 0, failed: [] }), { status: 200 }),
        );
        const res = await makeCommitImportRequest({ candidates: [] }, token, noop, noop);
        expect(res.created).toBe(1);
        const [, init] = fetchSpy.mock.calls[0];
        expect(init?.method).toBe('POST');
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/web && bunx vitest run src/api/endpoints/importDesigns/index.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```ts
// packages/web/src/api/endpoints/importDesigns/index.ts
import {
    type ImportCommitRequest, type ImportCommitResult,
    type ImportPreviewResult, MethodType,
} from '@jewellery-catalogue/types';
import { DESIGNS_IMPORT_COMMIT_ENDPOINT, DESIGNS_IMPORT_PREVIEW_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makePreviewImportRequest = async (
    file: File,
    getAccessToken: () => string,
    onTokenRefresh: (t: string) => void,
    onTokenClear: () => void,
): Promise<ImportPreviewResult> => {
    const formData = new FormData();
    formData.append('file', file);
    return await makeRequestWithAutoRefresh<ImportPreviewResult>(
        {
            pathname: DESIGNS_IMPORT_PREVIEW_ENDPOINT,
            method: MethodType.POST,
            headers: {},
            operationString: 'preview Etsy import',
            body: formData,
            accessToken: '',
        },
        getAccessToken, onTokenRefresh, onTokenClear,
    );
};

export const makeCommitImportRequest = async (
    request: ImportCommitRequest,
    getAccessToken: () => string,
    onTokenRefresh: (t: string) => void,
    onTokenClear: () => void,
): Promise<ImportCommitResult> => {
    return await makeRequestWithAutoRefresh<ImportCommitResult>(
        {
            pathname: DESIGNS_IMPORT_COMMIT_ENDPOINT,
            method: MethodType.POST,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'commit Etsy import',
            body: request,
            accessToken: '',
        },
        getAccessToken, onTokenRefresh, onTokenClear,
    );
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/web && bunx vitest run src/api/endpoints/importDesigns/index.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/api/endpoints.ts packages/web/src/api/endpoints/importDesigns
git commit -m "feat(web): add Etsy import request builders

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Web ImportDesigns page + route + entry button

**Files:**
- Modify: `packages/web/src/constants/routes.ts`
- Create: `packages/web/src/pages/ImportDesigns/index.tsx`
- Modify: `packages/web/src/index.tsx`
- Modify: `packages/web/src/pages/Designs/index.tsx`

**Interfaces:**
- Consumes: `makePreviewImportRequest`, `makeCommitImportRequest` (Task 10), `useAuth`, `useQueryClient`, shadcn `Button`.

- [ ] **Step 1: Add the route constant**

In `packages/web/src/constants/routes.ts`, add:

```ts
export const IMPORT_DESIGNS_PAGE: NavRoute = {
    name: 'Import from Etsy',
    route: '/designs/import',
};
```

(Leave the `ROUTES` array unchanged unless the app renders nav from it — this page is reached via a button, not the nav.)

- [ ] **Step 2: Create the page**

```tsx
// packages/web/src/pages/ImportDesigns/index.tsx
import { useAuth } from '@imapps/web-utils';
import type { ImportCandidate, ImportPreviewResult } from '@jewellery-catalogue/types';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { makeCommitImportRequest, makePreviewImportRequest } from '../../api/endpoints/importDesigns';
import { DESIGNS_PAGE } from '../../constants/routes';

const ImportDesigns: React.FC = () => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultMsg, setResultMsg] = useState<string | null>(null);

    const token = () => accessToken;

    const onFile = async (file: File) => {
        setBusy(true); setError(null); setResultMsg(null);
        try {
            const res = await makePreviewImportRequest(file, token, login, logout);
            setPreview(res);
            // default: NEW checked, CHANGED unchecked
            setSelected(new Set(res.candidates.filter((c) => c.status === 'NEW').map((c) => c.importKey)));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Preview failed');
        } finally {
            setBusy(false);
        }
    };

    const toggle = (key: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const selectable = (c: ImportCandidate) => c.status !== 'SAME';

    const chosen = useMemo(
        () => (preview?.candidates ?? []).filter((c) => selected.has(c.importKey)),
        [preview, selected],
    );

    const onCommit = async () => {
        if (chosen.length === 0) return;
        setBusy(true); setError(null);
        try {
            const res = await makeCommitImportRequest({ candidates: chosen }, token, login, logout);
            await queryClient.invalidateQueries({ queryKey: ['designs'] });
            setResultMsg(`Created ${res.created}, updated ${res.updated}, failed ${res.failed.length}.`);
            setPreview(null); setSelected(new Set());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Import failed');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Import from Etsy</h1>
                <Button variant="outline" onClick={() => navigate(DESIGNS_PAGE.route)}>Back to designs</Button>
            </div>

            <input
                type="file"
                accept=".csv,text/csv"
                disabled={busy}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />

            {error && <p className="text-destructive">{error}</p>}
            {resultMsg && <p className="text-green-600">{resultMsg}</p>}

            {preview && (
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        {preview.summary.new} new · {preview.summary.changed} changed · {preview.summary.same} unchanged · {preview.summary.invalid} invalid
                    </p>
                    <div className="border rounded-md divide-y">
                        {preview.candidates.map((c) => (
                            <label key={c.importKey} className="flex items-center gap-3 p-2">
                                <input
                                    type="checkbox"
                                    disabled={!selectable(c)}
                                    checked={selected.has(c.importKey)}
                                    onChange={() => toggle(c.importKey)}
                                />
                                {c.imageUrls[0] && (
                                    <img src={c.imageUrls[0]} alt="" className="w-12 h-12 object-cover rounded" />
                                )}
                                <span className="flex-1">{c.name}</span>
                                <span className="text-xs uppercase text-muted-foreground">{c.status}</span>
                                {c.status === 'CHANGED' && (
                                    <span className="text-xs text-amber-600">{c.changedFields.join(', ')}</span>
                                )}
                                <span className="text-sm">£{c.price}</span>
                            </label>
                        ))}
                    </div>
                    <Button disabled={busy || chosen.length === 0} onClick={onCommit}>
                        Import {chosen.length} selected
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ImportDesigns;
```

- [ ] **Step 3: Register the route**

In `packages/web/src/index.tsx`:
- Add import: `import ImportDesigns from './pages/ImportDesigns';`
- Add `IMPORT_DESIGNS_PAGE` to the `constants/routes` import.
- Add a `<Route>` (copy the shape of the `DESIGNS_PAGE` route, wrapped in `ProtectedRoute` + `MainLayout`), placed **before** the `VIEW_DESIGN_PAGE` route so `/designs/import` is not captured by `/designs/:id`:

```tsx
            <Route
                path={IMPORT_DESIGNS_PAGE.route}
                element={
                    <ProtectedRoute fallbackPath={START_PAGE.route}>
                        <MainLayout>
                            <ImportDesigns />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
```

- [ ] **Step 4: Add the entry button on the Designs page**

In `packages/web/src/pages/Designs/index.tsx`:
- Add `IMPORT_DESIGNS_PAGE` to the existing `constants/routes` import.
- Near the existing "Add Design" affordance, add a button (the page already imports `Button` and `useNavigate`):

```tsx
<Button variant="outline" onClick={() => navigate(IMPORT_DESIGNS_PAGE.route)}>
    Import from Etsy
</Button>
```

If `navigate` is not already defined in the top-level component scope (it is defined inside `DraftCard`), add `const navigate = useNavigate();` in the main `Designs` component and place the button in its header area.

- [ ] **Step 5: Typecheck + build + web tests**

Run: `cd packages/web && bunx vitest run && bunx tsc --noEmit`
Expected: tests PASS; no type errors.

- [ ] **Step 6: Manual verification**

Start the app (`bun run start` at repo root or per package README), sign in, open Designs → "Import from Etsy", upload `~/Downloads/EtsyListingsDownload (1).csv`. Confirm: preview shows NEW rows checked, thumbnails render, importing creates designs (list refetches). Re-upload the same CSV → all rows show SAME. Edit one listing's price in the CSV and re-upload → that row shows CHANGED with `price`, and applying it updates only the price.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/constants/routes.ts packages/web/src/pages/ImportDesigns packages/web/src/index.tsx packages/web/src/pages/Designs/index.tsx
git commit -m "feat(web): add Etsy import page with preview and commit

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Dedupe key `SKU || sha1(normalise(title))` → Task 3 `deriveImportKey`. ✓
- NEW/CHANGED/SAME preview, user picks CHANGED → Tasks 7 (diff) + 11 (checkboxes, NEW default-on, SAME disabled). ✓
- Field ownership (CHANGED updates name/desc/price/images only, preserves materials/costs/quantity) → Task 8 commit. ✓
- Generic placeholders per-metal wire + per-gem bead, lazy get-or-create, required 0, cost 0 → Task 5. ✓
- Non-enum metal (Stainless steel) → bead → Task 5 (`placeholderNameForTag` falls through to bead). ✓
- Variations skipped; `totalQuantity` from QUANTITY on NEW → Task 8 `newDesign`. ✓
- Currency ignored, price raw number → Task 2 parse. ✓
- Data model fields (importSource/importKey/etsyImageSignature/etsyMaterials) → Task 1. ✓
- Endpoints preview (multipart) + commit (JSON), re-derive on commit → Task 9 handlers + Task 8. ✓
- Image host allowlist `i.etsystatic.com`, per-image failure skipped, NEW with 0 images → failed → Tasks 6 + 8. ✓
- Web page + route + button + designs cache invalidation → Tasks 10, 11. ✓
- Testing across all helpers/services → Tasks 2–8, 10. ✓

**Placeholder scan:** No TBD/TODO; every code step has full code; test code shown for each failing-test step.

**Type consistency:** `deriveImportKey`, `diffChangedFields`, `imageSignature`, `placeholderNameForTag`, `PlaceholderMaterialResolver.resolve`, `inferDesignType`, `parseCsv`, `DesignImportService.preview/commit`, `EtsyImageFetcher.fetch` names used identically across tasks. `ImportCandidate`/`ImportPreviewResult`/`ImportCommitRequest`/`ImportCommitResult` defined in Task 1, consumed unchanged in Tasks 7–11.

**Known limitation (documented):** if a listing's title (or SKU when present) changes on Etsy, the row imports as a NEW design rather than updating the old one — expected given no stable Etsy listing id in the export.
