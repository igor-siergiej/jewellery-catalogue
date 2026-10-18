# Jewellery Catalogue

[![PR checks](https://github.com/igor-siergiej/jewellery-catalogue/actions/workflows/pull-request.yml/badge.svg)](https://github.com/igor-siergiej/jewellery-catalogue/actions/workflows/pull-request.yml)

A catalogue and stock manager for a handmade-jewellery business: record designs
and the materials they use, track stock as pieces are made and sold, and keep
Etsy listings in sync — import a listing into a design, or push a design out as a
draft listing.

**Live:** https://jewellery-catalogue.imapps.uk

<!-- TODO: add a screenshot or short GIF of the designs + materials view -->

## Goal

Make it easier to organise and keep track of jewellery designs and the materials that go into them for an Etsy shop, and keep a catalogue of everything listed there.

## What it does

- **Designs & materials.** A design is built from required materials (beads,
  wire, findings…) and can have variation groups. Each material carries a cost;
  changing a material's cost propagates through to every variant's total
  material cost.
- **Stock.** "Produce" a design (or a specific variant) to draw down material
  stock and add finished-piece stock; a low-stock dashboard surfaces what needs
  making.
- **Etsy sync.** Connect a shop over OAuth, import an existing listing (image and
  fields) into a design, push a design to Etsy as a draft listing, and reconcile
  stock between the catalogue and live listings.
- **Goals & tasks.** A lightweight board for tracking making goals against
  deadlines.

## Architecture

Bun-workspace monorepo — `packages/web`, `packages/api`, `packages/types`
(shared interfaces and form models), `packages/etsy-mock` (local fake of the
Etsy API). Diagram: [docs/diagrams/architecture.excalidraw](docs/diagrams/architecture.excalidraw)
(open in excalidraw.com or the VS Code Excalidraw extension).

- **web** — React 19 + TypeScript + Vite 8. Tailwind 4, Radix/shadcn UI, React
  Query for server state, React Router 7, react-hook-form + Zod for the design
  and material forms. Unit tests in Vitest, e2e in Playwright.
- **api** — Hono 4 + TypeScript on the Bun runtime. Domain services
  (`DesignService`, `MaterialService`, `DraftService`, `GoalService`,
  `TaskService`) sit over MongoDB repositories built on a shared
  `BaseRepository`; `handlers/` and `routes/` are the HTTP edge; `dependencies/`
  wires the DI container.
- **Etsy integration** lives in its own cluster of services —
  `EtsyConnectionService` (OAuth + `EtsyOAuthStateStore`), `EtsyClient`,
  `EtsyPushService`, `EtsyReconcileService`, `EtsyStatusService`,
  `EtsyListingRefreshService`, and `EtsyOrderSyncService` (pulls sales every 15
  minutes and draws down stock). What syncs in which direction:
  [docs/etsy.md](docs/etsy.md).
- **AI listing copy** — `EtsyListingCopyService` drafts the Etsy title,
  description and 13 tags from a design's materials and photos via fal.ai
  (`FAL_KEY`, optional `FAL_MODEL`, default `google/gemini-2.5-flash`). Without
  `FAL_KEY` the "Generate with AI" button reports it isn't configured; pushing
  still works.
- **data** — MongoDB (native driver). Design and draft images are stored in
  MinIO / S3-compatible object storage; listings imported from Etsy keep their
  Etsy-hosted image URLs.
- **auth** — the shared Kivo auth service issues JWTs; the API verifies each
  bearer token against `${AUTH_URL}/verify` and scopes every query by user. A
  local `mock-auth-server` stands in for it in development.

## Running it

Requires **Bun 1.x**, a **MongoDB**, and **MinIO**. Copy the env template (the
root scripts load the root `.env`) and fill it in — variable reference in
[docs/development.md](docs/development.md#environment):

```bash
cp .env.example .env
bun install
bun start                 # web on :3000, api on $PORT (3001 for the Vite proxy)
bun start:with-mock       # same, with the mock auth server
```

```bash
bun lint                                        # Biome
bunx tsc -p packages/api --noEmit               # type-check (root tsconfig has files: [])
bun --filter @jewellery-catalogue/api test      # API tests (Bun runner)
RUN_INTEGRATION_TESTS=1 bun --filter @jewellery-catalogue/api test integration
cd packages/web && bun pw:e2e                   # Playwright e2e
```

More on tests, scripts and the e2e setup: [docs/development.md](docs/development.md)
and [docs/e2e-coverage.md](docs/e2e-coverage.md). All docs: [docs/](docs/README.md).

### Testing the Etsy integration without a shop

Etsy has no sandbox and a real shop costs money to open, so the repo ships
with `packages/etsy-mock`, a stateful fake of the Etsy Open API v3 that
runs on port 3010. With `ETSY_MOCK_URL=http://localhost:3010` in `.env`,
run `bun start:with-etsy-mock` and connect Etsy in Settings — choose the
`established` scenario to start with seed listings and receipts, or the
`no-shop` scenario to reproduce the "account without a shop" failure
(prod behaves the same way today). The dashboard at
http://localhost:3010/ lets you publish, sell, expire tokens and inject a
fault; the `/__mock/*` control API does the same from scripts (Playwright e2e
stubs the app's own `/api` instead).

## CI/CD

- **`pull-request.yml`** on every PR: lint, then in parallel tsc + API tests,
  integration tests (dockerised MongoDB), Playwright e2e and a `fallow` audit.
- **`ci-cd.yml`** on merge to `main`: lint/tests → semantic-release → Docker
  images pushed to Docker Hub (`igurusama/imapps:jewellery-catalogue-{api,web}-<version>`)
  → Dokploy deploy webhooks. Details: [docs/deployment.md](docs/deployment.md).

## Decisions

- **Etsy is a bounded context, not sprinkled through the app.** Every call to
  Etsy goes through the `Etsy*` services; the rest of the domain deals in
  designs and materials and never knows about listings. OAuth state has its own
  store so a failed connect can't wedge anything else.
- **Cost propagation is computed in the domain, not the UI.** A material price
  change recalculates variant totals server-side, so every client sees the same
  number and the maths is unit-tested in one place.
- **Integration tests against a real MongoDB.** The repository layer is thin but
  easy to get subtly wrong (query shape, indexes), so `RUN_INTEGRATION_TESTS`
  spins up a container and exercises it for real rather than mocking the driver.
- **Separate auth service.** Shared with the other apps in this account; a mock
  server keeps local dev from depending on it.

## Licence

AGPL-3.0-or-later. See [LICENSE](LICENSE).
