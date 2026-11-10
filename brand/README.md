# Solon's mark

**The mark is one file: [`solon-mark.svg`](solon-mark.svg).** Everything else
that shows it is written from it:

```bash
pnpm run brand            # src/lib/brand/mark.ts, src/app/icon.svg, public/app-icons/icon.svg, export/*.svg
pnpm run brand -- --png   # also the PNG icons, favicon.ico and 1024px exports (Chromium;
                          # set CHROMIUM_PATH if Playwright's pinned build is missing)
```

`src/lib/brand/__tests__/brand.test.ts` fails when a copy no longer matches the
drawing, so a logo cannot be changed in one place and forgotten in another.

## Replacing it

Export the new logo from any editor as plain SVG, a single compound path in one
colour (holes cut with `fill-rule="evenodd"`), no transforms, no text. Save it
over `solon-mark.svg`, run both commands, commit what they wrote. The header,
footer, share card, favicon, app icons and the exports follow. For OrangeCat's
copy (its studio tiles and Solon's project page there), run
its `brand:import` script with the slug `solon` and this file (bitbaum/orangecat).

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
mark by copying it over `solon-mark.svg` and running `pnpm run brand`.

- **Ring**: the Landsgemeinde from above, open toward you. Set aside because
  concentric arcs around a figure are the Apple Podcasts and AirDrop icons.
- **Hemicycle**: the assembly as a seat chart. Clear and true to the data side,
  but generic, and outside the family.
- **Seal**: the balance struck in a coin. Every law firm's mark.
- **Volute**: the Ionic capital. Reads as a bank or a courthouse.
- **Double coil / One path in**: an S of two volutes; a coil you walk into.
  Too close to Loki's disc to tell apart at icon size.
