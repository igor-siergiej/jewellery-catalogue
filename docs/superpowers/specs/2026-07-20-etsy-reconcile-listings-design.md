# Etsy Reconcile — Create/Link Catalogue Designs From Listings

**Date:** 2026-07-20
**Status:** Design approved, pending implementation plan.

## Problem

The Etsy integration currently only pushes **catalogue → Etsy** (design → draft listing; sub-projects 1–5, PRs #35–44). The reverse is missing: the shop has ~102 active Etsy listings, most with no matching catalogue design. The only reconciliation tool is a one-time CLI (`scripts/link-etsy-listings`, PR #40) that fuzzy-matches *existing* designs to listings — it cannot create a design, and it was never run against prod.

The catalogue is meant to be the source of truth, but it is incomplete: listings live on Etsy with no design behind them. There is no in-app way to reconcile a listing into a design.

## Goal

From the Etsy **Listings page**, let the operator reconcile each unlinked listing into a catalogue design — either by **creating a new stub design** pre-filled from the listing, or by **linking an existing unlinked design** to it. Bulk-first workflow: the Listings table is the queue, worked top-to-bottom, no separate bulk screen.

## Non-goals

- No bulk multi-select / batch create (each design must be completed individually anyway).
- No rich pre-fill review modal for create (user lands on ViewDesign to complete).
- No re-sync of design fields *from* Etsy after creation (one-time pre-fill only).
- No image download into the internal image store (see Images decision below).

## Decisions

- **Approach A — per-row actions.** Each unlinked listing row on `pages/Listings` gets `Create design` + `Link existing`. Rows already linked keep the current "View design" link.
- **Create UX = save stub, open ViewDesign.** Create immediately persists a minimal linked design and navigates to it; the operator fills materials/steps using the existing design edit flow.
- **Link-existing supported.** A picker of the user's *unlinked* designs; selecting one writes the `etsy` link onto it.
- **Images: link, don't copy.** Store Etsy image URLs on the design's `etsy` object; render them directly. Rationale: avoids per-listing image fetch + storage cost. **Known tension:** this makes a stub design's photos depend on Etsy availability, mildly at odds with "catalogue = source of truth." Revisitable — can switch to copy-into-store later without changing the user-facing flow.

## Architecture

### Types (`packages/types/src/design`)

Extend `designEtsySchema`:

```
imageUrls: z.array(z.string()).optional()
```

`imageUrls` holds Etsy listing image URLs for stub designs that have no internal `imageIds` yet.

### Backend (`packages/api`)

**`EtsyClient` — new read method**

- `getListingDetail(listingId: number): Promise<EtsyListingDetail>` where `EtsyListingDetail = { title: string; description: string; price: number; imageUrls: string[] }`.
- Implemented via Etsy API-key reads (no OAuth): `getListing` for title/description/price + `getListingImages` for image URLs. Follows the existing `x-api-key` header convention in `EtsyClient`.

**`EtsyReconcileService` — new domain service**

Depends on `DesignRepository`, `EtsyClient`, `EtsyConnectionService`, id generator.

- `createDesignFromListing(listingId, userId): Promise<{ designId: string }>`
  - Guards: listing must belong to the user's shop (validate against `getShopListingsActive`); listingId must not already be linked to any of the user's designs → else 409.
  - Fetch listing detail. Build a stub `Design`: `name = title`, `price`, `description`, empty `materials`, empty steps/notes, `imageIds: []`, `etsy: { listingId, state: 'active', lastPushedAt: null, pushIncomplete: true, imageUrls }`.
  - Persist via `DesignRepository`. Return new design id.
- `linkListingToDesign(listingId, designId, userId): Promise<void>`
  - Guards: design owned by user and currently unlinked (`!design.etsy`); listingId not already used by another design → else 409. Validate listing belongs to shop.
  - Write `etsy: { listingId, state: 'active', lastPushedAt: null }` onto the design (optionally capture `imageUrls`).

**Handlers (`handlers/Etsy`)** — two new routes:

- `POST` create-design-from-listing → `{ listingId }` → `EtsyReconcileService.createDesignFromListing`.
- `POST` link-listing-to-design → `{ listingId, designId }` → `EtsyReconcileService.linkListingToDesign`.

Error surfacing reuses the real-error pattern from PR #39 (no opaque 500s).

### Frontend (`packages/web`)

- **`pages/Listings`**: unlinked row action cell renders `Create design` and `Link existing`.
  - `Create design` → POST create → navigate to `VIEW_DESIGN_PAGE.getRoute(designId)`.
  - `Link existing` → opens a dialog listing the user's unlinked designs → select → POST link → invalidate `etsy-listings` query so the row flips to "View design".
- **New endpoints + hook**: `api/endpoints/etsyReconcile`, `useEtsyReconcile` — mirror `useEtsyPush` structure (mutations, auto-refresh request helper).
- **`components/Image` / ViewDesign render**: when a design has no `imageIds` but has `etsy.imageUrls`, render those URLs via plain `<img>`. Keep the internal-id path unchanged. (Simplest: ViewDesign left-image block branches on `imageUrls`; avoid overloading the `Image` component's `imageId` contract.)

## Data flow

```
Listings table (unlinked row)
  ├─ Create design ─▶ POST /etsy/reconcile/create { listingId }
  │      └─ EtsyReconcileService.createDesignFromListing
  │            └─ EtsyClient.getListingDetail → build stub Design → DesignRepository.persist
  │      ◀─ { designId } ─▶ navigate ViewDesign → fill materials/steps → existing update flow
  └─ Link existing ─▶ pick unlinked design ─▶ POST /etsy/reconcile/link { listingId, designId }
         └─ EtsyReconcileService.linkListingToDesign → write etsy on design
         ◀─ invalidate etsy-listings → row shows "View design"
```

The Listings table join is unchanged: `EtsyStatusService.listShopListings` already maps `linkedDesignId` by `design.etsy.listingId`, so newly created/linked designs appear as linked on next load.

## Error handling

- Listing already linked → 409 (both create and link).
- Design already linked, or not owned by user → 409 / 404.
- Etsy fetch failure → surface the real Etsy error (PR #39 pattern), not a generic 500.

## Testing

- Unit-test `EtsyReconcileService.createDesignFromListing` and `linkListingToDesign` with fakes: guard branches (already-linked, not-owned, listing-not-in-shop), and correct stub/link mapping. Follow the `EtsyPushService` test style.
- Unit-test the `EtsyListingDetail` mapping in `EtsyClient` (price divisor, image URL extraction) per existing client test patterns.

## Open follow-ups (out of scope)

- Run the sub-project 5 CLI (`link-etsy-listings`) against prod to link the 5 pre-existing designs — still the one outstanding manual migration step, independent of this feature.
- Optional later: switch images from link-only to copy-into-store for full source-of-truth.
