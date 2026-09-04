# UI guidelines

## Where the design system actually lives

Two files, and this document is neither of them:

Not in this repo, and not in this document:

| Where | Role |
|---|---|
| **`@fleet/design-tokens`** ([repo](https://github.com/bitbaum/design-tokens)) | **Token SSOT** for all three products — every colour, face, radius, rhythm and measure, plus the self-hosted font files and the Tailwind preset. |
| `src/app/globals.css` | Solon-specific rules only. Defining a token here **fails the build**. |
| `tailwind.config.js` | Consumes the shared preset. Defines no colours, fonts or geometry. |
| `scripts/design-system-check.js` | **Enforcement.** Run by `pnpm run design:check`, which `pnpm run verify` runs. |

This page describes conventions a linter cannot check. It deliberately lists **no
colour values** — a palette written down twice is a palette that will disagree
with itself. If you want to know what `--surface-raised` is, read the package.

## One family, three products

The tokens are no longer *copied* between the three repos — they are **imported
from one package**. They used to be copied, and they drifted: this file once
claimed Solon's tokens matched OrangeCat's "by name and by value" while the two
shared neither. Copies drift; imports cannot.

To retheme the whole stack, edit the `▼▼▼ THE KNOBS ▼▼▼` block in the package's
`tokens.css`, tag a release, and bump the dependency in the three apps.

Solon is **dark-only**. It is a public ledger; marketing and dashboard share the
same near-black canvas. There is no light theme to keep in sync.

## The display face has one weight

The display face is a high-contrast serif with a **single weight (400)**. Two
consequences, both enforced:

- Never put `font-bold` / `font-semibold` beside `font-display`. There is no
  bolder cut, so the browser synthesizes one, and a fake bold looks cheap.
  Weight and tracking are declared *with the face* in the package — which is
  what keeps swapping the face a one-line change.
- Never use it below `text-2xl` / `text-display-3`. Its thin strokes thin out
  further as type shrinks: at 18px the card titles rendered *lighter* than the
  16px body copy beneath them and the hierarchy inverted. Below the floor, use
  the sans at `font-semibold`. The uppercase, open-tracked `.wordmark` is the
  one sanctioned exception.

Solon is **dark-only**. It is a public ledger; marketing and dashboard share the
same near-black canvas. There is no light theme to keep in sync.

## Rules the checker enforces

`pnpm run design:check` fails the build on any of these, so you will find out
before CI does:

- No Tailwind greys (`slate` / `gray` / `zinc` / `neutral`) — use `text-fg-*`,
  `bg-surface-*`, `border-*`.
- No arbitrary hex (`bg-[#…]`) and no `white/NN` opacity — add a semantic token.
- No raw radii (`rounded-lg`) — use `rounded-control` / `rounded-surface` /
  `rounded-pill`.
- No drop shadows. **Hierarchy is border and type**, not elevation.
- No component gradients. Brand surfaces belong in the token package.
- No `max-w-7xl`. Width is one decision: `.section-shell`.
- No typeface named in a component (`font-['…']`) — use `font-display` /
  `font-sans` / `font-mono`.
- No weight or `tracking-display` beside `font-display`; no `font-display` below
  its size floor. See above.
- No token redefined in `globals.css`. The package owns them.

The legacy `navy` / `solon-*` palette is **deleted, not aliased** — any leftover
usage fails the build rather than quietly rendering the old look.

## Layout

The root layout does **not** wrap pages in a container. Sections are full-bleed
and own their own width via `.section-shell`, so a hero reaches the edges of the
screen instead of rendering as a box floating in a gutter.

## Rhythm and display type

Pace is one decision, not a per-section guess. Use the utilities, never a raw
`py-20 sm:py-28`:

| Utility | Token | Use |
|---|---|---|
| `py-section` | `--section-py` | marketing sections |
| `py-section-tight` | `--section-py-tight` | content pages (`PageLayout`) |
| `text-display-1` | `--text-display-1` | the one hero headline on a page |
| `text-display-2` | `--text-display-2` | section headings, content-page `h1` |
| `text-display-3` | `--text-display-3` | card headings |

All five are `clamp()`, so a heading needs **no breakpoint variants** — one size
resolves itself per viewport. If you find yourself writing
`text-3xl sm:text-4xl lg:text-5xl`, reach for a display token instead.

Headlines take their width from the column they sit in. Do not also give an `h1`
its own `max-width`: you end up with two rules where only one ever binds. Running
text uses `max-w-lede` (short intros) or `max-w-copy` (paragraphs).

## Components

| Component | File |
|---|---|
| Header / nav | `src/components/ui/navigation.tsx` |
| Footer | `src/components/ui/footer.tsx` |
| Logo | `src/components/ui/logo.tsx` |
| Auth control | `src/components/ui/auth-control.tsx` |
| Page shell | `src/components/ui/page-layout.tsx` |

Nav items come from `src/lib/site-config.ts`. Keep components small, prefer
semantic HTML, and keep ARIA roles on the menu primitives.

## Copy

All user-facing strings live in `i18n/{en,de,fr,it}.json`. Four languages ship,
so **never hard-code a string in a component** — add the key and translate it.
