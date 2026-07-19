# One-Time Etsy Listing Linking Script (Sub-project 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `scripts/link-etsy-listings.ts` — an interactive, rerunnable CLI script that proposes `design → Etsy listing` links by title similarity, lets the operator review/edit/confirm in one table, and writes `etsy: { listingId, state: 'active', lastPushedAt: null }` onto each confirmed design — Sub-project 5 of `docs/superpowers/specs/2026-07-16-etsy-api-integration-design.md`.

**Architecture:** Same "pure mapper functions, thin orchestration" split as `EtsyPushService`/`EtsyStatusService`: a pure, fully unit-tested `mappers.ts` (matching logic, override application, duplicate-assignment validation, table formatting — zero I/O) plus a thin `index.ts` CLI entry point that wires up Mongo + `EtsyClient`, drives the interactive prompt loop, and performs the writes. This is a repo-root operational script (not part of any `packages/*` workspace member), reached via a new root `package.json` script — chosen per user decision: **one full proposed-mapping table with inline row editing, single final y/N confirm, plus a `--dry-run` flag** that previews without writing.

**Tech Stack:** Bun + TypeScript, `fuse.js` (title-similarity matching, same library/config style already used in `packages/web/src/pages/Designs/index.tsx`), `node:readline/promises` (interactive prompts), MongoDB (via `@imapps/api-utils`'s `MongoDbConnection`), `bun:test`.

## Global Constraints

- **Reuses `EtsyClient.getShopListingsActive(shopId)` from sub-project 4** (`packages/api/src/domain/EtsyClient/index.ts`) — do not duplicate that Etsy call. It's a public endpoint (no OAuth token needed) returning `EtsyListingSummary[]` (`{ listingId, title, price, url }`), already paginated internally.
- **Guard (spec-mandated):** refuses to link a listing already linked to a different design. The unique sparse index on `etsy.listingId` (`packages/api/src/index.ts`, added in sub-project 3) already backs this at the DB level — but this script must ALSO create that same index defensively on startup (idempotent `createIndex` call) since the script can run independently of the API server ever having booted against this database, and must ALSO validate for duplicate assignments in-memory before writing, so the operator gets a clear error instead of a raw Mongo duplicate-key exception.
- **Safely rerunnable (spec-mandated):** designs that already have `etsy.listingId` set must never be re-suggested or re-prompted — the script only ever proposes links for designs where `!design.etsy?.listingId`.
- **`state` is always `'active'`** for links written by this script — `getShopListingsActive` only returns active listings (verified against the live Etsy API in sub-project 4's plan), so there is no other state a linked-via-script design could have. `lastPushedAt: null` (this design was never pushed *from* the app — it was linked to a listing that already existed on Etsy).
- **No tsc project-reference coverage for `scripts/`.** The root `tsconfig.json`'s `references` array only covers `packages/types`, `packages/api`, `packages/web` — this script sits outside that graph, and `EtsyClient.ts` uses the bare specifier `@jewellery-catalogue/types` (only resolvable via `packages/api/tsconfig.json`'s `paths` mapping or Bun's native runtime workspace resolution — **verified this session**: a standalone `tsc --noEmit` invocation on a file that transitively imports `EtsyClient` fails with `Cannot find module '@jewellery-catalogue/types'`/`Cannot find module 'node:crypto'`, while `bun test` on the exact same import graph resolves everything correctly via Bun's native resolver). Matching the existing `scripts/clean-orphaned-tags.sh` precedent (zero typecheck infrastructure for repo-root scripts), this plan does NOT add one. Verification is `bun test` for the pure mapper functions, plus careful code review for the orchestration script (see Task 2's safety note below — do not execute it against the real configured database).
- **Bun's isolated linker does not hoist workspace-member dependencies to the repo root** (verified this session: `packages/api/node_modules/@imapps/api-utils`/`mongodb` are per-package symlinks into the central `.bun` store; the root `node_modules/` has neither). This script needs `@imapps/api-utils`, `mongodb`, and `fuse.js` resolvable from repo root, so they must be added as explicit root `package.json` dependencies (Task 2's job) — not assumed already available.
- **Must always be run via `bun run link-etsy-listings` (optionally `-- --dry-run`), never a bare `bun scripts/link-etsy-listings/index.ts`.** The root script wraps the invocation with `dotenv-cli -e .env --`, which is what populates `CONNECTION_URI`/`DATABASE_NAME`/`ETSY_API_KEY`/`ETSY_SHARED_SECRET` into `process.env` before Bun starts the script — the script itself does not self-load `.env` (unlike `packages/api/src/index.ts`, which needs to because it also has a non-wrapped `bun --watch` entry point; this script has no such second entry point, so keep it simple and don't add a redundant `dotenv` dependency).
- **PRODUCTION-DATA SAFETY (read before Task 2):** the repo's `.env` file may point at a real production MongoDB and hold real Etsy API credentials — this script's entire purpose (per spec) is to eventually run once against prod. **No implementer or reviewer working this plan should ever execute this script for real (with or without `--dry-run`) against the environment configured in the repo's actual `.env` file.** Task 2 verifies the code via careful reading and the Task 1 mapper tests (which already cover 100% of the matching/validation/override logic) — do not attempt to "just try it" against whatever database happens to be configured. If you want to smoke-test the CLI interaction shape, do so with a throwaway standalone Bun script that stubs `designRepo`/`etsyClient` in-memory — never the real `index.ts` against the real `.env`. The actual production run is for the human operator to execute personally, after this plan's code is reviewed and merged.

---

## File Structure

```
package.json                                       # + @imapps/api-utils, mongodb, fuse.js deps; + link-etsy-listings script
scripts/link-etsy-listings/mappers.ts               # new: pure matching/validation/formatting functions
scripts/link-etsy-listings/mappers.test.ts          # new
scripts/link-etsy-listings/index.ts                 # new: CLI orchestration (Mongo connect, Etsy fetch, prompt loop, writes)
```

---

### Task 1: Pure mapper functions — matching, overrides, validation, table formatting

**Files:**
- Create: `package.json` (root) — modify, add `fuse.js` dependency only (the other two root deps are Task 2's job, since only this task needs `fuse.js`)
- Create: `scripts/link-etsy-listings/mappers.ts`
- Create: `scripts/link-etsy-listings/mappers.test.ts`

**Interfaces:**
- Consumes: `Design`, `DesignEtsy` (existing, `@jewellery-catalogue/types`, via relative import `../../packages/types/src`), `EtsyListingSummary` (existing, from `packages/api/src/domain/EtsyClient`, via relative import `../../packages/api/src/domain/EtsyClient`).
- Produces:
  - `interface LinkSuggestion { design: Design; listingId: number | null; listingTitle: string | null; score: number | null }`
  - `buildSuggestions(designs: Design[], listings: EtsyListingSummary[]): LinkSuggestion[]`
  - `applyOverrides(suggestions: LinkSuggestion[], overrides: Record<string, number | null>, listings: EtsyListingSummary[]): LinkSuggestion[]`
  - `validateSuggestions(suggestions: LinkSuggestion[]): string[]`
  - `formatSuggestionsTable(suggestions: LinkSuggestion[]): string`
  - all consumed by `index.ts` (Task 2).

- [ ] **Step 1: Add the `fuse.js` dependency to root `package.json`**

In `package.json` (repo root), add a `dependencies` block (there currently isn't one — only `devDependencies` exists) directly after the `"scripts"` block and before `"workspaces"`:

```json
  "dependencies": {
    "fuse.js": "^7.1.0"
  },
```

Then run from repo root:

```bash
bun install
```

Expected: lockfile updates, `node_modules/fuse.js` now exists at repo root (`ls node_modules/fuse.js` succeeds).

- [ ] **Step 2: Write the failing tests**

```typescript
// scripts/link-etsy-listings/mappers.test.ts
import { describe, expect, it } from 'bun:test';
import type { Design } from '../../packages/types/src';
import type { EtsyListingSummary } from '../../packages/api/src/domain/EtsyClient';

import { applyOverrides, buildSuggestions, formatSuggestionsTable, validateSuggestions } from './mappers';

function makeDesign(overrides: Partial<Design> = {}): Design {
    return {
        id: 'design-1',
        userId: 'user-1',
        name: 'Silver Ring',
        description: '',
        timeRequired: '01:00',
        materials: [],
        imageIds: [],
        diagramImageIds: [],
        makingNotes: '',
        price: 25,
        totalMaterialCosts: 10,
        dateAdded: new Date(),
        totalQuantity: 1,
        ...overrides,
    };
}

function makeListing(overrides: Partial<EtsyListingSummary> = {}): EtsyListingSummary {
    return { listingId: 1, title: 'Listing', price: 10, url: 'https://etsy.com/listing/1', ...overrides };
}

describe('buildSuggestions', () => {
    it('matches each unlinked design to its best-titled listing', () => {
        const designs = [
            makeDesign({ id: 'd1', name: 'Silver Moonstone Ring' }),
            makeDesign({ id: 'd2', name: 'Gold Hoop Earrings' }),
        ];
        const listings = [
            makeListing({ listingId: 100, title: 'Silver Moonstone Ring - Handmade' }),
            makeListing({ listingId: 200, title: 'Gold Hoop Earrings, Sterling' }),
        ];

        const result = buildSuggestions(designs, listings);

        expect(result).toEqual([
            { design: designs[0], listingId: 100, listingTitle: 'Silver Moonstone Ring - Handmade', score: expect.any(Number) },
            { design: designs[1], listingId: 200, listingTitle: 'Gold Hoop Earrings, Sterling', score: expect.any(Number) },
        ]);
    });

    it('skips designs that are already linked', () => {
        const designs = [
            makeDesign({ id: 'd1', name: 'Silver Ring', etsy: { listingId: 100, state: 'active', lastPushedAt: null } }),
        ];
        const listings = [makeListing({ listingId: 100, title: 'Silver Ring' })];

        expect(buildSuggestions(designs, listings)).toEqual([]);
    });

    it('excludes listings already linked to a different design from the candidate pool', () => {
        const designs = [
            makeDesign({ id: 'd1', name: 'Already Linked', etsy: { listingId: 100, state: 'active', lastPushedAt: null } }),
            makeDesign({ id: 'd2', name: 'Silver Ring' }),
        ];
        const listings = [makeListing({ listingId: 100, title: 'Silver Ring' })];

        const result = buildSuggestions(designs, listings);

        expect(result).toEqual([{ design: designs[1], listingId: null, listingTitle: null, score: null }]);
    });

    it('does not suggest the same listing twice when two unlinked designs have similar names', () => {
        const designs = [makeDesign({ id: 'd1', name: 'Silver Ring' }), makeDesign({ id: 'd2', name: 'Silver Ring Large' })];
        const listings = [makeListing({ listingId: 100, title: 'Silver Ring' })];

        const result = buildSuggestions(designs, listings);

        expect(result[0].listingId).toBe(100);
        expect(result[1].listingId).toBeNull();
    });

    it('returns an empty array when there are no designs', () => {
        expect(buildSuggestions([], [makeListing()])).toEqual([]);
    });
});

describe('applyOverrides', () => {
    const design = makeDesign({ id: 'd1', name: 'Silver Ring' });
    const baseSuggestion = { design, listingId: 100, listingTitle: 'Original Match', score: 0.1 };
    const listings = [
        makeListing({ listingId: 100, title: 'Original Match' }),
        makeListing({ listingId: 200, title: 'Better Match' }),
    ];

    it('overrides a suggestion to skip (null)', () => {
        const result = applyOverrides([baseSuggestion], { d1: null }, listings);
        expect(result).toEqual([{ design, listingId: null, listingTitle: null, score: null }]);
    });

    it('overrides a suggestion to a different listingId, resolving its title from the listings list', () => {
        const result = applyOverrides([baseSuggestion], { d1: 200 }, listings);
        expect(result).toEqual([{ design, listingId: 200, listingTitle: 'Better Match', score: null }]);
    });

    it('leaves suggestions without a matching override unchanged', () => {
        const result = applyOverrides([baseSuggestion], {}, listings);
        expect(result).toEqual([baseSuggestion]);
    });
});

describe('validateSuggestions', () => {
    it('returns no errors when every listingId is unique', () => {
        const suggestions = [
            { design: makeDesign({ id: 'd1', name: 'A' }), listingId: 100, listingTitle: 'A', score: 0.1 },
            { design: makeDesign({ id: 'd2', name: 'B' }), listingId: 200, listingTitle: 'B', score: 0.1 },
        ];
        expect(validateSuggestions(suggestions)).toEqual([]);
    });

    it('flags two designs assigned to the same listingId', () => {
        const suggestions = [
            { design: makeDesign({ id: 'd1', name: 'A' }), listingId: 100, listingTitle: 'A', score: 0.1 },
            { design: makeDesign({ id: 'd2', name: 'B' }), listingId: 100, listingTitle: 'A', score: 0.1 },
        ];
        expect(validateSuggestions(suggestions)).toEqual([
            'Listing 100 is assigned to both "A" and "B" — each listing can only link to one design.',
        ]);
    });

    it('ignores skipped (null) suggestions when checking for duplicates', () => {
        const suggestions = [
            { design: makeDesign({ id: 'd1', name: 'A' }), listingId: null, listingTitle: null, score: null },
            { design: makeDesign({ id: 'd2', name: 'B' }), listingId: null, listingTitle: null, score: null },
        ];
        expect(validateSuggestions(suggestions)).toEqual([]);
    });
});

describe('formatSuggestionsTable', () => {
    it('renders a row per suggestion including the design name and target listing', () => {
        const suggestions = [
            {
                design: makeDesign({ id: 'd1', name: 'Silver Ring' }),
                listingId: 100,
                listingTitle: 'Silver Ring - Handmade',
                score: 0.05,
            },
        ];
        const table = formatSuggestionsTable(suggestions);
        expect(table).toContain('Silver Ring');
        expect(table).toContain('#100');
        expect(table).toContain('Silver Ring - Handmade');
    });

    it('renders SKIP for suggestions with no listingId', () => {
        const suggestions = [{ design: makeDesign({ id: 'd1', name: 'Silver Ring' }), listingId: null, listingTitle: null, score: null }];
        expect(formatSuggestionsTable(suggestions)).toContain('SKIP');
    });

    it('returns a placeholder message when there are no suggestions', () => {
        expect(formatSuggestionsTable([])).toBe('(no unlinked designs to suggest matches for)');
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test scripts/link-etsy-listings/mappers.test.ts` (from repo root)
Expected: FAIL — module `./mappers` not found

- [ ] **Step 4: Implement**

```typescript
// scripts/link-etsy-listings/mappers.ts
import Fuse from 'fuse.js';

import type { Design } from '../../packages/types/src';
import type { EtsyListingSummary } from '../../packages/api/src/domain/EtsyClient';

export interface LinkSuggestion {
    design: Design;
    listingId: number | null;
    listingTitle: string | null;
    score: number | null;
}

export const buildSuggestions = (designs: Design[], listings: EtsyListingSummary[]): LinkSuggestion[] => {
    const claimedListingIds = new Set(
        designs
            .filter((d): d is Design & { etsy: NonNullable<Design['etsy']> } => !!d.etsy?.listingId)
            .map((d) => d.etsy.listingId)
    );

    const suggestions: LinkSuggestion[] = [];

    for (const design of designs) {
        if (design.etsy?.listingId) continue;

        const availableListings = listings.filter((l) => !claimedListingIds.has(l.listingId));
        const fuse = new Fuse(availableListings, { keys: ['title'], threshold: 0.4, includeScore: true });
        const [bestMatch] = fuse.search(design.name);

        if (bestMatch) {
            claimedListingIds.add(bestMatch.item.listingId);
            suggestions.push({
                design,
                listingId: bestMatch.item.listingId,
                listingTitle: bestMatch.item.title,
                score: bestMatch.score ?? null,
            });
        } else {
            suggestions.push({ design, listingId: null, listingTitle: null, score: null });
        }
    }

    return suggestions;
};

export const applyOverrides = (
    suggestions: LinkSuggestion[],
    overrides: Record<string, number | null>,
    listings: EtsyListingSummary[]
): LinkSuggestion[] =>
    suggestions.map((s) => {
        if (!(s.design.id in overrides)) return s;

        const overrideListingId = overrides[s.design.id];
        if (overrideListingId === null) {
            return { ...s, listingId: null, listingTitle: null, score: null };
        }

        const listing = listings.find((l) => l.listingId === overrideListingId);
        return { ...s, listingId: overrideListingId, listingTitle: listing?.title ?? null, score: null };
    });

export const validateSuggestions = (suggestions: LinkSuggestion[]): string[] => {
    const errors: string[] = [];
    const seen = new Map<number, string>();

    for (const s of suggestions) {
        if (s.listingId === null) continue;

        const existingDesignName = seen.get(s.listingId);
        if (existingDesignName) {
            errors.push(
                `Listing ${s.listingId} is assigned to both "${existingDesignName}" and "${s.design.name}" — each listing can only link to one design.`
            );
        } else {
            seen.set(s.listingId, s.design.name);
        }
    }

    return errors;
};

export const formatSuggestionsTable = (suggestions: LinkSuggestion[]): string => {
    if (suggestions.length === 0) return '(no unlinked designs to suggest matches for)';

    const rows = suggestions.map((s, i) => {
        const target = s.listingId === null ? 'SKIP (no confident match)' : `#${s.listingId} — ${s.listingTitle}`;
        const scoreText = s.score === null ? '' : ` (score ${s.score.toFixed(2)})`;
        return `  [${i}] "${s.design.name}" (${s.design.id}) -> ${target}${scoreText}`;
    });

    return rows.join('\n');
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test scripts/link-etsy-listings/mappers.test.ts` (from repo root)
Expected: PASS (12 tests)

- [ ] **Step 6: Lint**

Run: `bunx biome check --fix --unsafe scripts/link-etsy-listings/mappers.ts scripts/link-etsy-listings/mappers.test.ts package.json`
Expected: clean, no remaining issues

- [ ] **Step 7: Commit**

```bash
git add package.json scripts/link-etsy-listings/mappers.ts scripts/link-etsy-listings/mappers.test.ts
git commit -m "feat(scripts): add pure matching/validation mappers for Etsy listing linking"
```

---

### Task 2: CLI orchestration script — connect, fetch, prompt, write

**Files:**
- Modify: `package.json` (root) — add `@imapps/api-utils` and `mongodb` dependencies, add the `link-etsy-listings` script entry
- Create: `scripts/link-etsy-listings/index.ts`

**Interfaces:**
- Consumes: `buildSuggestions`/`applyOverrides`/`validateSuggestions`/`formatSuggestionsTable`/`LinkSuggestion` (Task 1), `EtsyClient.getShopListingsActive` (existing, sub-project 4), `MongoDesignRepository` (existing, `packages/api/src/infrastructure/MongoDesignRepository`), `config` (existing, `packages/api/src/config`), `CollectionNames`/`Collections` (existing, `packages/api/src/dependencies/types`), `MongoDbConnection` (existing, `@imapps/api-utils`).
- Produces: the runnable script, invoked via `bun run link-etsy-listings [-- --dry-run]` — nothing else depends on this file (it's the final artifact of this plan).

- [ ] **Step 1: Add remaining root dependencies and the script entry**

In `package.json` (repo root), update the `dependencies` block added in Task 1 to include the other two packages this script needs:

```json
  "dependencies": {
    "@imapps/api-utils": "0.6.0",
    "fuse.js": "^7.1.0",
    "mongodb": "^6.13.1"
  },
```

Add a new entry to the `"scripts"` block, alongside the existing `start:api`/`start:web` entries:

```json
    "link-etsy-listings": "dotenv -e .env -- bun scripts/link-etsy-listings/index.ts",
```

Then run from repo root:

```bash
bun install
```

Expected: lockfile updates; `node_modules/@imapps/api-utils` and `node_modules/mongodb` now exist at repo root.

- [ ] **Step 2: Write the orchestration script**

```typescript
// scripts/link-etsy-listings/index.ts
import { createInterface } from 'node:readline/promises';

import { MongoDbConnection } from '@imapps/api-utils';

import { config } from '../../packages/api/src/config';
import { CollectionNames, type Collections } from '../../packages/api/src/dependencies/types';
import { EtsyClient, type EtsyListingSummary } from '../../packages/api/src/domain/EtsyClient';
import { MongoDesignRepository } from '../../packages/api/src/infrastructure/MongoDesignRepository';
import type { Design } from '../../packages/types/src';
import { applyOverrides, buildSuggestions, formatSuggestionsTable, validateSuggestions, type LinkSuggestion } from './mappers';

const isDryRun = process.argv.includes('--dry-run');

async function promptOverrides(
    suggestions: LinkSuggestion[],
    listings: EtsyListingSummary[],
    rl: ReturnType<typeof createInterface>
): Promise<Record<string, number | null>> {
    const overrides: Record<string, number | null> = {};

    for (;;) {
        console.log(`\nProposed links:\n${formatSuggestionsTable(applyOverrides(suggestions, overrides, listings))}`);
        const answer = await rl.question(
            '\nEnter a row number to edit, or press Enter to continue: '
        );
        if (answer.trim() === '') break;

        const rowIndex = Number(answer.trim());
        if (Number.isNaN(rowIndex) || !suggestions[rowIndex]) {
            console.log(`No such row: ${answer}`);
            continue;
        }

        const value = await rl.question(
            `  New listingId for "${suggestions[rowIndex].design.name}" (or "skip"): `
        );
        const trimmed = value.trim();
        if (trimmed.toLowerCase() === 'skip') {
            overrides[suggestions[rowIndex].design.id] = null;
            continue;
        }

        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed)) {
            console.log(`"${trimmed}" is not a valid listingId — enter a number or "skip".`);
            continue;
        }
        overrides[suggestions[rowIndex].design.id] = parsed;
    }

    return overrides;
}

async function main() {
    const database = new MongoDbConnection<Collections>();
    await database.connect({ connectionUri: config.get('connectionUri'), databaseName: config.get('databaseName') });

    await database
        .getCollection(CollectionNames.Designs)
        .createIndex({ 'etsy.listingId': 1 }, { unique: true, sparse: true });

    const designRepo = new MongoDesignRepository(database);
    const etsyClient = new EtsyClient(config.get('etsyApiKey'), config.get('etsySharedSecret'));

    const connection = await database
        .getCollection(CollectionNames.EtsyConnections)
        .findOne({}, { projection: { _id: 0 } });

    if (!connection) {
        console.error('No Etsy connection found — connect Etsy from the app Settings page first.');
        process.exit(1);
    }

    const [listings, designs] = await Promise.all([
        etsyClient.getShopListingsActive(connection.shopId),
        designRepo.getByUserId(connection.userId),
    ]);

    const unlinkedCount = designs.filter((d) => !d.etsy?.listingId).length;
    console.log(`Found ${listings.length} active Etsy listings and ${designs.length} designs (${unlinkedCount} unlinked).`);

    const initialSuggestions = buildSuggestions(designs, listings);

    if (initialSuggestions.length === 0) {
        console.log('No unlinked designs — nothing to do.');
        process.exit(0);
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const overrides = await promptOverrides(initialSuggestions, listings, rl);
    const finalSuggestions = applyOverrides(initialSuggestions, overrides, listings);

    const errors = validateSuggestions(finalSuggestions);
    if (errors.length > 0) {
        console.error('\nCannot proceed — validation errors:');
        for (const e of errors) console.error(`  - ${e}`);
        rl.close();
        process.exit(1);
    }

    const toLink = finalSuggestions.filter((s) => s.listingId !== null);
    console.log(`\nFinal plan:\n${formatSuggestionsTable(finalSuggestions)}`);

    if (isDryRun) {
        console.log(`\n[dry-run] Would link ${toLink.length} design(s). No changes written.`);
        rl.close();
        process.exit(0);
    }

    const confirmation = await rl.question(`\nWrite ${toLink.length} link(s) to the database? (y/N): `);
    rl.close();

    if (confirmation.trim().toLowerCase() !== 'y') {
        console.log('Aborted — no changes written.');
        process.exit(0);
    }

    for (const s of toLink) {
        const listingId = s.listingId as number;
        const updated: Design = { ...s.design, etsy: { listingId, state: 'active', lastPushedAt: null } };

        try {
            await designRepo.update(s.design.id, updated);
            console.log(`Linked "${s.design.name}" -> listing ${listingId}`);
        } catch (error) {
            console.error(`Failed to link "${s.design.name}" -> listing ${listingId}:`, error);
            console.error('Stopping — designs linked before this point were saved; rerun the script to resume.');
            process.exit(1);
        }
    }

    console.log(`\nDone — linked ${toLink.length} design(s).`);
    process.exit(0);
}

main().catch((error) => {
    console.error('link-etsy-listings failed:', error);
    process.exit(1);
});
```

- [ ] **Step 3: Verify by reading, not by running against real data**

Per this plan's Global Constraints, do NOT execute `bun run link-etsy-listings` (with or without `--dry-run`) against the repo's actual configured `.env` — it may point at production. Instead:

1. Re-read the script against Task 1's `mappers.ts` interfaces — confirm every call site's argument types match exactly (`buildSuggestions(designs, listings)`, `applyOverrides(suggestions, overrides, listings)` with `listings` always passed so title lookups resolve, `validateSuggestions(finalSuggestions)`).
2. Confirm the control flow matches the required safety properties: the DB-level unique index is created before any read/write; `validateSuggestions` runs and can abort (`process.exit(1)`) before any write is attempted; `--dry-run` exits before the `y/N` prompt is ever shown; a normal (non-dry-run) run always requires a literal `y` answer before the write loop starts; a write failure partway through the loop stops immediately rather than silently continuing.
3. Confirm `Design`, `EtsyListingSummary`, `Collections`/`CollectionNames`, `MongoDesignRepository`, `config`, and `MongoDbConnection` are all imported from paths that exist in this repo (cross-check each import path against the actual file locations under `packages/api/src/` and `packages/types/src/`), and that no import is left unused (biome's lint step, run in Step 4, will catch this — but check it yourself first since there is no tsc coverage for this file).

- [ ] **Step 4: Lint**

Run: `bunx biome check --fix --unsafe scripts/link-etsy-listings/index.ts package.json`
Expected: clean, no remaining issues

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/link-etsy-listings/index.ts
git commit -m "feat(scripts): add interactive Etsy listing linking CLI"
```
