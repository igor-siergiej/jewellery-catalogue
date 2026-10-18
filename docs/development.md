# Development

Local setup, environment, scripts and tests. Code-change conventions are in
[`../AGENTS.md`](../AGENTS.md).

## Prerequisites

- Bun 1.x (CI pins `1.4.2`).
- MongoDB reachable from the API. For integration/e2e tests:
  `docker compose -f docker-compose.test.yml up -d` (mongo:7 on host port 27018).
- An S3-compatible object store for images. Locally that's RustFS from the
  shared dev stack (`utils/docker/docker-compose.yml`): S3 API on
  `127.0.0.1:9000`, console on `127.0.0.1:9001`, dev credentials
  `rustfsadmin`/`rustfsadmin`, buckets `jewellery-catalogue` and
  `jewellery-catalogue-staging` created on startup. These match `.env.example`.
  E2E doesn't need it: Playwright sets `IN_MEMORY_IMAGE_STORE=true`.
- An auth service exposing `GET /verify` (Kivo in production). Locally,
  `packages/web/mock-auth-server.js` serves one on :3008.

## Environment

The root scripts load the **root** `.env` via `dotenv-cli`; the template is the
root `.env.example`:

```bash
cp .env.example .env
```

Parsed by `packages/api/src/config/index.ts`:

| Var | Required | Purpose |
|---|---|---|
| `PORT` | yes | API listen port. The Vite dev proxy sends `/api` to `localhost:3001`, so use `3001` locally. Production image exposes 4001. |
| `AUTH_URL` | yes | auth service base URL; the API calls `${AUTH_URL}/verify` for every authenticated request |
| `CONNECTION_URI` | yes | MongoDB connection string |
| `DATABASE_NAME` | yes | MongoDB database |
| `BUCKET_NAME` | yes | image bucket |
| `BUCKET_ACCESS_KEY` | yes | object store credentials |
| `BUCKET_SECRET_KEY` | yes | object store credentials |
| `BUCKET_ENDPOINT` | yes | object store endpoint |
| `ETSY_API_KEY` | yes | Etsy app keystring (any non-empty value with the mock) |
| `ETSY_SHARED_SECRET` | yes | Etsy app secret (any non-empty value with the mock) |
| `ETSY_REDIRECT_URI` | yes | OAuth callback, `<api origin>/api/etsy/oauth/callback` |
| `WEB_APP_URL` | yes | web origin the OAuth callback redirects back to |
| `ETSY_MOCK_URL` | no | local only: route all Etsy calls to `packages/etsy-mock` |
| `FAL_KEY` | no | enables AI listing copy and price suggestions |
| `FAL_MODEL` | no | fal OpenRouter model, default `google/gemini-2.5-flash` |
| `AI_LIMIT_PER_HOUR` | no | per-user AI request cap, default 20 |
| `AI_LIMIT_PER_DAY` | no | per-user AI request cap, default 100 |

The web app reads only `AUTH_URL`, at runtime, from `/config.json`
(`packages/web/public/config.json`, `http://localhost:3008` for dev). In
production that file is replaced by a Dokploy file mount.

Etsy mock env (optional): `PORT` (default 3010), `ETSY_MOCK_PUBLIC_URL`,
`ETSY_MOCK_TOKEN_TTL` (seconds, default 3600).

## Running

```bash
bun install
bun start                 # web (Vite :3000) + api (bun --watch)
bun start:with-mock       # same, plus mock auth server on :3008
bun start:with-etsy-mock  # web + api + etsy-mock on :3010 (set ETSY_MOCK_URL)
```

Individual pieces: `bun start:web`, `bun start:api`, `bun start:etsy-mock`.

On startup the API connects to Mongo and the bucket, creates indexes, purges
done tasks older than 30 days (then daily), and runs Etsy order sync (then every
15 min). Any startup failure exits the process.

## Scripts (root `package.json`)

| Script | What |
|---|---|
| `start`, `start:with-mock`, `start:with-etsy-mock`, `start:web`, `start:web:with-mock`, `start:api`, `start:etsy-mock` | dev servers (above) |
| `link-etsy-listings` | interactive bulk-link of designs to Etsy listings, `--dry-run` supported ([etsy.md](etsy.md#one-off-bulk-link-existing-designs)) |
| `lint` / `lint:fix` / `format` | Biome |
| `audit` | `fallow-audit` (dead code; also runs on pre-push and in PR CI) |
| `release` | semantic-release (CI only) |

`scripts/clean-orphaned-tags.sh` is a standalone shell script, not wired to
`package.json`.

## Testing

```bash
bun lint
bunx tsc -p packages/api --noEmit                     # root `tsc --noEmit` checks nothing (files: [])
bun --filter @jewellery-catalogue/api test            # API unit tests (bun:test)
bun --filter @jewellery-catalogue/etsy-mock test      # mock unit tests
bun --filter @jewellery-catalogue/api test:integration  # starts docker-compose.test.yml, runs *integration*, tears down
cd packages/web && bun pw:e2e                         # Playwright
```

- **Integration** tests (`*.integration.test.ts`) run only with
  `RUN_INTEGRATION_TESTS=1` and need Mongo on :27018.
- **E2E** (`packages/web/tests/e2e`): in CI, Playwright starts the API on :3001
  (database `jewellery_catalogue_e2e`, `E2E_MONGO_URI`, default
  `mongodb://localhost:27018`) and Vite on :3000; `global-setup.ts` starts the
  mock auth server. Locally, start them yourself first. Env overrides:
  `E2E_BASE_URL`, `E2E_API_SERVICE_URL`, `E2E_AUTH_SERVICE_URL`,
  `STAGING_BASE_URL`. Visual specs (`*.visual.spec.ts`) compare against committed
  snapshots. Etsy specs stub the API with `page.route`; they do not use
  `packages/etsy-mock`.
- **`@smoke`** specs run nightly against production from the homelab smoke
  routine (`foundry/smoke/`), read-only.
- Coverage audit of auth and data-write paths: [e2e-coverage.md](e2e-coverage.md).
- Web unit tests (`vitest`) exist but CI does not run them; see AGENTS.md for
  the known `bun:test` import failures.
