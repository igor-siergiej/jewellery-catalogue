# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every screen, dialog and form of the web app to the Mari's Crystal Jewellery brand, rebuild Home as a stock ledger, and merge duplicated form/table/dialog components without changing behaviour.

**Architecture:** Tokens first (one `index.css` rewrite), then shared primitives (status tags, ledger table, responsive dialog shell, state views, duration input), then screens rebuilt on those primitives one by one. Pure logic (stock rows, Etsy status, filters, duration, validation copy) lives in tested utils; components stay thin. Behaviour is pinned by the existing Playwright suite; each task updates only the selectors/copy its UI change breaks.

**Tech Stack:** React 19, Vite+ (`vp`), Tailwind 4, shadcn/Radix, vaul, react-hook-form + Zod, TanStack Query, Playwright, vite-plus/test (vitest API).

**Spec:** `docs/superpowers/specs/2026-11-11-ui-redesign-design.md` (read it; this plan does not repeat its tables).

## Global Constraints

- Work in worktree `../jewellery-catalogue-ui-redesign`, branch `ui-redesign`. Lint with `bun lint` (`vp check`). Biome is gone.
- Tokens exactly: background `#F7F8FD`, card/popover `#FFFFFF`, sidebar `#CDD7FF`, foreground `#0E1947`, muted-foreground `#4A5175`, primary `#5B3E96` (foreground `#FFFFFF`), accent tint `#ECE6F7`, border/input `#DCE1F2`, destructive `#9B1C2C`. Amber `--warning` and green `--success` chosen at build, each ≥4.5:1 on `#FFFFFF` (check with the antislop contrast tool).
- Fonts: IBM Plex Sans (400/500/600, `tabular-nums` on body) for everything; Cormorant Garamond 600 only for page titles and the View Design name, never below 24px; Cinzel + Pinyon Script only in the sidebar brand mark.
- Light theme only: delete the `.dark` block and the `dark` custom variant.
- Radius 4px controls, 6px cards; no shadow on cards; one elevation shadow for popovers/dialogs/drawer.
- No em dash (`—`) in any UI string. No uppercase tracked labels. Sentence-case titles. No "!" in UI copy.
- No API, schema or business-logic changes. Routes keep their paths (`/home`, `/designs`, `/designs/:id`, `/addDesign`, `/materials`, `/addMaterial`, `/listings`, `/shopping-list`, `/board`, `/settings`).
- Every enabled control: `cursor: pointer`; disabled: `cursor: not-allowed`; visible focus ring in primary. Icon-only buttons have `aria-label`; tap targets ≥44px on mobile.
- Amethyst fill appears only on: primary buttons, active nav item, Etsy "Listed" tag, Stock side-column counts, selected option in pickers.
- Pre-existing failures to leave alone: web unit tests `flattenTaxonomyNodes`, `getSuggestedPrice` (import `bun:test`), `ErrorBoundary` custom fallback. Don't count them as regressions.
- E2E run command (Mongo on :27018 via `docker compose -f docker-compose.test.yml up -d`; Docker Desktop socket `DOCKER_HOST=unix:///home/igors/.docker/desktop/docker.sock`):
  `cd packages/web && CI=true E2E_MONGO_URI=mongodb://localhost:27018 bunx playwright test`
- Unit tests: `cd packages/web && bunx vp test run <path>`; import from `vite-plus/test`.
- Each task commits with a conventional message ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Design with variants, some without thresholds, or no materials** (`canMake: null`): Stock shows "–" for can make, never 0, and sorts it as not-a-problem unless stock is low. Test in Task 4.
2. **Long names at 360px width** (design, material, listing titles): truncate on one line, no horizontal page scroll. Covered by `expectNoHorizontalScroll` in each visual spec plus a long-name row in Task 4's e2e.
3. **Etsy not connected:** Stock hides "Unlinked Etsy listings" and Sales without errors; Designs Etsy filter still works (everything is "Not on Etsy"). Test in Task 4 and Task 5.
4. **Duration edge input:** blank, `0h 0m`, minutes ≥60 (normalise `0h 90m` → `01:30`), and legacy stored values like `"1:5"` or `"00:30"` round-trip. Test in Task 6.
5. **Draft autosave through the merged design form:** a draft saved from the new form restores every field, including variations and duration. Existing `drafts.spec.ts` must pass unchanged in behaviour; Task 7 adds a duration assertion to it.

---

### Task 0: Baseline on current main

- [ ] **Step 1:** Start Mongo, run the full e2e suite (command above).
  Expected: 222 passed, 3 skipped, 0 failed (as on the older main). If anything fails, stop and report before changing code.

### Task 1: Tokens, fonts, base CSS, DESIGN.md

**Files:**
- Modify: `packages/web/src/index.css` (rewrite `:root` tokens; delete `.dark` and `@custom-variant dark`; base layer cursor/focus; remove `.grid-cols-14` only if unused)
- Modify: `packages/web/index.html` (remove Faculty Glyphic/Rubik link; load the four fonts with `display=swap`; `theme-color` and body bg `#F7F8FD`)
- Modify: `packages/web/tests/e2e/utils/visual-helpers.ts` (`settle` checks `16px "IBM Plex Sans"` instead of Delius)
- Create: `DESIGN.md` (root): palette table, type roles, dials `ENERGY 1 / RHYTHM 2 / MOTION 1`, accent rule, one-line reasons; copied from spec
- Modify: `AGENTS.md` (one line under Stack: "UI work: read DESIGN.md first"; replace Biome mentions only if the other agent hasn't)
- Create: `packages/web/tests/e2e/design-tokens.spec.ts`

**Interfaces:** Produces CSS vars `--warning`, `--warning-foreground`, `--success` mapped to Tailwind `bg-warning`, `text-warning`, `text-success`; utility class `font-display` (Cormorant) and `font-brand-caps`/`font-brand-script`.

- [ ] **Step 1: Write failing e2e** `design-tokens.spec.ts`: on `/home` (authenticatedPage), `getComputedStyle(document.body)` has `fontFamily` containing `IBM Plex Sans`, `backgroundColor` `rgb(247, 248, 253)`, `fontVariantNumeric` contains `tabular-nums`; a `button:not(:disabled)` has `cursor: pointer`; `document.documentElement.classList.contains('dark')` is false and no stylesheet rule selector contains `.dark`.
- [ ] **Step 2:** Run it: FAIL on font/background.
- [ ] **Step 3:** Implement the token/font changes above.
- [ ] **Step 4:** Run the new spec: PASS. Run full functional project (`--project=chromium`): all pass. Visual projects are expected to fail from here until Task 13; don't update baselines yet.
- [ ] **Step 5:** `bun lint`, commit `feat(web): brand tokens, fonts and base styles`.

### Task 2: Shared primitives

**Files:**
- Create: `packages/web/src/lib/etsyStatus.ts` + `etsyStatus.test.ts`
- Create: `packages/web/src/components/StatusTag/index.tsx`
- Create: `packages/web/src/components/ResponsiveDialog/index.tsx`
- Create: `packages/web/src/components/StateView/index.tsx`
- Modify: `packages/web/src/components/ui/table.tsx` (ledger defaults: `tabular-nums`, numeric cells via `data-numeric` right-aligned, names `truncate`)
- Modify: `packages/web/src/components/ui/badge.tsx`, `button.tsx`, `tabs.tsx`, `card.tsx`, `input.tsx`, `select.tsx`, `dialog.tsx`, `drawer.tsx`, `alert-dialog.tsx` (tokens: radius, no card shadow, disabled styles that don't look clickable)

**Interfaces (Produces):**
```ts
export type EtsyStatus = 'none' | 'draft' | 'listed' | 'inactive';
export function getEtsyStatus(design: Pick<Design, 'etsy'>): EtsyStatus;
export const ETSY_STATUS_LABEL: Record<EtsyStatus, string>; // none:'Not on Etsy', draft:'Etsy draft', listed:'Listed', inactive:'Inactive'
export function isNotOnEtsyYet(design: Pick<Design, 'etsy' | 'catalogueOnly'>): boolean; // no etsy && !catalogueOnly

// StatusTag
type Tone = 'neutral' | 'accent' | 'warning' | 'danger';
export function StatusTag(props: { tone?: Tone; children: ReactNode }): JSX.Element;
export function EtsyStatusTag(props: { status: EtsyStatus }): JSX.Element; // 'listed' → accent

// ResponsiveDialog: Dialog on ≥768px, vaul Drawer below (useIsMobile from hooks/use-mobile)
export function ResponsiveDialog(props: {
  open: boolean; onOpenChange(open: boolean): void;
  title: string; description?: string;
  children: ReactNode;           // scrolling body
  footer?: ReactNode;            // sticky; secondary left, primary right
}): JSX.Element;

// StateView
export function StateView(props:
  | { kind: 'loading'; what: string }                       // "Loading designs"
  | { kind: 'error'; what: string; onRetry?: () => void }   // "Couldn't load designs"
  | { kind: 'empty'; title: string; body: string; action?: ReactNode }): JSX.Element;
```

- [ ] **Step 1: Failing unit tests** `etsyStatus.test.ts`: `getEtsyStatus({})` → `'none'`; `{etsy:{state:'draft',...}}` → `'draft'`; `'active'` → `'listed'`; `'inactive'` → `'inactive'`; `isNotOnEtsyYet({catalogueOnly:true})` → false; `isNotOnEtsyYet({})` → true; `isNotOnEtsyYet({etsy:{state:'draft',...}})` → false.
- [ ] **Step 2:** Run: FAIL (module missing).
- [ ] **Step 3:** Implement util and components; restyle ui primitives.
- [ ] **Step 4:** Unit tests PASS; `bunx playwright test --project=chromium` all pass (primitives restyle only).
- [ ] **Step 5:** Commit `feat(web): shared status tag, dialog shell, state view and ledger table`.

### Task 3: Shell (sidebar, header)

**Files:**
- Modify: `packages/web/src/components/AppSidebar/index.tsx`, `AppSidebar/Header/index.tsx`, `components/UserInfo/index.tsx`, `components/MainLayout/index.tsx`, `constants/routes.ts`
- Modify: `packages/web/src/pages/Settings/index.tsx` (show version via existing `AppVersionCard` if not already)
- Test: `tests/e2e/app-shell.spec.ts`, `sidebar-mobile.spec.ts`

Changes: nav = Stock (`/home`), Designs, Materials, Etsy (`/listings`), Board; drop Add Design/Add Material from nav. Brand mark = existing logo image + "MARI'S" (Cinzel) + "Crystal Jewellery" (Pinyon Script) inside a `<Link to="/home" aria-label="Stock">`. No version text in the sidebar. Footer: user name, Settings link, logout button (`aria-label="Log out"`). Header: remove Settings cog and "Back to Designs"; keep sidebar trigger, search on list pages, draft status (copy "Draft save failed, will retry").

- [ ] **Step 1: Update/extend e2e** in `app-shell.spec.ts`: sidebar has links named exactly `Stock`, `Designs`, `Materials`, `Etsy`, `Board`, `Settings` and no `Add Design`; brand link navigates to `/home`; header has no button named `Settings` and no `Back to Designs`; the active nav item has `aria-current="page"`.
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Implement. Fix any other spec that navigated via removed nav items (grep `getByRole('button', { name: 'Add Design' })` etc. in `tests/e2e`; use the page buttons added in Tasks 4/5/9 or `page.goto`).
- [ ] **Step 4:** Chromium project all pass.
- [ ] **Step 5:** Commit `feat(web): brand sidebar and simplified header`.

### Task 4: Stock page (Home)

**Files:**
- Create: `packages/web/src/lib/stockLedger.ts` + `stockLedger.test.ts`
- Create: `packages/web/src/components/StockLedger/index.tsx` (desktop table + mobile stacked list)
- Create: `packages/web/src/components/StockSidePanel/index.tsx`
- Modify: `packages/web/src/pages/Home/index.tsx`, `components/SalesDashboard/index.tsx` (restyle; period picker as segmented control)
- Delete when unused: `components/LowStockDesignsTable`, `components/LowStockMaterialsTable` (move their edit dialogs' behaviour onto row links → View Design / Materials edit)
- Test: `tests/e2e/home.spec.ts`

**Interfaces (Produces):**
```ts
export type StockSeverity = 'out' | 'low' | 'ok';
export interface StockRow {
  design: Design;
  inStock: number;                 // design.totalQuantity, or sum of variants' totalQuantity
  canMake: number | null;          // ProducibleSummary.canMake; null when no summary or null
  severity: StockSeverity;         // 'out' if inStock===0 && (threshold set || has variants with threshold); else 'low' if lowStock util says so; else 'ok'
  problemVariants: { name: string; inStock: number }[]; // variants at/below threshold
  etsy: EtsyStatus;
}
export function buildStockRows(designs: Design[], producible: Map<string, ProducibleSummary>): StockRow[];
// sort: severity out < low < ok, then name (localeCompare, case-insensitive)
```
Consumes `getEtsyStatus` (Task 2), threshold logic from `utils/lowStock.ts` (export `isLowStockDesign` and a per-variant helper rather than duplicating).

- [ ] **Step 1: Failing unit tests** in `stockLedger.test.ts`:
  - simple design qty 0, threshold 2 → severity `'out'`, sorts first.
  - simple design qty 1, threshold 2 → `'low'`; qty 5 threshold 2 → `'ok'`.
  - design with variants `[Gold 0 (thr 1), Silver 4 (thr 1)]` → `inStock 4`, severity `'low'`, `problemVariants [{name:'Gold', inStock:0}]`.
  - variant without own threshold falls back to design threshold; variant and design both without threshold → not a problem.
  - no producible entry → `canMake null`.
  - sort: `[ok 'a', out 'b', low 'c']` → `['b','c','a']`.
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Implement util, then page per spec "Stock (Home)": title "Stock" (font-display), summary line from real counts ("2 designs out of stock" / "Everything is in stock"), ledger columns Design (thumb + name, problem-variant line "Gold · 0 left"), In stock, Can make ("–" when null), Etsy (`EtsyStatusTag`); rows link to `/designs/:id`. Side panel: "Not on Etsy yet" count (`isNotOnEtsyYet`) + `Review` link → `/designs?etsy=none`; "Unlinked Etsy listings" count from `useEtsyReconcile`/listings (render only when Etsy connected) + `Link` → `/listings`; "Running low" materials (first 5 names from `getLowStockMaterials`) + `Shopping list` → `/shopping-list`; primary `Add design` → `/addDesign`. Sales below. Empty (no designs): `StateView` empty "No designs yet" / "Add your first design to start tracking stock." with Add design button. Loading/error via `StateView`.
- [ ] **Step 4: E2E** update `home.spec.ts` (replace `[data-slot="card"]`/"Low Stock Dashboard" assertions): seeded out-of-stock design appears in the first ledger row with in-stock `0`; a design with a 120-char name doesn't cause horizontal scroll at 412px (`expectNoHorizontalScroll`); "Review" goes to `/designs?etsy=none`; with Etsy disconnected, no "Unlinked Etsy listings" heading and no Sales heading. Run unit + chromium: PASS.
- [ ] **Step 5:** Commit `feat(web): stock ledger home`.

### Task 5: Designs list

**Files:**
- Create: `packages/web/src/lib/designFilters.ts` + `designFilters.test.ts`
- Modify: `packages/web/src/pages/Designs/index.tsx`, `components/DesignCard/index.tsx`
- Test: `tests/e2e/designs-list.spec.ts`, `design-inventory.spec.ts`, `design-favourite.spec.ts`, `catalogue-only-design.spec.ts`, `design-etsy-image.spec.ts`, `production-plan.spec.ts`

**Interfaces (Produces):**
```ts
export interface DesignFilters { type: DesignType | 'all'; etsy: EtsyStatus | 'all' }
export function parseDesignFilters(params: URLSearchParams): DesignFilters; // unknown values → 'all'
export function toSearchParams(f: DesignFilters): URLSearchParams;          // omits 'all'
export function applyDesignFilters(designs: Design[], f: DesignFilters): Design[];
```

- [ ] **Step 1: Failing unit tests:** `parseDesignFilters(new URLSearchParams('etsy=none&type=RING'))` → `{type:'RING', etsy:'none'}`; `'etsy=bogus'` → `etsy:'all'`; `toSearchParams({type:'all',etsy:'all'}).toString()` → `''`; `applyDesignFilters` with `etsy:'none'` keeps only designs where `getEtsyStatus==='none'`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implement. Designs page reads/writes filters via `useSearchParams`; type tabs + Etsy status select both in URL; `Add design` primary button in page header; Shopping list link kept. Card: photo hero, name, plain-text "N in stock · Xh Ym" (garnet when 0), `EtsyStatusTag`; favourite icon button (`aria-label="Add to favourites"`/`"Remove from favourites"`, ≥44px); overflow menu button `aria-label="More actions for {name}"` with "Manage inventory" and "Delete" (delete opens existing confirm).
- [ ] **Step 4:** Update the listed specs: replace `[data-slot="item"]`/`item-title` locators with `getByRole('article', { name })` (give each card `<article aria-labelledby>`), replace `[title="Manage Inventory"]`/`[title="Delete Design"]` with menu → `getByRole('menuitem', { name: 'Manage inventory' | 'Delete' })`. Add to `designs-list.spec.ts`: visiting `/designs?etsy=none` shows only unlinked designs and the select shows "Not on Etsy"; reload keeps the filter. Unit + chromium PASS.
- [ ] **Step 5:** Commit `feat(web): designs list with URL filters and card menu`.

### Task 6: Duration input and validation copy

**Files:**
- Create: `packages/web/src/lib/duration.ts` + `duration.test.ts`
- Create: `packages/web/src/lib/formErrors.ts` + `formErrors.test.ts`
- Replace: `packages/web/src/components/TimeInput/index.tsx` → `components/DurationInput/index.tsx` (generic over form: `name` prop, label "Time to make")

**Interfaces (Produces):**
```ts
export function parseDuration(value: string | undefined): { hours: number; minutes: number }; // "00:30"→{0,30}; "1:5"→{1,5}; ""/undefined→{0,0}
export function formatDuration(hours: number, minutes: number): string; // normalises minutes≥60; zero-pads: (0,90)→"01:30"
export function describeDuration(value: string): string; // "00:30"→"30 min", "01:30"→"1 h 30 min", "02:00"→"2 h"
export function DurationInput<T extends FieldValues>(props: { form: UseFormReturn<T>; name: FieldPath<T>; label?: string }): JSX.Element; // two number inputs labelled "Hours" / "Minutes"
export const zodErrorMap: z.ZodErrorMap; // invalid enum on wireType→"Pick a wire type", metalType→"Pick a metal type", designType→"Pick a design type", generic invalid_value→"Pick one of the options"; others pass through
```

- [ ] **Step 1: Failing tests:** `parseDuration('00:30')` → `{hours:0,minutes:30}`; `parseDuration('1:5')` → `{1,5}`; `parseDuration('')` → `{0,0}`; `formatDuration(0,90)` → `'01:30'`; `formatDuration(0,0)` → `'00:00'`; round-trip `formatDuration(...Object.values(parseDuration('12:45')))` → `'12:45'`; `describeDuration('00:30')` → `'30 min'`, `'01:30'` → `'1 h 30 min'`, `'02:00'` → `'2 h'`; `zodErrorMap` on a `z.enum(['FULL','FILLED','PLATED'])` at path `['wireType']` with bad input → `'Pick a wire type'`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implement; register `zodErrorMap` wherever the material/design resolvers are created (pass as `{ errorMap }` to `zodResolver` or `z.config`). Use `describeDuration` on View Design and cards (replacing "0:30 min"/"0:30 hours").
- [ ] **Step 4:** Unit PASS; chromium PASS after updating specs that typed into the time field (search `timeRequired`/`type="time"`/`Time Spent` in `tests/e2e` and `utils/add-design-form.ts`; fill Hours/Minutes by label).
- [ ] **Step 5:** Commit `feat(web): duration input and plain validation messages`.

### Task 7: Merged design form

**Files:**
- Create: `packages/web/src/components/DesignForm/index.tsx` (+ `sections/*.tsx` if a file passes ~300 lines)
- Modify: `packages/web/src/pages/AddDesign/index.tsx` (page = header + `DesignForm` + submit/draft wiring only)
- Modify: `packages/web/src/pages/ViewDesign/index.tsx` edit dialog → `ResponsiveDialog` + `DesignForm`
- Delete: field markup in `components/DesignEditForm`, `components/DesignUpdateForm` once nothing imports them (keep any submit/mutation logic by moving it, not rewriting it)
- Test: `tests/e2e/add-design.spec.ts`, `drafts.spec.ts`, `design-edit-no-etsy-push.spec.ts`, `catalogue-only-design.spec.ts`, `view-design.spec.ts`

**Interfaces:**
```ts
export interface DesignFormProps {
  form: UseFormReturn<AddDesignFormData>;   // same form type both places
  mode: 'create' | 'edit';
  materials: Material[];
  disabled?: boolean;
}
export function DesignForm(props: DesignFormProps): JSX.Element; // fields only; caller owns <form onSubmit>, footer and drafts
```
Consumes `DurationInput`, `zodErrorMap` (Task 6), `ResponsiveDialog` (Task 2).

Layout per spec "Forms": sections Basics (name, type picker, duration, catalogue-only in edit), Materials, Price (breakdown in Plex tabular, "Use £x" button), Photos; "More" disclosure (`<details>`-equivalent Radix Collapsible, button "More options") holding Variations, Description, Maker docs ("Private, never shown on Etsy" once in the section description), Stock alert; auto-open when any of those has a value. Desktop: label column left (`md:grid-cols-[12rem_1fr]`); mobile stacked with sticky footer. Page title "New design"; dialog title "Edit design"; submit labels "Create design" / "Save changes".

- [ ] **Step 1: E2E first:** in `add-design.spec.ts` add: the "More options" section is collapsed on a new design and expanded when editing a design that has a description; in `drafts.spec.ts` add: set duration 1 h 15 min, leave, return, Hours=1 Minutes=15 restored.
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Implement the merge; keep `useDraftAutosave` wiring identical.
- [ ] **Step 4:** All listed specs + full chromium PASS.
- [ ] **Step 5:** Commit `refactor(web): one design form for add and edit`.

### Task 8: Merged material form and single materials table

**Files:**
- Create: `packages/web/src/components/MaterialForm/index.tsx` (type picker + per-type field groups)
- Create: `packages/web/src/lib/materialColumns.ts` + test
- Create: `packages/web/src/components/MaterialsLedger/index.tsx`
- Modify: `pages/AddMaterial/index.tsx`, `components/MaterialUpdateForm/index.tsx` (dialog shell → `ResponsiveDialog`, body → `MaterialForm`), `pages/Materials/index.tsx`, `components/MaterialsTable/index.tsx`, `MaterialCards.tsx`
- Delete: `MaterialFormResolver/Forms/*`, `MaterialUpdateForm/UpdateFields/*`, `MaterialsTable/{All,Bead,Chain,EarHook,Wire}Table.tsx` when unused
- Test: `materials.spec.ts`, `materials-crud.spec.ts`, `materials-designs.spec.ts`, `shopping-list.spec.ts`

**Interfaces:**
```ts
export type MaterialColumnKey = 'name'|'code'|'brand'|'type'|'stock'|'perPack'|'pricePerPack'|'unitPrice'|'diameter'|'colour'|'wireType'|'metalType'|'length';
export function columnsFor(tab: MaterialType | 'all'): MaterialColumnKey[];
// 'all' → name, type, brand, stock, pricePerPack, unitPrice ; BEAD adds code,diameter,colour ; WIRE adds wireType,metalType,diameter ; CHAIN adds metalType,length ; EAR_HOOK adds metalType
export function MaterialForm(props: { form: UseFormReturn<any>; mode: 'create'|'edit'; lockType?: boolean }): JSX.Element;
```

- [ ] **Step 1: Failing unit test:** `columnsFor('all')` equals the list above exactly; `columnsFor(MaterialType.BEAD)` includes `'colour'` and not `'wireType'`; `columnsFor(MaterialType.WIRE)` includes `'wireType'` and not `'colour'`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implement. Row actions in overflow menu (`More actions for {name}`): Buy (shopping-list behaviour as today), Edit, Delete. The price-change confirm in `MaterialUpdateForm` (today "Update Design Prices?") becomes "Update prices for N designs?" where N counts designs using this material. Page header: `Add material` primary, `Shopping list` link. Titles "Add material" / "Edit material", submit "Add material" / "Save changes". Wire/Metal pickers show human labels; errors go through `zodErrorMap`.
- [ ] **Step 4:** Update listed specs to the menu items and new copy; add to `materials.spec.ts`: submitting an empty wire form shows "Pick a wire type" and no text containing `expected one of`. Unit + chromium PASS.
- [ ] **Step 5:** Commit `refactor(web): one material form and one materials table`.

### Task 9: View Design and its dialogs

**Files:**
- Modify: `pages/ViewDesign/index.tsx`, `components/DesignUpdateForm` successor (inventory dialog), `components/PriceAdvice`, `components/EtsyPushDialog`, `components/ListingCopyRefresh`, `components/MakerDocsSection`
- Test: `view-design.spec.ts`, `design-stock-quantity.spec.ts`, `design-inventory.spec.ts`, `etsy-push.spec.ts`, `etsy-listing-copy.spec.ts`, `price-advice.spec.ts`, `listing-copy-refresh.spec.ts`, `EtsyPushDialog/index.test.tsx`

Changes per spec: single "All designs" back link; name in font-display; price; type as plain text; definition list (Time to make via `describeDuration`, Material cost, Added, Low-stock alert); materials table on ledger style with neutral tags; one Etsy block: status tag + one action (`Send to Etsy` when `none`/`draft` and not catalogue-only; `View on Etsy` link when listed; catalogue-only explains "Catalogue only, not sent to Etsy"). Inventory dialog: `ResponsiveDialog` titled "Stock for {name}", "In stock" / "Can make" numbers, set-stock field + button with clear disabled state, material availability as ledger with "Enough"/"Short by N" text. Send to Etsy: category shown by taxonomy name (look up from `useEtsyTaxonomy`), `photoCount === 1 ? '1 photo will be sent' : `${n} photos will be sent``, sticky footer. AI buttons: "Write title and description", "Suggest a price range", no sparkle icon.

- [ ] **Step 1:** Update `EtsyPushDialog/index.test.tsx` and e2e expectations to new copy first (e.g. `'Resuming an interrupted upload. The listing text was already sent to Etsy.'`, `'1 photo will be sent'`); add to `view-design.spec.ts`: a listed design shows no disabled "Send to Etsy" button and has a "View on Etsy" link.
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Unit + chromium PASS.
- [ ] **Step 5:** Commit `feat(web): view design page and dialogs`.

### Task 10: Etsy listings, Board, Settings, Shopping list

**Files:**
- Modify: `pages/Listings/index.tsx`, `components/LinkDesignDialog/index.tsx`, `components/UnmatchedEtsySales/index.tsx`
- Modify: `pages/Board/index.tsx`, `components/TaskBoard/*`, `components/GoalProgress/*` (create `TaskForm`, `GoalForm` shared by add/edit dialogs)
- Modify: `pages/Settings/index.tsx`, `components/DataExport/index.tsx`
- Modify: `pages/ShoppingList/index.tsx`
- Test: `listings.spec.ts`, `listings-reconcile.spec.ts`, `board-*.spec.ts`, `settings.spec.ts`, `shopping-list.spec.ts`, `data-export.spec.ts`

Changes per spec tables. Listings: page title "Etsy", columns thumbnail, title, price, Linked design (design name link or "Not linked" tag), actions: `Link` button + menu item "Create design", `View on Etsy` external link. Link dialog: search input + list with thumbnails. Board: labelled filter group ("Priority"), plurals via `n === 1 ? 'goal' : 'goals'`, goals strip above columns, task/goal forms with visible labels and human option names (subject, importance, recurring). Settings: one `Save` button; if hourly wage or margin changed, a confirm `AlertDialog` "Update prices for N designs?" with "Update prices" / "Save without updating" (N = designs count from cache); Radix `Select` for categories with human type labels; no em dashes in labels ("Etsy price suggestion: markup multiplier").

- [ ] **Step 1:** Add e2e: `board-tasks.spec.ts` add-task dialog fields are reachable by label (`getByLabel('Title')`, `'Subject'`, `'Importance'`, `'Repeats'`, `'Due date'`); `settings.spec.ts` changing hourly wage then Save shows the "Update prices for" confirm, "Save without updating" persists the value without recalculation (assert existing price unchanged); `listings.spec.ts` unlinked row shows "Not linked".
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Chromium PASS.
- [ ] **Step 5:** Commit `feat(web): etsy, board, settings and shopping list restyle`.

### Task 11: Auth pages, error page, update prompt, remaining dialogs, copy sweep

**Files:**
- Modify: `components/AuthLayout`, `AuthFormBase`, `LoginForm`, `RegisterForm`, `pages/Start`, `pages/Register`, `components/ErrorPage`, `components/UpdatePrompt`, delete/draft confirm dialogs in `pages/Designs`, `pages/Materials`, `components/DesignCard`
- Create: `packages/web/tests/e2e/copy-hygiene.spec.ts`
- Test: `auth.spec.ts`, `startpage.spec.ts`, `UpdatePrompt/index.test.tsx`

Login: brand mark above the form, "Log in" primary, "Create an account" secondary; remove "Welcome back Goldsmith!"/"goldsmith empire"/"Register!" (owner copy: replace with "Welcome back" and "New here?"). Every remaining dialog uses `ResponsiveDialog` or restyled `AlertDialog`.

- [ ] **Step 1: Failing e2e** `copy-hygiene.spec.ts`: for each of `/home`, `/designs`, `/materials`, `/listings`, `/board`, `/settings`, `/shopping-list`, `/addDesign`, `/addMaterial`, and `/` (logged out), `document.body.innerText` contains no `—`, no `!` followed by end-of-word in headings/buttons (`getByRole('heading')`/`'button'` texts don't match `/!$/`), and no element with computed `text-transform: uppercase`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implement; also run `grep -rn "—" packages/web/src --include='*.tsx'` and fix every UI string hit (comments may stay).
- [ ] **Step 4:** Chromium + unit PASS.
- [ ] **Step 5:** Commit `feat(web): auth pages, remaining dialogs and copy cleanup`.

### Task 12: Accessibility and keyboard specs

**Files:**
- Modify: `packages/web/package.json` (devDependency `@axe-core/playwright`)
- Create: `tests/e2e/a11y.spec.ts`, `tests/e2e/keyboard.spec.ts`

- [ ] **Step 1: Write specs:** `a11y.spec.ts` runs `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze()` on the pages listed in Task 11 plus `/designs/:id` (seeded) and an open edit-design dialog; fails on `impact` `serious|critical` whose target is not inside a third-party widget (tiptap `.ProseMirror` excluded via `.exclude`); logs the rest. `keyboard.spec.ts`: from `/home`, Tab reaches the first sidebar link with a visible focus ring (computed `outline-style` not `none` or `box-shadow` set), Tab order reaches "Add design" before the first ledger row link, Enter on a ledger row opens `/designs/:id`; on View Design, open the inventory dialog with Enter, Escape closes it and focus returns to its trigger; at 412px width the dialog is a bottom sheet (`[data-vaul-drawer]` visible) and Escape closes it.
- [ ] **Step 2:** Run: fix every serious/critical violation found in our markup; re-run until PASS.
- [ ] **Step 3:** Commit `test(web): axe and keyboard coverage`.

### Task 13: Visual baselines with real photos

**Files:**
- Create: `packages/web/tests/e2e/fixtures/images/` with 3 photos from the shop (download `il_794xN` versions of the Monstera earrings, Celestial rings and Blue lace agate ring listings from `i.etsystatic.com/47408839/...`; owner granted permission)
- Modify: `tests/e2e/utils/upload-mocks.ts` / `api-helpers.ts` so visual seeds upload a real fixture image instead of referencing the missing `test-placeholder`
- Modify: every `*.visual.spec.ts` if a locator changed; regenerate `*-snapshots/`

- [ ] **Step 1:** Seed images; run `bunx playwright test --project=desktop-visual --project=mobile-visual --update-snapshots`.
- [ ] **Step 2:** Open every new PNG and review by eye against the spec: no ⚠ placeholders, amethyst only in allowed places, no horizontal overflow, mobile dialogs are sheets. Fix and regenerate as needed.
- [ ] **Step 3:** Run the full suite (all projects) twice: PASS both, 0 flaky.
- [ ] **Step 4:** Commit `test(web): refresh visual baselines with real product photos`.

### Task 14: Delivery gate and PR

- [ ] **Step 1:** `bun lint`, `bunx tsc -p packages/types --noEmit`, `bun --filter @jewellery-catalogue/web build`, web unit tests (only the 3 known failures), full e2e.
- [ ] **Step 2:** Manual click-through in a browser (dev server + mock auth + etsy-mock) of every screen and dialog at 1280px and 412px; record each control's result for R-35.
- [ ] **Step 3:** Write the antislop Delivery Gate PASS/FAIL report (four blocks) into the PR description; any FAIL blocks the PR.
- [ ] **Step 4:** Push branch, open PR to `main`.
