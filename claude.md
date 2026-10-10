# Jewellery Catalogue: agent notes

Product overview, architecture rationale and CI summary live in [README.md](README.md). This
file covers what you need to change the code safely.

## Stack

- **Monorepo:** Bun workspaces. `packages/web`, `packages/api` and `packages/types` (shared
  interfaces and Zod form schemas, imported as `@jewellery-catalogue/types`). `bun.lock` is
  checked in. CI pins Bun to `1.4.2`.
- **api:** Hono 4 on the Bun runtime. `createApp` and `APIError` come from
  `@imapps/api-utils/hono`. The DI container, `MongoDbConnection`, `ObjectStoreConnection`,
  `ConfigService` and `Logger` come from `@imapps/api-utils`. MongoDB native driver 6 (the
  connection is api-utils', so driver upgrades go through that package first). MinIO for images.
- **web:** React 19, Vite 8, Tailwind 4, Radix/shadcn (`src/components/ui`), TanStack Query,
  React Router 7, react-hook-form + Zod, tiptap rich text, lucide-react 1.x. PWA via
  `vite-plugin-pwa` injectManifest (`src/sw.ts`). `useAuth` comes from `@imapps/web-utils`.
- **Tooling:** Biome 2.5 (lint and format, run by lint-staged on commit), TypeScript 7
  (`strict: false`, `types: ["bun"]` in the root tsconfig), semantic-release, fallow-audit on
  pre-push.

## API layout (`packages/api/src`)

- `routes/index.ts` holds the route list. Every route is under `/api/*` and all except
  `/api/health` and the Etsy OAuth callback go through `authenticate`. The resource groups are
  `designs`, `materials`, `drafts`, `goals`, `tasks`, `user-settings`, `images`/`image/:name`
  (`authenticateImageRequest` also accepts a token in the query string) and `etsy/*`. Design
  Etsy actions live under `/api/designs/:id/etsy-*`.
- `middleware/auth.ts` verifies the bearer token against the Kivo auth service
  (`AUTH_URL/verify`) and sets `userId` on the context. Every repository query is scoped by
  `userId`.
- `handlers/<Resource>` are the HTTP edge. `domain/` holds the services and repository
  interfaces, and `infrastructure/` the Mongo, bucket and fal.ai implementations.
  `dependencies/` wires the container (`DependencyToken`).
- **Domain services:** Design, Material, Draft, Goal, Task, UserSettings, Image. The Etsy
  cluster is `EtsyConnectionService` (OAuth, `EtsyOAuthStateStore`), `EtsyClient`,
  `EtsyPushService`, `EtsyReconcileService`, `EtsyStatusService` and `EtsyListingCopyService`
  (AI title/description/tags via `FalVisionClient`). Only `Etsy*` code talks to Etsy.
- Done tasks are purged 30 days after completion by a daily interval in `index.ts`.

## Env (`packages/api/.env`, template `packages/api/.env.example`)

`PORT`, `AUTH_URL`, `CONNECTION_URI`, `DATABASE_NAME`, `BUCKET_NAME`, `BUCKET_ACCESS_KEY`,
`BUCKET_SECRET_KEY`, `BUCKET_ENDPOINT`, `ETSY_API_KEY`, `ETSY_SHARED_SECRET`,
`ETSY_REDIRECT_URI` and `WEB_APP_URL` are required. `FAL_KEY` and `FAL_MODEL` are optional:
without `FAL_KEY` the "Generate with AI" action reports that it isn't configured.

## Commands

```bash
bun lint                                              # Biome
bun --filter @jewellery-catalogue/api test            # API unit tests (bun:test)
RUN_INTEGRATION_TESTS=1 bun --filter @jewellery-catalogue/api test integration  # needs Mongo on :27018 (docker-compose.test.yml)
bun --filter @jewellery-catalogue/web build
cd packages/web && bun pw:e2e                         # Playwright: functional + visual
```

Gotchas:
- Root `bun tsc --noEmit` checks nothing because the root tsconfig has `files: []`. Use
  `bunx tsc -p packages/api --noEmit` (and the equivalent for `packages/types`). Web has
  pre-existing project-reference errors (TS6305) under `tsc -p`.
- Web vitest: `flattenTaxonomyNodes` and `getSuggestedPrice` tests import `bun:test`, so they
  fail under vitest. CI does not run web unit tests.

## E2E (`packages/web/tests/e2e`)

- When no remote target is set, `global-setup.ts` starts a mock Kivo auth server on :3008.
  The `authenticatedPage` fixture (`fixtures/`) logs in with a mock token, and specs seed data
  through the API (`utils/api-helpers.ts`, `E2E_API_SERVICE_URL`, default :3001).
- `*.visual.spec.ts` runs under the `mobile-visual` (Pixel 7) and `desktop-visual` projects.
  Baselines are committed in `*-snapshots/`. The dev build pins the version to `localhost` so
  release bumps don't drift the baselines.
- `@smoke` runs post-deploy against production (`E2E_BASE_URL`, no mock auth). Only tag
  read-only specs that need no seeded data.

## Deploy

Merging to `main` runs `ci-cd.yml`: checks, semantic-release, then the root `Dockerfile.api`
and `Dockerfile.web` images are built by `.github/workflows-utils` (a submodule; don't init it
locally, because its `biome.json` breaks the root lint). Dokploy webhooks then deploy to
https://jewellery-catalogue.imapps.uk.

## Planned work

The Kanban board `jewellery-catalogue.board.md` in the notes `kanban/` directory, worked with
`kanban-cli`.
