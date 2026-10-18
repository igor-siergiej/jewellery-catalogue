# Etsy integration — operator guide

What the Etsy integration does today, how to connect a shop, and what moves in
which direction. This page describes the code as built
(`packages/api/src/domain/Etsy*`, `packages/api/src/handlers/Etsy`).

All Etsy traffic goes through `EtsyClient` (`https://api.etsy.com/v3/application`,
or `ETSY_MOCK_URL` when set). Nothing else in the app calls Etsy.

## Prerequisites

API env (see [development.md](development.md#environment)):

| Var | Purpose |
|---|---|
| `ETSY_API_KEY` | Etsy app keystring |
| `ETSY_SHARED_SECRET` | Etsy app shared secret |
| `ETSY_REDIRECT_URI` | OAuth callback; must point at the API route `/api/etsy/oauth/callback` and be registered on the Etsy app |
| `WEB_APP_URL` | where the callback redirects the browser afterwards (`<WEB_APP_URL>/settings?etsy=connected` or `?etsy=error`) |
| `ETSY_MOCK_URL` | local only — send every Etsy call to `packages/etsy-mock`. Never set in production |

The production value of `ETSY_REDIRECT_URI` is held in Dokploy, not in the repo.

## Connecting a shop

1. **Settings → Etsy Connection → Connect Etsy.** The API
   (`GET /api/etsy/oauth/start`) creates a PKCE verifier and a `state`, keeps
   them in memory (`EtsyOAuthStateStore`, 5-minute TTL) and returns the Etsy
   consent URL.
2. Approve on Etsy. Scopes requested: `listings_r listings_w shops_r
   transactions_r email_r`.
3. Etsy redirects to `/api/etsy/oauth/callback` (unauthenticated). The API
   consumes the `state`, exchanges the code, looks up the user's shop and upserts
   one document per user in the `etsyConnections` collection (shop id/name,
   access + refresh token, expiry).
4. The browser lands on `/settings?etsy=connected` (or `?etsy=error`).

Notes:

- OAuth state is in process memory. An API restart (e.g. a deploy) between
  steps 1 and 3, or taking longer than 5 minutes, makes the callback fail with
  "Invalid or expired Etsy OAuth state" — just start again.
- Access tokens are refreshed automatically when within 60 s of expiry.
- If order sync gets a 403 from Etsy the connection is marked **broken**;
  Settings then shows "Etsy connection needs to be re-authorized" with a
  **Reconnect Etsy** button. Reconnecting overwrites the stored connection.
- **Disconnect** deletes the stored connection only; linked designs keep their
  `etsy.listingId`.
- An Etsy account with no shop cannot connect (the callback needs a shop). The
  mock's `no-shop` scenario reproduces this.

### Settings used by push

Once connected, Settings also stores (per user, `userSettings` collection):

- **Category map** — design type → Etsy taxonomy id (from `GET /api/etsy/taxonomy`).
  Push refuses a design whose type has no mapping.
- **Shipping profile** — from `GET /api/etsy/shipping-profiles`. If unset, push
  uses the shop's only profile and errors if there are several.
- **Description template** — default listing description when the design has no
  saved listing copy.

## What syncs, and in which direction

| Action | Trigger | Direction | What happens |
|---|---|---|---|
| **Send to Etsy** (push as draft) | design page, `POST /api/designs/:id/etsy-push` | app → Etsy | Creates a **draft** listing (always `when_made: made_to_order`, the shop's made-to-order processing profile preferred). Title/description/tags/price come from the dialog, else saved listing copy, else design name + description template. Uploads design photos (originals from MinIO), and variant inventory when the design has variation groups. Resumable: a part-failed push is flagged `pushIncomplete` and re-running it skips images already uploaded. Refused for `catalogueOnly` designs and for designs already linked. The listing stays a draft — publishing is done on Etsy. |
| **Listing status** | opening a linked design, `GET /api/designs/:id/etsy-status` | Etsy → app | Refreshes the stored listing state (draft/active/…). |
| **Sync quantity** | `POST /api/designs/:id/etsy-sync-quantity` | Etsy → app | Overwrites the design's stock with the listing quantity. Not allowed for designs with variants. |
| **Listings page** | `/listings`, `GET /api/etsy/listings` | Etsy → app (read) | Shop listings with their linked design, if any. |
| **Create design from listing** | Listings page, `POST /api/etsy/reconcile/create` | Etsy → app | New design from an active, unlinked listing: title, description, price, variations, and the listing's image URLs (Etsy-hosted; not copied into MinIO). Stock starts at 0; materials are left empty. |
| **Link listing to design** | Listings page, `POST /api/etsy/reconcile/link` | — | Attaches an active, unlinked listing to an existing unlinked design. No fields are overwritten apart from the `etsy` link and image URLs. |
| **Order sync** | API timer, every 15 min (and on startup) | Etsy → app | Reads shop receipts since the last watermark, records each transaction in `sales`, and decrements stock on the linked design/variant (never below 0, idempotent per transaction). The first run after connecting only sets the watermark — earlier sales are not imported. Sales for listings with no linked design appear under **Unmatched Etsy sales**. |
| **Goal sync** | goal with an Etsy source, `POST /api/goals/:id/etsy-sync` | Etsy → app | Refreshes the goal's current value from the shop. |
| **Generate with AI** | push dialog, `POST /api/designs/:id/etsy-listing/generate` | fal.ai → app | Drafts title, description and 13 tags from the design's materials and up to 3 photos. Needs `FAL_KEY`; push works without it. |
| **Refresh listing copy** | Listings page, `POST /api/etsy/listings/:listingId/copy/propose`, then `PUT /api/etsy/listings/:listingId/copy` | app → Etsy | Proposes regenerated copy for a live, linked listing; Etsy is only written when you apply it for that one listing. |

AI routes (generate, propose, price suggestion) share a per-user rate limit:
`AI_LIMIT_PER_HOUR` (default 20) and `AI_LIMIT_PER_DAY` (default 100). Every
call is recorded in the `aiUsage` collection and logged as `AI call`.

Not implemented: pushing edits to an already-linked listing (other than
"Refresh listing copy"), publishing, and pushing stock changes to Etsy.

## One-off: bulk-link existing designs

`bun link-etsy-listings [--dry-run]` (root `.env`) matches unlinked designs to
active listings of the connected shop, lets you edit the proposed pairs
interactively, then writes the links. It assumes a single connected shop.

## Local testing with the mock

`packages/etsy-mock` is a stateful fake of the Etsy v3 endpoints `EtsyClient`
uses. Set `ETSY_MOCK_URL=http://localhost:3010` and run
`bun start:with-etsy-mock`; see the README section
"Testing the Etsy integration without a shop" for the consent page, scenarios
and dashboard. State is in memory and is lost on restart.

To load real shop data into the running mock from Etsy's CSV exports:

```bash
bun packages/etsy-mock/scripts/import-listings.ts <listings.csv> [--state=active] [--taxonomy-id=…] [--shop-name=…|--shop-id=…] [--mock-url=…]
bun packages/etsy-mock/scripts/import-receipts.ts <sold-orders.csv> [--shop-name=…|--shop-id=…] [--mock-url=…]
```

Playwright e2e does not use the mock: the Etsy specs stub `/api/etsy/*` and
`/api/designs/*/etsy-*` with `page.route`.
