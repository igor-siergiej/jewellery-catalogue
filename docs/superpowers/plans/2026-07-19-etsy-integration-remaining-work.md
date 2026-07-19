# Etsy API Integration — Remaining Work

**Status as of 2026-07-19.** Tracks progress against `docs/superpowers/specs/2026-07-16-etsy-api-integration-design.md`'s 5 sub-projects (6, see sub-project 4's scope amendment). For "how we got here," see `.superpowers/sdd/progress.md` (current sub-project's task-by-task ledger — reset per sub-project) and `.superpowers/sdd/archive-*/` (earlier completed sub-projects' ledgers).

## Done and merged to `main`

| # | Sub-project | Plan | PR | Status |
|---|---|---|---|---|
| 1 | Etsy connection (OAuth) | `docs/superpowers/plans/2026-07-16-etsy-oauth-connection.md` | #35 | Merged |
| 2 | Design authoring upgrades (maker docs + price suggestion) | `docs/superpowers/plans/2026-07-18-design-authoring-upgrades.md` | #36 | Merged |
| 3 | Push to Etsy as draft | `docs/superpowers/plans/2026-07-18-push-to-etsy-as-draft.md` | #37 | Merged |
| 4 | Status refresh + Listings page (amended scope) | `docs/superpowers/plans/2026-07-19-etsy-status-and-listings.md` | #38 | Merged |

Both #36 and #37 were originally opened as **stacked PRs** — when #36 was squash-merged, `feat/etsy-push-to-draft` had to be rebased (`git rebase --onto origin/main d48b513 feat/etsy-push-to-draft`) and force-pushed to stay mergeable. #38 (sub-project 4) branched cleanly from `main` post-#37, no stacking involved, and its final whole-branch review caught and fixed one real bug (the Etsy status chip mislabeling a newly-reachable `inactive` state as "Draft") before merge — see its plan's PR description for detail.

## Open

### Sub-project 5: One-time linking script

**PR open:** #40 (branch `feat/link-etsy-listings-script`, not yet merged). Plan: `docs/superpowers/plans/2026-07-19-link-etsy-listings-script.md` (2 tasks). Built `scripts/link-etsy-listings/` — an interactive CLI reusing sub-project 4's `EtsyClient.getShopListingsActive` — that fuzzy-matches (`fuse.js`) unlinked designs to active Etsy listings, lets the operator review/edit one proposed table, then writes `etsy: { listingId, state: 'active', lastPushedAt: null }` on confirm. Supports `--dry-run`. Final review caught and fixed a real bug (pressing Enter with no input at the override sub-prompt silently accepted `listingId: 0`) before merge.

**⚠️ Not yet run against production.** Per the plan's explicit safety constraint, no implementer or reviewer executed this script against real data during development (the repo's `.env` may hold production Mongo/Etsy credentials) — verification was static (14 passing unit tests on the pure matching logic + hand-traced control flow). **This is the one remaining manual step to fully close out the Etsy integration:** after #40 merges, run `bun run link-etsy-listings -- --dry-run` first to preview against prod, review the proposed mapping carefully, then `bun run link-etsy-listings` for the real write — this links the 5 existing prod designs and completes all 6 sub-projects.

## Process notes worth carrying into the next sub-project's dispatches

- **`bunx tsc --noEmit` inside `packages/web` is a silent no-op** (solution-style tsconfig). Use `bunx tsc --build --force` from repo root + diff against a baseline captured via a disposable worktree at the branch's base commit, then `git clean -fd -- packages/` to remove generated artifacts. `packages/api`/`packages/types` don't have this problem.
- **`fallow-audit` (the pre-push hook) hard-fails on dead-code findings**, not just duplication (duplication is warn-only). A method only called via DI-container resolution from a different file (e.g. `dependencyContainer.resolve(...).someMethod()`) reads as unreachable to the static analyzer — suppress with `// fallow-ignore-next-line unused-class-member` directly above the method (see `EtsyClient.getSellerTaxonomyNodes` or `EtsyConnectionService.getValidAccessToken` for the existing convention). Check `bunx fallow-audit --format json` for structured findings if a push is blocked and the reason isn't obvious from the summary.
- **Squash-merging a base branch while a stacked branch is open breaks the stack** — rebase `--onto` the new tip and force-push before continuing work on the child branch.
