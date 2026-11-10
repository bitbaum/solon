# Every place at every level: one model, one page, one map behaviour

Status: **design, approved by the supervisor on 2026-11-10 with the amendments
folded in below. Nothing in it is built yet.** Each step names its PR; this
file is updated as they land.

## The problem

On the live atlas, clicking the United States flies to Wyoming and draws its
counties; clicking Wyoming names it and offers no way to open its page. The
pages exist (`/places/united_states/wyoming` returns 200 and lists its 23
counties; `/places/united_states` links all 51 states). The map just never
links to them.

Causes, read from the code on `main` (the camera behaviour has not yet been
watched in a browser; step 4a does that before any fix):

1. **Atlas framing.** `loadMapData` (`src/lib/places/map-data.ts`) draws the
   level with the most areas. Only Wyoming's counties have areas
   (`scripts/places-us-census.ts` imports one state at a time), so the atlas
   effect `if (drawn) flyTo(cameraForBounds(drawn.bounds))` frames Wyoming, and
   `shapes` drops the US's own outline.
2. **Three key spaces.** The globe is keyed by law authority (`GLOBE_FEATURES`,
   `states:56` → `us-wy`), the law tree by `LAW_AUTHORITIES`, the pages by
   `jurisdictions.slug_path`. `pageOf` only knows a pack or an ISO region, so
   `us-wy` gets a name and a Law link and no page.

## The rule

**The place is the jurisdiction row. Everything else keys to it**: the map,
law, statistics, gaps, URLs. Today three trees (places, `LAW_AUTHORITIES`,
`WORLD`) each answer "where is this?". After this work only the places tree
does; the other two resolve to it through identifiers, and a test fails when
they stop doing so.

## What is reused, extended, new

**Reused unchanged:** `jurisdictions`, `place_levels` (from pack `levels[]`:
any depth, level names per locale, `overlaps`, `coverage: partial`,
`standsFor`), `jurisdiction_relations` (one current `part_of` parent each),
names with `used_by_id`, identifiers (including the `wikidata` scheme PR #484
adds; no second one), `areas`, `area_assertions` (`claims`, `administers`),
`recognises`, `member_of`, `facts`, `sources`, #458's `world` pack with the
`earth` root. A country's structure is written in its pack and nowhere else.

**Extended:**

- `LevelSchema.parent` may become a list, for a country where some units skip
  a level. Built only when a pack needs it.
- Gap coverage (#458, `src/lib/statistics/gaps.ts`) takes
  `place: {scheme, value}` with any identifier scheme, not only `iso_3166_1`
  (step 7; owned by this work. The South Ossetia work owns the proposal and
  responsible-office fields).
- `LAW_AUTHORITIES` stays configuration, but each entry's `place` must resolve
  to exactly one current jurisdiction (invariant test, step 3).

**New:**

- `place_paths`: every path a page has ever had (below).
- `place_ancestors`: a derived table of current ancestry (below).
- `GET /api/v1/places/atlas?place=`: one place, its chain, area, children,
  claims and law counts, keyed by place.
- `/places/by/{scheme}/{value}`: a stable door that redirects to the canonical
  path.

## Depth and level names

Already data. Liechtenstein is nation › Landschaft › municipality; Switzerland
is nation › canton › district › municipality › city district › statistical
quarter; a place with no subdivisions has a one-level pack. Nothing is code.

A US town is a `municipality` level `part_of` its state, with an `overlaps`
relation to each county it lies in (incorporated places cross county lines).
That is the "more than one parent" case inside one hierarchy: the page's path
follows the single `part_of` parent and the page says "Also in: X County, Y
County".

## Disputed, partially recognised and de facto places

Design §7 stands as written. Concretely:

- Two authorities, two hierarchies, one area: the Republic's authority
  (`part_of` `earth`) and Georgia's own unit for the area (`part_of` Georgia)
  are two rows, each with one parent and one breadcrumb, and both `claims` the
  same `areas` row. `administers` and `recognises` come from sources only.
  Abkhazia, Kosovo (with Serbia's unit) and South Ossetia take the same shape.
- Land with several claimants and no authority of its own (Western Sahara) has
  an **area page** in the same `/places` namespace, listing every claimant and
  administrator from the assertion rows.
- Neutral default for navigation: the world list is the children of `earth`;
  a source naming an authority is enough to list it, and recognition is a
  sentence, never a filter. On the map an area with more than one current claim
  is hatched; selecting it shows "Claimed by A and B; administered by B,
  according to [source]" with one Open link per authority, ordered
  alphabetically in the reader's language. Each authority's page names the
  others that share its land. No place has two breadcrumbs: two parents means
  two authorities.
- **Slugs come from the place's self-name** (the naming policy of §7.2),
  transliterated: the Republic's page is its own self-name, Georgia's unit gets
  Georgia's name for it. **No slug ever encodes a view on status.**

## URLs

- Canonical: `/places/<path>`, the readable chain below `earth`, so a country
  is one segment. Pack roots take the hyphenated form (`united-states`), one
  form everywhere; `united_states` and #458's `/places/world/<slug>` answer 308.
- **`place_paths (path PK, target_kind, target_id, canonical, recorded_at)`**
  where `target_kind` is `jurisdiction` or `area`, so an area page lives in
  the same namespace. `path` is globally unique, which is the uniqueness check
  across both kinds; a test proves a jurisdiction slug and an area slug cannot
  collide. The importer adds a canonical path when a name or parent changes and
  keeps the old one, which answers 308 to the canonical one. `jurisdictions.
  slug_path` stays as a read-through copy of the canonical path until nothing
  reads it.
- A merged-away place keeps its own page marked as ended, with a link to its
  successor (§9.2). It is not redirected.
- `/places/by/{scheme}/{value}` (`iso_3166_2/US-WY`, `wikidata/Q…`) redirects
  to the canonical path; law, OrangeCat and the globe link with it instead of
  guessing paths.
- The path is the same in every locale; the locale prefix stays as next-intl
  does it.
- Breadcrumbs: World › … › the place, from `loadChain`, never typed.
- Old URLs keep working: `/places?in=<law key>` resolves the key to a place and
  redirects to its path; `/law/place/<key>` stays (it lists an authority's
  acts), takes its breadcrumbs from the place chain and links to the place page.

## Law, statistics, gaps and children on any level

- **Law that applies here** = the authorities attached to any place in the
  chain, plus unions reached by `member_of`. Nearest first, with counts.
- **Statistics:** the place's own current facts per statistic metric, and its
  rank among siblings (same parent, same level) for the newest period most of
  them publish. Sibling charts use `@bitbaum/chartkit`.
- **Gaps:** #458's coverage lines on any identifier scheme; plus *derived* gaps
  ("published for 2,090 of 2,131 siblings, not here"), computed not stored; a
  country page rolls up the gaps within it.
- **Children:** from `part_of`, grouped by level, one row anatomy, paged, with
  a name filter above about 200.

## Queries and indexes

- `place_ancestors (place_id, ancestor_id, depth)`, current state only,
  rebuilt per pack inside the import transaction. Serves descendant counts,
  gap roll-ups, search within a place and the sitemap. History still uses the
  recursive CTE in `chain.ts`.
- One partial index for the children list:
  `jurisdiction_relations (to_id) WHERE relation = 'part_of' AND valid_to IS
  NULL AND superseded_at IS NULL`.
- Facts keep `(jurisdiction_id, metric_key, valid_from)`; a sibling comparison
  is that index over at most a few thousand ids.
- Geometry is split per parent, so the atlas loads only the focused place's
  children; one file per level does not survive world scale.

### Scale (estimates, to be measured before any of them is relied on)

Written from memory, not counted: about 250 countries; 4–5 thousand first-level
units; tens of thousands of second-level units; 10⁵–10⁶ municipal units
(order of magnitude: about 98 thousand EU local units, about 3.1 thousand US
counties, about 19.5 thousand US incorporated places). That implies names near
5 million, identifiers near 3 million, current relations, areas and assertions
near 1 million each, `place_ancestors` near 5 million. Facts are the only
large table, up to about 10⁸ at full municipal depth with ten years of
history; partition by metric or pack when measurement says so, not before.
Step 3 adds the counts to `/places/coverage` so the real numbers replace this
paragraph.

## One page template for every level

Country, region, county, town, a country with no pack, an area:

1. Head: name, level, origin, a status sentence about claims and recognition.
2. Breadcrumbs.
3. Map focused on the place's own area, its children drawn and clickable, its
   parent's outline faint.
4. Children.
5. Law that applies here.
6. Statistics against siblings.
7. Gaps.
8. Actions: tax, compare, ask, propose a change.

## Map behaviour

Selecting a place **selects** it: the camera frames that place's own outline,
its children draw, and the card shows its name and one primary "Open ‹place›"
link. Selecting a child selects that child. Nothing jumps to a child that was
not clicked. When only some children are drawn (the US today) the camera still
frames the whole parent and the card says how many are drawn ("Counties drawn
for 1 of 51 states"). `states:56` resolves through `us_state_fips` to
Wyoming's place and page.

## Packages first

- **`@bitbaum/geo-kit/map`** gets the behaviour from the start: select → frame
  own outline → draw children → card slot with an "Open" action; the hatch
  fill for claimed land; loading children per parent. Solon supplies data and
  labels. The Solon atlas PR (step 4) consumes the release; Solon does not
  build a local version first.
- **`@bitbaum/sitekit`** has no breadcrumb component (checked 2026-11-10);
  OrangeCat, kivvi and evig each hand-roll one, and Solon has two
  (`place-head.tsx`, `law/place-trail.tsx`). A `Breadcrumbs` goes into sitekit
  and Solon consumes it (step 5).
- **`@bitbaum/chartkit`** for sibling comparison.
- The place model stays in Solon; it is specific to governance.

## Invariants (tests)

- Every `LAW_AUTHORITIES` entry with a `place` resolves to exactly one current
  jurisdiction, so the second tree cannot drift again.
- A jurisdiction slug and an area slug cannot collide; every `place_paths` row
  has exactly one canonical path per target.
- No slug encodes a status term (the neutral-term scan of §7.2 covers paths).

## Ownership and order

#458 is open and owns `src/components/atlas/*`, `place-head.tsx`,
`place-profile.tsx`, `[...slug]/page.tsx`, `place-law.ts` and
`law/place/[key]/page.tsx`. **The atlas fix waits for #458 to land; there is no
competing fix on `main`.** The South Ossetia work (#484) owns South Ossetia's
data and the proposal and responsible-office fields on gaps.

| Step | PR | Visible result |
|---|---|---|
| 1 | This document | The plan, reviewable |
| 2 | `/places/by/{scheme}/{value}` and `/api/v1/places/atlas` | Stable links and JSON for any place |
| 3 | One law-count module, from the tables, each count labelled; callers rewired after #458 | The same number everywhere (QA 4) |
| 4 | `place_ancestors`; invariant: every law authority with a place resolves to one jurisdiction; names from the names table; Playwright check of the live Wyoming behaviour | Drift fails CI; the bug confirmed in a browser (QA 8) |
| 5 | `place_paths`, hyphenated roots, 308 at every depth | One URL per place (QA 6) |
| 6 | Regions above countries in the world pack; sitekit `Breadcrumbs` | A chain above the country (QA 7) |
| 7 | US `municipality` level and its import | Towns under counties (QA 5) |
| 8 | Sibling statistics loader, derived gaps, gaps on any scheme | Compare with siblings (QA 3) |
| 9 | Measure the busy page, then fix its cause | A page that settles (QA 9) |
| 10 | geo-kit select, frame, children, card and hatch; the atlas and every place page on it (after #458) | G's bug fixed; a map on every page (QA 1, 2, 10) |
| 11 | Disputed land: area pages, hatch, claim cards | South Ossetia, Western Sahara |
| 12 | Per-parent geometry | A world of places stays fast |

## Acceptance: QA 2026-11-10

A walk of the live site, screenshots kept outside the repo. Each item is a
generic criterion, never a per-country fix, and names the step that closes it.
Where a Playwright check on the live paths can state it, that check is part of
the step (a place is a parameter of the test, not a literal in it).

| # | Finding | Criterion | Step |
|---|---|---|---|
| 1 | `/places?in=us` zooms to Wyoming's counties and skips the state level; `?in=li` works | Opening any place frames that place's own outline, then its children; a parent with only some children drawn still frames the parent | 4 (after #458) |
| 2 | No place page has a map; focus exists only on `/places?in=` | Every place page has the focused map card (own area, children drawn and clickable) | API now (2); card 10 (after #458) |
| 3 | No place page has a statistics section | Every place page shows its own statistics and its position among siblings, or says which are missing | loader and API 8; card 10 |
| 4 | Law counts contradict: the list shows 3,748 for a country whose pages say 3,412 (3,412 national plus 336 communal); the list shows 745 for a country whose pages say "No texts yet"; the `/places` globe sidebar says 3,748 for Liechtenstein where every other place says 3,412 | One query module computes counts from the tables, and every count says what it counts: this place, or this place and everything within it | 3 (module now; callers after #458) |
| 5 | No town level under US counties | A `municipality` level per country pack, `part_of` its state with `overlaps` to the counties it lies in | 7 |
| 6 | `/places/united-states` redirects to `united_states`, but `/places/united-states/wyoming` is 404 | One canonical hyphenated scheme; every other form answers 308 to it at every depth | 5 |
| 7 | Breadcrumbs above country level show only "The world" | The chain continues above a country (continent, region, unions) from data in the world pack, rendered by the shared `Breadcrumbs` | 6 |
| 8 | A municipality page and its law row name the same place differently | Names come from the place's names table; a law authority's label resolves to the place's name and the publisher's own name stays an attributed name | #458 already adds `src/lib/law/authority-names.ts` (place name first, config label as fallback); no second module. Remaining: keep the publisher's name as an attributed `official_other` name |
| 9 | The globe has no labels, and the page stays busy for more than 30 s | Measure first (geometry size, blocking fetches, hydration), then fix the cause; labels from the shared map | 9 (measure), 10 (labels, after #458) |
| 10 | The search zoom barely moves | A search result selects and frames the place exactly as a click does | 10 (after #458) |

Reading of item 7, to be confirmed: the criterion is that nothing above a
country exists in the chain today. If the intent is only that the first crumb
is missing a link, step 6 is smaller.

### Checked in a real browser, 2026-11-10

Chromium against the live site (headless, one machine, one run each):

- `/places?in=us`: the camera frames only Wyoming's 23 counties and the US
  outline is gone, under a sidebar titled "United States". **Confirmed**; the
  diagnosis above stands. `/places?in=li` frames Liechtenstein's communes.
- Law counts in the sidebar: Liechtenstein reads "3,412 laws in force" and "336
  laws in force, counted separately"; the US reads "Nation: 0" and "Regions and
  communes: 745, counted separately". The sidebar was labelled after the QA
  walk (#481); place pages still say "No texts yet" for a place whose own law
  is zero and whose law within it is not. Step 3's module is what removes the
  difference for good.
- Busy time (QA 9): 56 requests, load at about 1 s, network idle at about 5 s,
  in a waterfall: session, globe data, place map data, geography manifest, the
  boundary file, one after the other (the boundary file arrives about 3.7 s in).
  A page busy for 30 s was **not reproduced** here; CPU work (hydration and the
  spinning globe) was not measured. Step 9 measures that before changing
  anything.
- The drill-down check (`tests/e2e/place-drill-down.spec.ts`, #495) passes live
  from the United States, Liechtenstein and Switzerland: each level opens,
  names itself and links back up.

## Not verified

- Hit-testing and zoom of the globe by hand (clicks): only the framing on
  load was seen in a browser.
- All world-scale counts above.
- geo-kit's internals (hit-testing when an admin-1 shape and a state shape
  overlap), and Natural Earth's disputed-areas layer.
