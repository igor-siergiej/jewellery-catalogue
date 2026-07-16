# Etsy API v3 Integration — Design

**Date:** 2026-07-16
**Status:** Approved (brainstorm with Igor)
**Supersedes:** CSV bulk import (PR #33, reverted in PR #34). CSV had no stable listing ID; title-hash keys created duplicates on renames. The API's `listing_id` removes the problem entirely.

## Overview

The catalogue app becomes the source of truth for jewellery designs. The shop owner (Mari) starts every new design here — diagrams, making notes, materials and quantities — then enriches it with variations and calculated costs, and finally pushes it to Etsy as a **draft listing**. She double-checks and publishes from Etsy Shop Manager. `listing_id` is the join key between designs and Etsy listings everywhere.

**Verified API facts** (tested 2026-07-16 against live API):

- Auth header: `x-api-key: <keystring>:<shared_secret>` (colon-joined; keystring alone → 403)
- Shop: MariCrystalJewellery, `shop_id` 47408839, `user_id` 844469719, 102 active listings, GBP, no SKUs
- Public reads need only the API key: `GET /shops?shop_name=`, `GET /shops/{id}/listings/active`, `GET /listings/{id}/images` (images are NOT inlined by `includes=Images` on the shop-listings endpoint — separate call)
- Private reads (`/listings/{id}/inventory`, receipts) and all writes need OAuth 2.0 user tokens
- `createDraftListing` required fields: `quantity, title, description, price, who_made, when_made, taxonomy_id`
- Drafts can exist without images; Etsy requires ≥1 image only to publish

## Goals

1. Mari authorises the app once; the backend holds and refreshes tokens forever after.
2. Designs carry private maker documentation (diagrams, making notes) that never reaches Etsy.
3. A push flow creates a complete Etsy draft (fields, photos, variations) from a design.
4. Designs display their Etsy state (Draft / Active) with a link to the listing.
5. The 5 existing prod designs get linked to their listings via a one-time script.

## Non-goals (v1)

- Stock/price sync after push (re-push/update flow is future work; v1 blocks re-push with "already on Etsy")
- Orders/receipts screen (scope requested now so no re-consent later; feature comes after v1)
- Creating designs from unlinked listings (the 97 unmatched listings stay Etsy-only)
- AI-generated descriptions (template system is designed so AI can fill the slot later)
- Multi-shop support (single connection per user; schema doesn't preclude more)

## Sub-projects (build order)

### 1. Etsy connection (OAuth) — foundation

- **Settings page**: "Connect Etsy" button → OAuth 2.0 authorization-code + PKCE redirect to Etsy → consent → callback `GET /api/etsy/oauth/callback` exchanges code for tokens.
- **Scopes, all requested up front**: `listings_r listings_w shops_r transactions_r email_r`.
- **Token storage**: `etsyConnections` Mongo collection, one document per user: `{ userId, shopId, shopName, accessToken, accessTokenExpiresAt, refreshToken, connectedAt }`. Shop id/name fetched at connect time via `getMe`/`getShop`.
- **`EtsyClient`** (api package): wraps fetch; injects colon-format `x-api-key`; attaches bearer token; refreshes automatically when <60s of life remains (Etsy access tokens live 1h; refresh tokens roll, 90-day life, each refresh returns a new one — always persist the returned pair). Refresh failure marks the connection broken; API responses then tell the web app to show "Reconnect Etsy".
- **Settings UI**: connected state shows shop name + disconnect (deletes the document).
- **Needed from Mari**: register the callback URLs (prod + localhost) in the Etsy developer portal for her app; one consent click while logged into the Etsy account owning the shop. Keystring + shared secret already provided; server-side env vars.

### 2. Design authoring upgrades

- **Schema**: `diagramImageIds: string[]` (default `[]`) and `makingNotes: string` (default `''`) on `designSchema`. Both private — excluded from any Etsy payload by construction (the push mapper only reads whitelisted fields).
- **Forms**: AddDesign/EditDesign get a "Maker docs" section — diagram image upload (reuses existing image pipeline) + notes textarea. Drafts autosave already covers new fields via the existing drafts feature.
- **Pricing suggestion**: user settings gain `markupMultiplier` (default 2.5) and `hourlyRate` (default 0). Suggested price = `totalMaterialCosts × markupMultiplier + parsedTimeRequired × hourlyRate`, shown read-only beside the price input on design and per-variant; never auto-applied — one click copies it into the field.

### 3. Push to Etsy as draft

- **Entry**: "Send to Etsy" button on design page (hidden until connection exists; disabled with reason when design already linked).
- **Push dialog** (pre-send review):
  - Composed description: per-user description template (settings, plain textarea with placeholders `{description}`, `{materials}`) rendered with the design's values; editable in the dialog before send. Future AI generation replaces the render step only.
  - Category: `designType → taxonomy_id` map in user settings (one-time setup UI: dropdown of Etsy taxonomy nodes fetched from `getSellerTaxonomyNodes`, per designType). Dialog shows the resolved category.
  - Price: prefilled from design price; suggestion shown alongside.
  - Photos: whatever product photos exist on the design are listed (diagrams excluded); pushing with zero photos allowed — Mari adds them on Etsy before publish.
  - Fixed fields: `who_made=i_did`, `when_made=made_to_order`, `quantity` from design `totalQuantity` (min 1).
- **Server flow** (`POST /api/designs/:id/etsy-push`):
  1. `createDraftListing` with mapped fields
  2. `uploadListingImage` per product photo (order preserved)
  3. If the design has variations: `updateListingInventory` — variation group name → Etsy property name, option material names → property values, each variant → offering `{ price, quantity, is_enabled }`. Etsy caps at 2 variation properties; push validates and rejects designs with >2 groups with a clear message.
  4. Persist `etsy: { listingId, state: 'draft', lastPushedAt }` on the design (unique index on `etsy.listingId`).
- **Failure model**: steps are sequential; on failure after listing creation the listing id is still persisted with a `pushIncomplete: true` flag so a retry can resume (idempotent: images re-uploaded only if missing, inventory re-put). Etsy error bodies surface verbatim in the dialog.

### 4. Status refresh

- Viewing a linked design triggers a lightweight `GET /listings/{id}` (public, API-key only for active; OAuth for draft) and updates the stored `state`. Chip flips Draft → Active after Mari publishes. No background polling in v1.

### 5. One-time linking script

- `scripts/link-etsy-listings.ts`: fetches all active listings, fetches all designs, prints title-similarity suggestions as a proposed `designId → listingId` map, operator confirms/edits the map inline, script writes `etsy: { listingId, state, lastPushedAt: null }` to each design. Guards: refuses to link a listing already linked elsewhere (unique index backs this). Run once against prod for the 5 existing designs; rerunnable safely.

## Data model changes

```
designSchema +
  diagramImageIds: string[]        // private maker docs
  makingNotes: string              // private maker docs
  etsy?: {
    listingId: number              // unique index (sparse)
    state: 'draft' | 'active' | 'inactive'
    lastPushedAt: Date | null
    pushIncomplete?: true
  }

userSettings +
  markupMultiplier: number
  hourlyRate: number
  etsyDescriptionTemplate: string
  etsyTaxonomyMap: Record<DesignType, number>

new collection: etsyConnections (one per user)
```

## Error handling

- Token refresh failure → connection marked broken → web shows "Reconnect Etsy" banner on Etsy-dependent surfaces; all other app function unaffected.
- Etsy 4xx on push → verbatim error in dialog; no partial design mutation beyond the resume flag.
- Rate limits (10k/day, per-second cap) → `EtsyClient` retries once on 429 with backoff; push volumes are tiny.

## Testing

- Unit: payload mappers (design → createDraftListing body; variation groups/variants → inventory body; template rendering; price suggestion). These carry the correctness weight.
- Integration: `EtsyClient` refresh logic against a stubbed token endpoint (expiry, rotation, failure → broken state).
- E2E: push flow with mocked Etsy API (mock server returns canned listing/image/inventory responses), asserting persisted `etsy` block and dialog states.
- Live smoke (manual): one real draft pushed to the shop, verified in Shop Manager, then deleted.

## Decisions log

| Decision | Choice | Why |
|---|---|---|
| CSV import | Reverted (PR #34) | No stable ID in CSV; API `listing_id` solves it |
| First-token acquisition | In-app Connect flow (option B) | Igor's call; proper UX, multi-user-ready |
| Scopes | All at once | Avoid re-consent for future orders screen |
| Diagrams/notes | Private, never pushed | Maker documentation only |
| Photos at push | Optional | Photos often taken after piece is made |
| Description | Template + manual edit now, AI later | Template slot designed for AI fill |
| Category | designType → taxonomy_id settings map | Zero effort per push |
| Price | Formula suggestion, manual apply | Costs × markup + time × rate |
| Link-back | Store listingId + state on design | Enables status chip, future sync |
| Existing 102 listings | Link-only one-time script (5 designs) | Manual linking simpler at this scale; rest stay Etsy-only |
| Publish step | Always in Etsy Shop Manager | The human double-check Mari wants |

## Open items

- Prod domain for callback URL — read from dokploy at implementation time.
- Exact taxonomy ids — resolved during settings-map implementation via `getSellerTaxonomyNodes`.
- `timeRequired` is a free string today; price formula needs a parse rule (treat unparseable as 0 hours).
