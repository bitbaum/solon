# UI guidelines

_Created 2026-01-08. Last modified 2026-10-01: the Places map is built and
draws only with tokens, read from the page (`map-colours.ts`), so it follows
whichever theme is on. Earlier the same day: Solon gets a light theme beside
the dark one (decided 2026-09-30, not built yet), both from the package's
tokens. Earlier, 2026-09-30: two depths, everyday pages
(`EVERYDAY_ROUTES`) plain with "Technical details" one click away, the deep
side as technical as it needs to be; the render check that holds everyday
pages to it. Earlier the same day: every inner page uses `PageLayout`, every
text box uses `.field`, and stored values are shown through
`src/lib/domain/plain-words.ts`, never as stored._

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

Solon is **dark today and gets a light theme** (decided 2026-09-30, with the
Places map; the theme itself is not built yet). Both come from the package's
tokens, including the map's colour scale, so a colour is never written for one
theme only; until the light theme ships, marketing and dashboard share the
near-black canvas. The map already follows: `src/components/places/map-colours.ts`
reads `--map-scale-1…7`, `--map-no-data`, `--map-boundary` and
`--accent-primary` from the page and reads them again when the `<html>` class
changes. MapLibre's own stylesheet is unlayered, so the few overrides of it in
`globals.css` (the hover label) are unlayered too, in tokens.

## Headlines are the sans

Solon sets headlines in the sans, heavy and tight — the same voice OrangeCat and
Loki speak in. It used to be the one product setting them in the shared serif,
which made it read as a different company from its siblings.

- `.headline` — sentence case, for app screens and long titles.
- `.headline-caps` — uppercase, for the short statement a full-screen section
  makes. A few words, never a sentence.
- `.kicker` — the small uppercase label above a headline.

Both are defined once in `globals.css`. `design:check` fails on `font-display`
and on any display-size text without a headline style (or `font-mono` for data).

## Full-screen sections and photographs

The front page and `/hire` are built from `FullBleed` sections
(`src/components/site/full-bleed.tsx`): one photograph, one statement bottom-left
over a scrim, one action. Pass `daylight` for bright photographs — the heavier
scrim keeps text readable over sky and facades. Actions on a photograph use
`.btn-frame` / `.btn-frame-accent`; inside forms use `.btn-primary` /
`.btn-secondary`.

Every photograph is registered in `src/lib/content/photos.ts` with its author,
licence and source, and `/credits` renders that list — a page cannot use a photo
the credits page does not know about. Only public-domain, CC0 or CC BY images,
and none that shows or implies a customer.

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
- No typeface named in a component (`font-['…']`) — use `.headline` /
  `font-sans` / `font-mono`.
- No `font-display` (the serif) anywhere in Solon, and no display-size text
  without a headline style. See above.
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
| Page shell (every inner page: kicker, title, one-line description) | `src/components/ui/page-layout.tsx` |
| The way down to the exact record (IDs, addresses, raw payloads, API links) | `src/components/ui/technical-details.tsx` |
| Long-form pages (whitepaper, questions, blog) | markdown in `content/`, read by `src/lib/content/reading.ts` through bip-kit (`bip-kit/node`, `parseFaq`), rendered inside `PageLayout` in a `.bp-theme` wrapper; routes are `force-static` |
| Text box, select, text area | the `.field` class in `src/app/globals.css` (add `py-3` on a text area) |
| Full-screen section | `src/components/site/full-bleed.tsx` |

Links come from `src/lib/site-config.ts`: `SITE_SECTIONS` (footer, mobile menu) and `PRIMARY_NAV` (the header's three links, tested to be a subset). Keep components small, prefer
semantic HTML, and keep ARIA roles on the menu primitives.

## What the checker cannot see

CSS is invisible to lint, typecheck and unit tests: a class with no rule behind
it renders as nothing and every gate stays green. `tests/e2e/render.spec.ts`
runs in CI's `integration` job against a built app and checks that the main
actions are styled, the header fits on one line at 1440px, no page scrolls
sideways at 390px, and the mobile menu opens. Still: look at a page before
shipping it.

## Copy

Every sentence on a translated page lives in `messages/<locale>.json` (five languages; see `AGENTS.md`, "Language"). Write for the person who will run a
group, not for engineers: no crypto or protocol vocabulary on the front pages
(the details live on `/security` and `/governance/voting`). Never assemble a
sentence by concatenation; see `AGENTS.md`, "Language".

### Two depths

Solon has two depths, and both matter.

- **Everyday pages** (`EVERYDAY_ROUTES` in `src/lib/site-config.ts`: the
  dashboard, decisions, suggesting, joining, founding, the record, and each
  organization's page) are for someone who has never read about governance.
  They say what happened in plain words. The exact record (identifiers,
  Bitcoin addresses, raw payloads, API paths) sits under **Technical details**
  (`TechnicalDetails`), closed by default, on the same page.
- **The deep side** (the governance explainers under `/governance/*`,
  `/security`, `/api`, `/ecosystem`, `/treasury/bitcoin`, `/whitepaper`,
  `/faq`, `/blog`, `/changelog` and `/roadmap`) is for the reader who wants to
  know exactly how it works. It may be as technical as it needs to be:
  precise terms (quorum, electorate, BIP-137) are the point there. Everyday
  pages link down to it ("How this works →"); it never has to link up.

`tests/e2e/render.spec.ts` ("the everyday pages show no stored codes") fails
the build if an everyday page shows a stored value outside Technical details.

### Plain words on everyday pages

Assume the reader is not technical. A value the database stores (`OPEN`,
`SIMPLE_MAJORITY`, `HUMANS_ONLY`, `TREASURY_SPEND`) never reaches the page as
stored: statuses go through `proposalStanding()`, the rules of a vote through
`votingRules()` (both in `src/lib/domain/plain-words.ts`), and category names
come from `CATEGORY_LABEL` in `src/lib/config/governance.ts`, and entries on
the record read through `EVENT_LABEL` and `eventGloss()` in
`src/lib/domain/event-gloss.ts`. Amounts read in bitcoin (`bitcoinAmount()`),
not satoshis. The words people
see are "suggest", "start the vote", "agreed" and "turned down", not "file",
"open a session", "quorum" or "electorate". Error messages say what happened
and what to do ("The connection dropped, so nothing was saved. Please try
again."), not "network error".
