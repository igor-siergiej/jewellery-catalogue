# Deployment and operations

How a merge reaches https://jewellery-catalogue.imapps.uk and how it runs there.
Homelab-wide details (tunnel, DNS, Access, Mongo/MinIO, backups) are in
`foundry/docs/homelab.md`; this page covers only what is specific to this app.

Diagram: [diagrams/architecture.excalidraw](diagrams/architecture.excalidraw)
(open in excalidraw.com or the VS Code Excalidraw extension).

## Release pipeline (`.github/workflows/ci-cd.yml`, push to `main`)

1. `lint` → `test` (`tsc --noEmit`, API unit tests) and `integration-test`
   (mongo:7 service on :27018).
2. `release` — `semantic-release` (`.releaserc.json`): Angular commit analysis,
   bumps `package.json` + `packages/{api,web,types}/package.json`, writes
   `CHANGELOG.md`, commits `chore(release): x.y.z [skip ci]`.
3. `build-publish` — inits the `.github/workflows-utils` submodule and runs its
   `pipelines/scripts/publish-images.sh jewellery-catalogue <version>`, which
   builds `Dockerfile.api` and `Dockerfile.web` and pushes to Docker Hub as
   `igurusama/imapps:jewellery-catalogue-{api,web}-<version>` and `-latest`.
4. `deploy` — POSTs the Dokploy deploy webhooks (`DEPLOY_WEB_URL`,
   `DEPLOY_API_URL` secrets) with Cloudflare Access service-token headers
   (`CF_ACCESS_CLIENT_ID`/`CF_ACCESS_CLIENT_SECRET`). Dokploy pulls the new
   image.

PRs (`pull-request.yml`) run lint, tsc + API tests, integration tests,
Playwright e2e and a `fallow` audit; nothing is published.

## Runtime (Dokploy project `apps`)

| Dokploy app | Image | Port | Domain route |
|---|---|---|---|
| `jewellery-catalogue-web` | `Dockerfile.web`: Vite build served by nginx (SPA fallback, `index.html` no-cache, hashed assets 1y) | 3000 | `jewellery-catalogue.imapps.uk` `/` |
| `jewellery-catalogue-api` | `Dockerfile.api`: `bun packages/api/src/index.ts` | 4001 | `jewellery-catalogue.imapps.uk` `/api` (no strip) |

Both are on one hostname, so the browser calls the API same-origin at `/api`.
The web app's `/config.json` (`AUTH_URL` → `https://kivo.imapps.uk`) is a
Dokploy file mount over `/usr/share/nginx/html/config.json`. API env vars are
set in Dokploy (names in [development.md](development.md#environment)).

Ingress follows the homelab pattern: remote → Cloudflare tunnel → Traefik; LAN
and tailnet → blocky → Traefik directly. jewellery-catalogue is a Cloudflare
Access **Bypass** app, so Kivo login is the only gate on every path.

Data: the shared `mongodb` (databases `jewellery_production` /
`jewellery_staging` per `foundry/mongodb/README.md`) and the shared `minio`
bucket for design/draft images, both reached over `dokploy-network`. Backups are
the homelab's (see `foundry/backups/`).

The API runs as a single instance and keeps Etsy OAuth state in memory, so a
deploy during someone's Etsy consent screen invalidates that attempt.

## Observability

- **Logs:** the API logs through the `@imapps/api-utils` `Logger` as JSON lines
  (`{level, message, meta}`) on stdout/stderr (startup, request errors, Etsy
  OAuth failures, order sync failures, `AI call` usage lines). The homelab
  promtail scrapes container output into Loki (Grafana at grafana.imapps.uk).
- **Uptime:** Gatus checks `https://jewellery-catalogue.imapps.uk/` and
  `/api/health` every 60 s and alerts to Discord.
- **Smoke:** `@smoke` Playwright specs run nightly against production
  (`foundry/smoke/`).
- No metrics endpoint or tracing in the app; container CPU/memory come from the
  homelab cAdvisor.

## Rollback

Not scripted in this repo. Images are tagged per version on Docker Hub; rolling
back means pointing the Dokploy app at an earlier
`jewellery-catalogue-{api,web}-<version>` tag.
