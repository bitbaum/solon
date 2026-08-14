# UI guidelines

## Where the design system actually lives

Two files, and this document is neither of them:

| File | Role |
|---|---|
| `src/app/globals.css` | **Token SSOT.** Every colour, font, radius and spacing constant. |
| `tailwind.config.js` | Maps Tailwind utilities onto those CSS variables. Never a literal value. |
| `scripts/design-system-check.js` | **Enforcement.** Run by `npm run design:check`, which `npm run verify` runs. |

This page describes conventions a linter cannot check. It deliberately lists **no
colour values** — a palette written down twice is a palette that will disagree
with itself. If you want to know what `--surface-raised` is, read `globals.css`.

## One family, three products

Solon's tokens are copied from OrangeCat's **by name and by value**, and the
public backdrop mirrors FleetCrown's. OrangeCat, FleetCrown and Solon are one
product family and must read as one. A token added here should be added there
under the same name, or not at all.

Solon is **dark-only**. It is a public ledger; marketing and dashboard share the
same near-black canvas. There is no light theme to keep in sync.

## Rules the checker enforces

`npm run design:check` fails the build on any of these, so you will find out
before CI does:

- No Tailwind greys (`slate` / `gray` / `zinc` / `neutral`) — use `text-fg-*`,
  `bg-surface-*`, `border-*`.
- No arbitrary hex (`bg-[#…]`) and no `white/NN` opacity — add a semantic token.
- No raw radii (`rounded-lg`) — use `rounded-control` / `rounded-surface` /
  `rounded-pill`.
- No drop shadows. **Hierarchy is border and type**, not elevation.
- No component gradients. Brand surfaces belong in `globals.css`.
- No `max-w-7xl`. Width is one decision: `.section-shell`.

The legacy `navy` / `solon-*` palette is **deleted, not aliased** — any leftover
usage fails the build rather than quietly rendering the old look.

## Layout

The root layout does **not** wrap pages in a container. Sections are full-bleed
and own their own width via `.section-shell`, so a hero reaches the edges of the
screen instead of rendering as a box floating in a gutter.

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
