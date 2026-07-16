# Etsy Listing Import — Design

**Date:** 2026-07-15
**Status:** Approved (design)

## Problem

We have an Etsy CSV export (`EtsyListingsDownload.csv`) of ~100 live listings. We want to
seed the catalogue's `Design` records from it, and re-run the import later when listings are
added or edited on Etsy — without re-adding listings already imported. Import must be
driven from the web UI (re-runnable), not a one-off script.

The Etsy `MATERIALS` column is loose descriptive tags (`Copper`, `Stone`, `Amethyst`), not
the app's structured inventory materials. Real material/cost data cannot be derived from the
export; it is enriched by hand afterwards.

## CSV shape

Columns: `TITLE, DESCRIPTION, PRICE, CURRENCY_CODE, QUANTITY, TAGS, MATERIALS,
IMAGE1..IMAGE10, VARIATION 1 TYPE/NAME/VALUES, VARIATION 2 TYPE/NAME/VALUES, SKU`.

Observed in the sample export:
- ~103 listings (raw line count is higher — descriptions contain embedded newlines).
- All titles distinct. All `SKU` empty. All `CURRENCY_CODE` = GBP. All have `IMAGE1`.
- Image URL form: `https://i.etsystatic.com/<shopId>/r/il/<hash>/<imageId>/il_fullxfull.<imageId>_<x>.jpg`.
- 24 distinct material tags. Metals: Copper, Silver, Brass, Yellow gold, Gold, Gilt,
  Stainless steel. Rest are gems/stone/glass/nylon.

## Decisions

1. **Dedupe key** — `importKey = SKU.trim() || sha1(normalise(TITLE))`.
   `normalise` = lowercase, collapse internal whitespace, trim. Auto-upgrades to SKU when
   listings get SKUs on Etsy (rename-safe then). Unique per user.
2. **On re-import match** — preview shows NEW / CHANGED / SAME; user ticks which CHANGED to
   apply. Requires storing an Etsy-field snapshot hash per design to detect drift.
3. **Materials** — attach generic placeholder materials, mapped from Etsy tags. Raw tags
   also stored on the design for reference. Real materials enriched later by hand.
4. **Placeholder granularity** — per-metal wire + per-gem bead, created lazily per distinct
   tag (idempotent get-or-create).
5. **Variations** — skipped in v1. `totalQuantity` seeded from Etsy `QUANTITY`.
6. **Currency** — `userSettings` has no currency field; `PRICE` is taken as a raw number,
   `CURRENCY_CODE` ignored (all GBP in practice).

## Data model changes

Add optional fields to `Design` (`packages/types/src/design/index.ts`):

- `importSource?: 'ETSY'`
- `importKey?: string` — dedupe key (see decision 1), unique per user.
- `importHash?: string` — sha1 of the Etsy-owned snapshot (name, description, price,
  image-id signature). Drives CHANGED detection.
- `etsyMaterials?: string[]` — raw Etsy material tags, kept for reference.

All optional and additive — existing designs and code paths are unaffected.

## Field ownership

**NEW create** sets: `name`, `description`, `price`, `totalQuantity = QUANTITY`, `imageIds`,
`designType`, placeholder `materials`, `totalMaterialCosts = 0`, and the `import*` fields.
`timeRequired` defaults to empty/`"0"` (app-owned, enriched later).

**CHANGED apply** updates only: `name`, `description`, `price`, `imageIds`, and refreshes
`importHash`. It **preserves**: `materials`, `totalMaterialCosts`, `timeRequired`,
`lowStockThreshold`, `variationGroups`/`variants`, and `totalQuantity` (stock is app-owned
after import — mutated by `produceDesigns`).

Consequence: a listing whose *only* Etsy change is quantity will not surface as CHANGED.
That is intentional — we never overwrite app stock from Etsy.

## designType inference

Case-insensitive keyword match on `TITLE`, first match wins in this priority:
`ear cuff`/`earcuff` → `EARCUFF`; `earring` → `EARRINGS`; `necklace`/`pendant` → `NECKLACE`;
`bracelet`/`bangle` → `BRACELET`; `ring` → `RING`; else `undefined`.

## Placeholder materials

Get-or-create per user, idempotent by material `name` (an existing placeholder is reused
across imports and across listings).

- **Metals** {Copper, Silver, Brass, Gold, `Yellow gold`→GOLD, Gilt} → `Generic <Metal> Wire`
  (`WIRE`, valid `metalType`, `wireType = FULL`, dummy `diameter = 1`, `lengthPerPack = 1`,
  `pricePerPack = 0`, `totalLength` = large sentinel, `pricePerMeter = 0`).
- **Non-enum metal (Stainless steel) + all gems/glass/nylon** → `Generic <Tag> Bead`
  (`BEAD`, dummy `diameter = 1`, `colour = ''`, `quantityPerPack = 1`, `pricePerPack = 0`,
  `totalQuantity` = large sentinel, `pricePerBead = 0`). Non-enum metals go here because a
  `WIRE` requires a valid `METAL_TYPE` enum value.

Attached to the design as `RequiredMaterial` with required amount **0** (`requiredLength = 0`
for wire, `requiredQuantity = 0` for bead) so `produceDesigns` never blocks on stock. Tags
within one listing are de-duplicated. `totalMaterialCosts = 0` (all placeholder prices 0).

## Backend

New `DesignImportService` (`packages/api/src/domain/DesignImportService`). Dependencies:
`DesignRepository`, `MaterialRepository`, `ImageService`, `IdGenerator`, an injected CSV
parser, and an injected image fetcher (both injected for testability). Registered in the
dependency container.

### Endpoints (`packages/api/src/routes`, `handlers/Design`)

- `POST /api/designs/import/preview` — auth, multipart CSV upload. Parses CSV, computes
  `importKey` per row, loads the user's existing designs, diffs, returns:
  ```
  { candidates: [ { importKey, name, status: 'NEW'|'CHANGED'|'SAME',
                    changedFields: string[], imageUrls: string[], price, designType,
                    mappedMaterials: string[], raw: <etsy fields needed for commit> } ],
    summary: { new, changed, same, invalid } }
  ```
  No writes, no image fetches. Rows failing basic validation (missing title) → `invalid`.

- `POST /api/designs/import/commit` — auth, JSON body of the selected candidates. For each,
  the server **re-derives** `importKey`/`importHash` and **re-checks** existence (guards
  against double-create races and stale client state) before applying. Then fetches images,
  gets-or-creates placeholder materials, and creates (NEW) or updates (CHANGED). Returns:
  ```
  { created: number, updated: number, failed: [ { name, reason } ] }
  ```

### Image fetching

- **Host allowlist: `i.etsystatic.com` only** (SSRF guard — never fetch arbitrary URLs).
- Fetch `IMAGE1..IMAGE10` where present. Per-image failure is skipped, not fatal.
- A NEW design that ends with 0 successful images → row reported in `failed` (the design
  handler requires ≥1 image).
- Image-id signature = ordered join of Etsy image ids parsed from the URLs; part of
  `importHash` and used to decide whether a CHANGED apply re-fetches/replaces images.

### Reuse

- Extend `addDesign` / `UploadDesign` with an optional initial `totalQuantity` (defaults to
  0 to preserve current behaviour); the import path sets it from Etsy `QUANTITY`.
- CHANGED apply uses a focused repository update of the Etsy-owned fields only.
- Add `csv-parse` dependency to `packages/api`.

## Web

- New `ImportDesigns` page under `packages/web/src/pages/ImportDesigns`, behind a
  `ProtectedRoute` (react-router v6), plus an entry button on the Designs page.
- RTK Query endpoints (`packages/web/src/api/endpoints`): `previewImport` (multipart
  mutation) and `commitImport` (JSON mutation, invalidates the designs cache on success).
- UI flow: file input → call preview → grouped table NEW / CHANGED / SAME with checkboxes
  (NEW checked by default, CHANGED unchecked, SAME disabled), etsy-URL thumbnails, per-row
  designType and price → confirm → commit → result toast + designs refetch.

## Testing

Unit + service tests via the project's test library (using the `/write-unit-test` command):

- `importKey` derivation + `normalise`.
- `designType` inference across title samples.
- Tag → placeholder mapping (metal vs gem vs non-enum metal).
- `importHash` construction + CHANGED detection (name/desc/price/image drift; quantity-only
  change is not CHANGED).
- CSV row → candidate mapping (including embedded-newline descriptions).
- Preview diff produces correct NEW/CHANGED/SAME/invalid buckets.
- Commit create + update paths; placeholder get-or-create idempotency across two imports.
- Image host allowlist rejects non-`i.etsystatic.com` URLs.

No e2e in v1.

## Out of scope (v1)

- Etsy variations → variation groups.
- Currency conversion.
- Real material costs / stock levels from Etsy.
- Auto-updating app stock quantity from Etsy `QUANTITY` on re-import.
