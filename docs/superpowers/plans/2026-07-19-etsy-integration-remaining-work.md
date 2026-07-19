# Etsy API Integration — Remaining Work

**Status as of 2026-07-19.** Tracks progress against `docs/superpowers/specs/2026-07-16-etsy-api-integration-design.md`'s 5 sub-projects (now 6, see amendment below). For "how we got here," see `.superpowers/sdd/progress.md` (current sub-project's task-by-task ledger) and `.superpowers/sdd/archive-*/` (completed sub-projects' ledgers).

## Done and merged to `main`

| # | Sub-project | Plan | PR | Status |
|---|---|---|---|---|
| 1 | Etsy connection (OAuth) | `docs/superpowers/plans/2026-07-16-etsy-oauth-connection.md` | #35 | Merged |
| 2 | Design authoring upgrades (maker docs + price suggestion) | `docs/superpowers/plans/2026-07-18-design-authoring-upgrades.md`* | #36 | Merged |
| 3 | Push to Etsy as draft | `docs/superpowers/plans/2026-07-18-push-to-etsy-as-draft.md`* | #37 | Merged |

\* These two plan files exist locally but were never `git add`ed — they're currently untracked in the working tree. Worth committing to the repo now that their branches have merged, for permanent record (or intentionally leave as scratch — your call).

Both #36 and #37 were originally opened as **stacked PRs** (each based on the previous sub-project's branch, not `main`) per an explicit instruction to merge the whole chain in sequence at the end rather than one-by-one. #36 and #37 ended up merged individually before the rest of the stack was ready — when #36 was squash-merged, `feat/etsy-push-to-draft` had to be rebased (`git rebase --onto origin/main d48b513 feat/etsy-push-to-draft`) and force-pushed to stay mergeable. **Squash-merging a base PR while a stacked branch is still open always requires this rebase** — keep that in mind for sub-project 4/5's branches once they exist.

## Not started

### Sub-project 4: Status refresh + Listings page (amended scope)

**Plan written:** `docs/superpowers/plans/2026-07-19-etsy-status-and-listings.md` (8 tasks, verified against the live Etsy API via the Etsy MCP tool — not guessed). Ready to execute with `superpowers:subagent-driven-development`. Original spec text: "Viewing a linked design triggers a lightweight `GET /listings/{id}` ... updates the stored `state`. No background polling in v1." — this part is unchanged.

**Scope amendment (decided mid-session, 2026-07-18, via AskUserQuestion):** the user asked for a new page listing **all current Etsy listings** (live from Etsy, not just catalogue-linked designs), and chose to fold it into sub-project 4 rather than create a separate sub-project 6. This **supersedes** the spec's original decision-log line "No listings screen (one-time script covers linking); orders page is future work." The spec file itself has not been edited to reflect this yet — do that when sub-project 4's plan is written, or at least note the amendment at the top of that plan (mirroring how sub-project 2's/3's plans state their own scope precisely).

**Design sketched but not yet written into a plan** (from mid-session exploration — verify against current code before trusting, since no code was written):
- `EtsyClient.getListing(accessToken, listingId): Promise<{listingId, state}>` — always pass the OAuth token (simpler than branching on public-vs-private per the spec's "public for active, OAuth for draft" note, since the caller is always an already-connected user).
- `EtsyClient.getShopListingsActive(shopId): Promise<EtsyListingSummary[]>` — public endpoint (`GET /shops/{shop_id}/listings/active`, verified in spec's "Verified API facts"), no token needed; paginate internally (Etsy caps `limit` at 100, ~102 listings means 2 pages) and return the full list in one response. Note this only surfaces **active** listings, not drafts sitting on Etsy outside this app — call that out in the plan/UI copy.
- `EtsyConnectionService.getShopId(userId): Promise<number>` — new trivial method (read `shopId` off the stored connection without touching access-token refresh logic at all, since browsing listings doesn't need a live token).
- New `EtsyStatusService` (separate from `EtsyPushService`, single-responsibility): `refreshStatus(designId, userId)` (fetch + persist updated `etsy.state`) and `listShopListings(userId)` (fetch all active listings, cross-reference against this user's designs by `etsy.listingId` to flag which are already linked).
- New routes: `GET /api/designs/:id/etsy-status`, `GET /api/etsy/listings`.
- Web: a new `/listings` page + `LISTINGS_PAGE` route constant + sidebar nav entry (`AppSidebar` maps the `ROUTES` array in `packages/web/src/constants/routes.ts` to icons in a `routeIcons` object in `packages/web/src/components/AppSidebar/index.tsx` — follow that exact pattern, pick a `lucide-react` icon). Status-refresh call fires once on `ViewDesign` mount when the design is already linked (no polling).
- Rough task count estimate: ~7 tasks (EtsyClient methods, EtsyConnectionService.getShopId, EtsyStatusService, handlers/routes/DI, web API client+hooks, ViewDesign wiring, new Listings page).

**Next action:** write the plan (`superpowers:writing-plans`), following the same TDD/bite-sized-task discipline as sub-projects 2 and 3's plans — read those two as the style reference. Then execute with `superpowers:subagent-driven-development` (fresh implementer + reviewer per task), same as sub-projects 2/3. Branch stacks on current `main` tip (sub-projects 1–3 already merged, so no need to stack on a branch — just branch from `main`).

### Sub-project 5: One-time linking script

**No plan file exists yet.** Spec: `scripts/link-etsy-listings.ts` — fetches all active listings + all designs, prints title-similarity suggestions as a proposed `designId → listingId` map, operator confirms/edits inline, writes `etsy: {listingId, state, lastPushedAt: null}` to each design. Guards: refuses to link a listing already linked elsewhere (the unique sparse index on `etsy.listingId`, added in sub-project 3, already backs this at the DB level). Run once against prod for the 5 existing designs; safely rerunnable.

This sub-project benefits from sub-project 4's `getShopListingsActive` already existing (don't duplicate that Etsy call) — do it after 4, not before or in parallel.

## Process notes worth carrying into the next sub-project's dispatches

- **`bunx tsc --noEmit` inside `packages/web` is a silent no-op** (solution-style tsconfig). Use `bunx tsc --build --force` from repo root + diff against a baseline captured via a disposable worktree at the branch's base commit, then `git clean -fd -- packages/` to remove generated artifacts. `packages/api`/`packages/types` don't have this problem.
- **`fallow-audit` (the pre-push hook) hard-fails on dead-code findings**, not just duplication (duplication is warn-only). A method only called via DI-container resolution from a different file (e.g. `dependencyContainer.resolve(...).someMethod()`) reads as unreachable to the static analyzer — suppress with `// fallow-ignore-next-line unused-class-member` directly above the method (see `EtsyClient.getSellerTaxonomyNodes` or `EtsyConnectionService.getValidAccessToken` for the existing convention). Check `bunx fallow-audit --format json` for structured findings if a push is blocked and the reason isn't obvious from the summary.
- **Squash-merging a base branch while a stacked branch is open breaks the stack** — rebase `--onto` the new tip and force-push before continuing work on the child branch.
