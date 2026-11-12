# Design

Read this before any UI work. Tokens live in `packages/web/src/index.css`.

A private inventory and listing organiser for a solo jewellery maker, in the shop's own
periwinkle, navy and amethyst language.

Dials: **ENERGY 1 / RHYTHM 2 / MOTION 1**.

- ENERGY 1: a work tool used daily; calm beats loud.
- RHYTHM 2: screens share one structure, with deliberate breaks (Stock ledger plus side
  column; View Design's photo-led layout).
- MOTION 1: hover, press and focus states only. No entrance animations.

Light theme only. No dark mode, no `dark:` utilities.

## Colour

| Token | Hex | Role | Reason |
|---|---|---|---|
| `--background` | `#F7F8FD` | page | near-white with a periwinkle tint so the logo colour carries through |
| `--card` / `--popover` | `#FFFFFF` | surfaces | data sits on white for maximum legibility |
| `--sidebar` | `#CDD7FF` | sidebar | the logo's exact background colour; the only large periwinkle area |
| `--foreground` | `#0E1947` | text, icons | the logo's line colour |
| `--muted-foreground` | `#4A5175` | secondary text | 7.27:1 on background |
| `--primary` | `#5B3E96` | primary buttons, links, accent marks, focus ring | amethyst from the crystals; white on it 8.16:1 |
| `--accent` (tint) | `#ECE6F7` | selected/hover fill, "Listed" tag fill | amethyst tint; `#5B3E96` on it 6.69:1 |
| `--border` / `--input` | `#DCE1F2` | hairlines | periwinkle-grey, quiet |
| `--destructive` | `#9B1C2C` | out of stock, delete, errors | garnet; 8.09:1 on white; only colour for problems |
| `--warning` | `#8A5A00` | below threshold but not zero | one step softer than garnet; white on it 5.93:1, on `#F7F8FD` 5.59:1 |
| `--warning-foreground` | `#FFFFFF` | text on a warning fill | 5.93:1 |
| `--success` | `#1B7A3A` | sync succeeded, "all good" | messages only, never decoration; 5.40:1 on white, 5.09:1 on `#F7F8FD` |

`--secondary` is a neutral (`#EEF0F9`), not a second saturated colour. Chart tokens are
amethyst tints plus navy.

### Accent rule

Amethyst fills appear only on: primary buttons, the active nav item, the Etsy "Listed" tag,
Stock side-column counts, and the selected option in pickers. Material types, colours,
time, priority and similar become plain outline or text, not filled pills.

## Type

| Use | Font | Reason |
|---|---|---|
| Sidebar brand mark only | Cinzel (`font-brand-caps`) + Pinyon Script (`font-brand-script`) | echoes the Etsy shop banner wordmark; never used elsewhere |
| Page titles, design name on View Design | Cormorant Garamond 600 (`font-display`), 24px and up | print-catalogue feel; not legible small |
| Everything else | IBM Plex Sans 400/500/600, `tabular-nums` on body | ledger-like, readable at 12 to 14px, numbers align in columns |

Sentence-case titles. No uppercase tracked labels. No em dashes or "!" in UI copy.

## Shape and depth

- Radius: 4px controls (`rounded-md`), 6px cards and panels (`rounded-lg`), full round
  only for avatars.
- No shadow on cards (border only). One elevation shadow (`--shadow-elevation`) for
  popovers, dialogs and the mobile drawer.

## Interaction

- Enabled controls: `cursor: pointer`. Disabled: `cursor: not-allowed`.
- Visible focus ring in amethyst on every focusable element.
- Icon-only buttons have `aria-label`. Tap targets are at least 44px on mobile.

## Identity motif

The periwinkle sidebar with the Mari's wordmark, plus real product thumbnails in every
list. The product photos are the decoration.
