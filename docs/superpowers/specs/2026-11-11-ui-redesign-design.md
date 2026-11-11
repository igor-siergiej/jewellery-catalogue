# UI redesign: Mari's Crystal Jewellery catalogue

Date: 2026-11-11. Branch/worktree: `ui-redesign` (`../jewellery-catalogue-ui-redesign`).

## Intent

The web app is a private organiser for one maker's Etsy shop (Mari's Crystal Jewellery,
shop_id 47408839): designs, materials, stock, and getting designs onto Etsy. Today it
looks like a generic AI template (blue-purple palette with no brand link, a bright indigo
pill on every value, lavender-on-lavender surfaces, a handwriting font for data). The
redesign makes it look like the shop's own tool and makes the daily questions easy to
answer at a glance.

The owner's three jobs, in their words: **see what is currently in stock**, **add new
designs from my notes**, **link them to Etsy**. The feel they asked for: "an organiser,
organised and analytics".

Guided by the antislop rules (`antislop` + `antislop-ui` skills), mode "during". Every
visual decision carries a one-line reason (R-31).

## Goals

1. Home answers "what's in stock and what needs doing" without scrolling on desktop.
2. The app visibly belongs to Mari's Crystal Jewellery (logo colours, banner typography,
   real product photos), not to any SaaS template.
3. Data reads like a ledger: names, stock, cost, price and time are the loudest things;
   decoration is quiet.
4. One accent colour, used where it means something.
5. Every screen keeps working at phone width and by keyboard, with real empty, loading
   and error states.

## Non-goals

- No new backend features or API changes. Data the redesign needs already exists
  (`useProducible` for "can make", low-stock utils, Etsy listings/reconcile hooks, sales
  report).
- No dark mode. Owner decision: light only. The unused `.dark` token block is deleted.
- No changes to Etsy, pricing, drafts or stock logic. The form, table and dialog merges
  below are frontend refactors that keep behaviour identical.

## Anti-goals (fail even if it works)

- A purple-on-everything look where the accent marks nothing.
- Invented numbers or decorative charts (R-17, R-38).
- The script/display fonts creeping into data, tables or forms.
- Breaking the existing e2e behaviour suite (baseline: 222 passed, 0 flaky, on `origin/main`
  before #139; re-run on current main before starting).

## Design Read

Reading this as: a private inventory and listing organiser for a solo jewellery maker,
in the shop's own periwinkle, navy and amethyst language. Dials **ENERGY 1 / RHYTHM 2 /
MOTION 1**.
- ENERGY 1: it's a work tool used daily; calm beats loud.
- RHYTHM 2: screens share one structure, with deliberate breaks (Stock home's ledger plus
  side column; View Design's photo-led layout).
- MOTION 1: hover, press and focus states only. No entrance animations.

## Decided by the owner

| Decision | Choice |
|---|---|
| Overall feel | Organiser with analytics |
| Theme | Light only, no dark mode |
| Home layout | Option A, "Stock ledger first" (mockup `.superpowers/brainstorm/*/content/home-layout.html`) |
| Brand source | Logo + Instagram `maris_crystal_jewellery` + Etsy shop `MariCrystalJewellery`; their images may be used |
| Purple's role | Option 2: amethyst purple for primary buttons and the accent (mockup `brand-palette.html`) |

## Visual system

### Colour (R-01, R-29: 2 cores + 1 accent + semantic)

| Token | Hex | Role | Reason |
|---|---|---|---|
| `--background` | `#F7F8FD` | page | near-white with a periwinkle tint so the logo colour carries through |
| `--card` / `--popover` | `#FFFFFF` | surfaces | data sits on white for maximum legibility |
| `--sidebar` | `#CDD7FF` | sidebar | the logo's exact background colour; the only large periwinkle area |
| `--foreground` | `#0E1947` | text, icons | the logo's line colour |
| `--muted-foreground` | `#4A5175` | secondary text | 7.27:1 on background |
| `--primary` | `#5B3E96` | primary buttons, links, accent marks | amethyst from the crystals; owner chose purple; white on it 8.16:1 |
| `--accent` (tint) | `#ECE6F7` | selected/hover fill, "Listed" tag fill | amethyst tint; `#5B3E96` on it 6.69:1 |
| `--border` / `--input` | `#DCE1F2` | hairlines | periwinkle-grey, quieter than today's lavender borders |
| `--destructive` | `#9B1C2C` | out of stock, delete, errors | garnet; 8.09:1 on white; only colour for problems |
| `--warning` (new) | amber, AA-checked at build | below threshold but not zero | one step softer than garnet |
| `--success` (new) | green, AA-checked at build | sync succeeded, "all good" | used in messages only, never as decoration |

Retire `--secondary` as a second saturated colour (today it's a bright indigo); map it to
a neutral so the existing shadcn variants keep compiling. Chart tokens become amethyst
tints plus navy.

Accent rule: amethyst fills appear only on primary buttons, the active nav item, the
Etsy "Listed" tag, and the to-do counts in the Stock side column. Material types,
colours, time, priority etc. become plain outline or text, not filled pills.

### Type (R-06)

| Use | Font | Reason |
|---|---|---|
| Brand mark in sidebar only | Cinzel ("MARI'S") + Pinyon Script ("Crystal Jewellery") | echoes the Etsy shop banner wordmark; never used elsewhere |
| Page titles, design names on detail page | Cormorant Garamond 600, ≥24px | jewellery-catalogue print feel; not legible small, so never below 24px |
| Everything else | IBM Plex Sans 400/500/600, `font-variant-numeric: tabular-nums` | ledger-like, readable at 12–14px, numbers align in columns |

Delete Delius. Remove the unused Faculty Glyphic and Rubik `<link>` from `index.html`.
Self-host or Google Fonts with `display=swap`; builder's call.

### Shape and depth (R-11, R-12)

- Radius: 4px controls, 6px cards/panels, full round only for avatars.
- Shadow: none on cards (border only). One elevation shadow for popovers, dialogs and
  the mobile drawer.
- No uppercase tracked labels (today's `TIME / MATERIALS / ABOUT THIS DESIGN`).

### Identity motif

The periwinkle sidebar with the Mari's wordmark, plus real product thumbnails in every
list. The product photos are the decoration.

## Screen changes

### Shell (MainLayout, AppSidebar)

- Sidebar: periwinkle, wordmark at top (existing logo image beside it), nav **Stock,
  Designs, Materials, Etsy, Board**. "Add Design" and "Add Material" leave the nav and
  become primary buttons on Designs, Materials and Stock. Routes stay (`/home`,
  `/addDesign`, `/addMaterial`, `/listings`) so links and e2e helpers keep working;
  only labels change ("Listings" → "Etsy", "Home" → "Stock").
- Logo becomes a real `<a>`/`Link` to `/home` (today a clickable `<img>`, R-39).
- Remove the "vlocalhost" version line from the brand area; show the version in
  Settings instead.
- Header: keep search on list pages and the draft-save status; drop the header
  "Back to Designs" button (View Design already has its own back link).
- Base CSS: `cursor: pointer` on enabled controls, `not-allowed` on disabled; visible
  focus ring in amethyst.

### Stock (Home, `/home`)

Layout A:
- Title "Stock" + one-line summary (e.g. "2 designs out of stock"), real counts only.
- Main column: one table of all designs: thumbnail, name, in stock, can make, Etsy
  status. Out of stock and below threshold sort first and show garnet/amber numbers.
  Row links to the design. Variants show as "Design · Variant" (no em dash).
- Side column: "Not on Etsy yet" (count + Review → Designs filtered), "Unlinked Etsy
  listings" (count + Link → Etsy page reconcile), "Running low" materials (short list →
  Shopping list), **Add design** button.
- Sales: the existing `SalesDashboard` moves below the ledger, restyled to the new tokens.
  Only real data; hidden when Etsy isn't connected.
- Empty state: no designs yet → "Add your first design" with the button. Loading and
  error states name what failed.
- Mobile: table becomes a stacked list; side column drops below it.

### Designs list

- Cards keep the photo as the hero. Remove the coloured time/stock pills; show stock and
  time as plain text lines, garnet only when out of stock.
- Card actions: favourite stays as an icon button with `aria-label`; "Manage inventory"
  and "Delete" move into an overflow menu or the detail page, so delete no longer sits
  beside favourite. Tap targets ≥44px.
- Category tabs restyled (underline or segmented, neutral), counts in muted text.

### View Design

- Photo left, details right, as now. Name in Cormorant, price prominent.
- Replace the four identical stat boxes with a compact definition list (time, material
  cost, added, low-stock threshold).
- Material type/attribute pills become plain text or neutral outline tags.
- Etsy status and actions grouped in one clear block.

### Shared patterns (owner approved: "every dialog and screen")

- **Dialog shell.** One wrapper used by every dialog: title, scrolling body, sticky footer
  (secondary left, primary right). On phones (<768px) dialogs render as a bottom sheet
  (`vaul` drawer, already a dependency). Escape closes; focus returns to the trigger.
- **Ledger table.** One table style: single-line names (truncate with title), numbers
  right-aligned with tabular figures, row actions in a labelled overflow menu.
- **Tags.** Neutral outline by default; amethyst fill only for Etsy "Listed"; garnet only
  for problems; amber for below-threshold. Human labels everywhere (no `EARCUFF`,
  `NECKLACES` enum text, no uppercase).
- **States.** Every data view: empty (why + the one action), loading (what is loading),
  error (what failed + retry).
- **AI actions.** Drop the sparkle icon (R-04). Label by outcome: "Write title and
  description", "Suggest a price range". Behaviour unchanged.

### Forms (owner approved, including the merge)

- **Merge duplicates.** One design form component used by the Add Design page and the Edit
  Design dialog (replacing the separate `AddDesign` page form, `DesignEditForm` and
  `DesignUpdateForm` field markup). One material form shared by Add Material and Edit
  Material (replacing `MaterialFormResolver/Forms/*` and `MaterialUpdateForm/UpdateFields/*`).
  One task form for Add/Edit Task, one goal form for Add/Edit Goal. Submission logic,
  draft autosave and API calls stay as they are; only the field markup is unified.
- **Layout.** Desktop: section label column left, fields right. Phone: labels stack above
  fields, sticky bottom action bar.
- **Order.** Required first (Basics: name, type, time; Materials; Price; Photos). Optional
  sections (Variations, Description, Maker docs, Stock alert) live under a "More"
  disclosure, auto-open when they hold data.
- **Duration input.** Replace the `type="time"` clock input with hours + minutes number
  fields; same stored value. Fixes "12:30 AM" shown for 30 minutes.
- **Validation copy.** Map enum errors to plain messages ("Pick a wire type"); never show
  raw Zod output.
- **Labels.** Every field has a visible label (Add/Edit Task today is placeholder-only).
  Selects show human option names.
- **Price breakdown.** Same font as the rest (tabular figures), not monospace.
- **Option pickers.** Clear selected state (amethyst fill + check) vs unselected (white +
  border); no third purple.
- **Copy.** Sentence-case titles ("New design", "Add material", "Edit design"); no "!";
  "Private, never shown on Etsy" said once per section.
- **Settings save.** One "Save" button; recalculating all design prices is an explicit
  confirm that states how many designs will change.

### Screens

| Screen | Change |
|---|---|
| Login / Register | Keep the photo; add the brand mark; one primary button, Register as secondary link/button; sentence-case copy, no "!" |
| View Design | One back link; details as a definition list; one Etsy block showing state + its single action (no unexplained disabled "Send to Etsy"); AI price button relabelled |
| Materials | Collapse `AllMaterialsTable`, `BeadTable`, `ChainTable`, `EarHookTable`, `WireTable` into one table component; each tab shows only that type's columns, "All" shows the common ones; "Buy" becomes a labelled action |
| Shopping list | Restyle to ledger; verify in browser (no snapshot today) |
| Etsy (Listings) | Status column ("Not linked" / linked design name); one "Link" action, "Create design" in the row menu; real thumbnails |
| Sales | Lives under the Stock ledger; period picker as a quiet segmented control |
| Board | Priority filters as a labelled filter group; correct plurals ("1 goal"); goals strip above the columns; priority as text + marker, only High in garnet |
| Settings | One Save; Radix selects instead of native; readable category labels; version shown here |
| Error page, Update prompt | Restyle; verify in browser |

### Dialogs

| Dialog | Change |
|---|---|
| Edit design, Edit material | Shared forms above |
| Manage inventory | Remove stacked empty dividers; "In stock" / "Can make" wording; proper disabled button; sufficiency as text, not a green pill |
| Send to Etsy | Category shown by name, not "Taxonomy #1234"; correct plural for photos; sticky footer |
| Link existing design | Searchable list with thumbnails |
| Delete design / draft / material | Same structure on new tokens; names the item |
| Update design prices? | States how many designs change |
| Add/Edit task, Add/Edit goal | Shared forms with visible labels |
| Update available | Restyle |

### Copy (R-02)

Remove all 28 em dashes in UI strings (e.g. "Draft save failed, will retry"). Update the
matching e2e `getByText` assertions in the same change.

## Testing

- Re-run the full e2e suite on current main first; that's the behaviour baseline.
- Where a spec targets markup the redesign removes (`[data-slot="item"]`,
  `[title="Manage Inventory"]`, copy with em dashes), switch it to `getByRole`/accessible
  name in the same commit as the UI change.
- Seed a real product image for the visual specs (they currently 404 on
  `test-placeholder`), then regenerate all visual baselines and review them by eye.
- Add a keyboard spec (Tab through shell + Stock page, Enter opens a design, Escape
  closes dialogs) and an axe scan of each main page if `@axe-core/playwright` is
  acceptable as a dev dependency.
- Antislop Delivery Gate report with the deliverable.

## Calls made by the designer (owner to check)

Settled after a builder review, not decided by the owner:

1. **Etsy status vocabulary.** Derived from `design.etsy`: none → "Not on Etsy",
   `draft` → "Etsy draft", `active` → "Listed" (the only amethyst-filled tag),
   `inactive` → "Inactive". "Not on Etsy yet" on Stock counts designs with no `etsy`
   object that are not marked catalogue-only.
2. **Designs filter.** In scope, frontend only: Designs gains an Etsy-status filter held in
   the URL (`/designs?etsy=none`) so the Stock "Review" link lands on it. Category tab
   also moves to the URL. No API change.
3. **Variants in the ledger.** One row per design. "In stock" is the sum across variants;
   "can make" is the design-level value from `useProducible`. A design sorts as a problem
   if any variant is at or below its threshold, and the row shows a second line naming
   the problem variants ("Gold · 0 left").
4. **Brand images.** Users' own uploaded design photos are the product imagery in the app.
   Two or three photos from the Etsy shop (owner gave permission) are committed as e2e
   fixtures only, seeded for the visual specs. Login keeps its current photo.
5. **Axe.** Add `@axe-core/playwright` as a dev dependency. Fail on serious/critical
   violations in our own markup; fix them in this work. Violations inside third-party
   widgets are listed in the PR, not blocking.
6. **Settings and Shopping list.** Sidebar footer holds the user, Settings (with the
   version shown on the Settings page) and logout. The header cog is removed. Shopping
   list is reached from the Materials page header and from Stock's "Running low" panel.
   The Designs page link is kept.

## Left to the builder

- Commit and PR slicing.
- Exact amber/green hex values (must pass AA on white).
- Whether fonts are self-hosted.
- Overflow menu vs moving actions to the detail page for design cards.
- Which shadcn primitives to keep as is vs restyle.
