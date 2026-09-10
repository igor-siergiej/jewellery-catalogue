# Jewellery Catalogue

[![PR checks](https://github.com/igor-siergiej/jewellery-catalogue/actions/workflows/pull-request.yml/badge.svg)](https://github.com/igor-siergiej/jewellery-catalogue/actions/workflows/pull-request.yml)

A catalogue and stock manager for a handmade-jewellery business: record designs
and the materials they use, track stock as pieces are made and sold, and keep
Etsy listings in sync — import a listing into a design, or push a design out as a
draft listing.

**Live:** https://jewellery-catalogue.imapps.uk

<!-- TODO: add a screenshot or short GIF of the designs + materials view -->

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
(shared interfaces and form models).

- **web** — React 19 + TypeScript + Vite 7. Tailwind 4, Radix/shadcn UI, React
  Query for server state, React Router 7, react-hook-form + Zod for the design
  and material forms. Unit tests in Vitest, e2e in Playwright.
- **api** — Koa 3 + TypeScript on the Bun runtime. Domain services
  (`DesignService`, `MaterialService`, `DraftService`, `GoalService`,
  `TaskService`) sit over MongoDB repositories built on a shared
  `BaseRepository`; `handlers/` and `routes/` are the HTTP edge; `dependencies/`
  wires the DI container.
- **Etsy integration** lives in its own cluster of services —
  `EtsyConnectionService` (OAuth + `EtsyOAuthStateStore`), `EtsyClient`,
  `EtsyPushService`, `EtsyReconcileService`, `EtsyStatusService`.
- **data** — MongoDB (native driver). Design and listing images are stored in
  MinIO / S3-compatible object storage.
- **auth** — a separate auth service issues JWTs; a local `mock-auth-server`
  stands in for it in development.

## Running it

Requires **Bun 1.x**, a local **MongoDB**, and **MinIO**. Copy the env templates
and fill them in:

```bash
cp packages/api/.env.example packages/api/.env
bun install
bun start                 # web on :3000, api from packages/api/.env
bun start:with-mock       # same, with the mock auth server
```

```bash
bun lint                                        # Biome
bun tsc --noEmit                                # type-check
bun --filter @jewellery-catalogue/api test      # API tests (Bun runner)
RUN_INTEGRATION_TESTS=1 bun --filter @jewellery-catalogue/api test integration
cd packages/web && bun pw:e2e                   # Playwright e2e
```

## CI/CD

- **`pull-request.yml`** on every PR: lint → API tests → integration tests
  (dockerised MongoDB) → Playwright e2e → dead-code check. Semgrep security
  scanning (security-audit, TypeScript, OWASP).
- **`ci-cd.yml`** on merge to `main`: the same checks → semantic-release →
  Docker image build/publish (ghcr.io) → deploy. Runs on Dokploy.

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
