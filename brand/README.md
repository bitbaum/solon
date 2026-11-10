# Solon's mark

**The owl lives in `@bitbaum/design-tokens/marks`** (repository
`bitbaum/design-tokens`, file `marks/solon.mjs`), the one place the fleet's
marks live; Solon installs the package as `@fleet/design-tokens`. Solon's
header, footer and share card draw it from there (`src/lib/brand/mark.ts`), and
so do OrangeCat's studio tiles and Solon's project page there. Everything else
here is written from it:

```bash
pnpm run brand            # src/app/icon.svg, public/app-icons/icon.svg, export/*.svg
pnpm run brand -- --png   # also the PNG icons, favicon.ico, apple-icon.png and 1024px exports
                          # (Chromium; set CHROMIUM_PATH if Playwright's pinned build is missing)
```

`src/lib/brand/__tests__/brand.test.ts` fails when an icon no longer matches
the package's mark, or when a drawing of its own appears here.

## Replacing it

1. Export the new logo as plain SVG: one colour, holes cut with
   `fill-rule="evenodd"`, no transforms, no text.
2. In bitbaum/design-tokens, run its `marks:import` script with the slug `solon`
   and that file, open a pull request, and once it is merged run its Release
   workflow.
3. Here, raise `@fleet/design-tokens` to that release and run both commands
   above. Commit what they wrote.

The header, footer, share card, favicon, app icons and exports follow, and so
does every other product that shows Solon.

## What it is

Athens' little owl, _Athene noctua_ — the bird on the coins of Solon's city —
with the fleet's rotorelief rings for eyes. It is the Cat's sibling: OrangeCat
is a cat whose face is one of Duchamp's discs, Loki is the disc itself, Solon
is an owl with two of them. Two eyes because Solon looks at a question from
both sides: the law as written and what happened, one place against another.

## Where to take it from

| Need                              | File                                         |
| --------------------------------- | -------------------------------------------- |
| Slide on a light background       | `export/solon-mark-ink.svg` (or `-1024.png`) |
| Slide on a dark background        | `export/solon-mark-white.svg`                |
| Brand colour                      | `export/solon-mark-accent.svg`               |
| App icon, project logo, avatar    | `export/solon-icon.svg` (or `-1024.png`)     |

## The other candidates

[`concepts.png`](concepts.png) shows the owl beside the marks it was chosen over,
each at 128, 48, 24 and 16 px, in a header and as an app icon next to OrangeCat
and Loki. Their drawings are in [`concepts/`](concepts/); any of them becomes the
mark by importing it into the package as above.

- **Ring**: the Landsgemeinde from above, open toward you. Set aside because
  concentric arcs around a figure are the Apple Podcasts and AirDrop icons.
- **Hemicycle**: the assembly as a seat chart. Clear and true to the data side,
  but generic, and outside the family.
- **Seal**: the balance struck in a coin. Every law firm's mark.
- **Volute**: the Ionic capital. Reads as a bank or a courthouse.
- **Double coil / One path in**: an S of two volutes; a coil you walk into.
  Too close to Loki's disc to tell apart at icon size.
