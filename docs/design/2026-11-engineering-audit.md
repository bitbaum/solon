# Engineering audit, 2026-11-10

Asked: is there one source of truth for everything, and is the code a spaghetti bowl? This is
what was measured, what is good, what is debt, and the order to pay it in. Numbers are from the
repository on this date; rerun the commands to refresh them.

## What was measured

| Question | Command | Result |
|---|---|---|
| How big | `find src -name '*.ts*' -not -path '*__tests__*' \| xargs cat \| wc -l` | 486 files, about 66,700 lines, 141 test files |
| Copy-paste | `npx jscpd src --min-lines 20 --min-tokens 120` | 3 clones, 0.28% of lines duplicated |
| Import cycles | `pnpm run check:cycles` (madge) | 6 found, all fixed (below); now part of `verify` |
| Types, lint, formats | `pnpm run verify` | clean; 1 `eslint-disable` and no TODO or FIXME in `src` |
| Files over the 300-line limit for components | `wc -l` | 9 components (atlas 770, amend-form 466, then eight near 310 to 330) |

The six cycles were two clusters: the statistics page importing the panels it is made of, which
imported their translator type back from it, and the places profile and its source list the same.
Shared types now live in `components/statistics/shared.ts` and `components/places/translator.ts`.

## One source of truth, concept by concept

| Concept | The one source | Status |
|---|---|---|
| Navigation: which pages exist and how they group | `lib/site-config.ts` (`SITE_SECTIONS`), the header's panels (`MENU`) a subset of it, a test that enforces it | one list |
| A page's name and one-line description | `messages/*.json` `Site.links` and `Site.desc` | one list, but each page also sets its own `<title>` (debt 2) |
| Countries: codes, label points, outlines | `config/world/countries.ts`, generated from Natural Earth | one list (new, 2026-11-09) |
| Countries and territories: page slug, places outside the UN, who claims them | `config/world.ts` (hand-kept; codes and outlines read from the registry above, and `world.test.ts` holds the two to one list) | one list, two layers |
| Places held in depth, identifiers, validity, boundaries | the Places database, from the country packs | one list |
| Every country as a place | the `world` pack, generated from the country list | one list |
| Statistics: what a series is, its source, scope, plausible band | `config/places/metrics.ts` | one list, with a quality gate (`statistics:quality`) |
| Law authorities | `config/law/index.ts` (35 rows) | **second list of places** (debt 1) |
| Legal structures (company forms, trusts, foundations) | `config/structures.ts`, every fact quoting its provision | one list |
| Rankings and their methods | `config/statistics/methodologies.ts` | one list, pages checked weekly |
| What offices collect, and the gaps | `config/statistics/gaps.ts` | one list, pages checked weekly |
| Curated claims (law links, events, codings) | `statistic_records`, append-only, enforced by database triggers | one log |
| Licences accepted | `config/places/licences.ts` | one list, enforced before an importer runs |

## What is good

- Data is data: places, law authorities, series, methods, gaps and codings are configuration
  with schemas, and the pages are generic over them. Adding a country, a series or a method is
  an entry, not a page.
- Claims are traceable: a curated record or a structure fact carries the words it relies on, and
  a program fetches the cited pages every week and fails when a page stops saying them.
- Append-only where it matters: curated records, facts and audit events cannot be updated or
  deleted, by trigger.
- Copy-paste is almost absent (0.28%), cycles are now gated, and `verify` checks that the world
  pack's countries file holds exactly the countries no pack holds
  (`places:world-countries --check`, offline; corrected 2026-11-12: it was not run before).
  `geography:world --check` needs the Natural Earth and GeoNames downloads, so it is run by hand.

## Debt, in the order to pay it

1. **Law authorities were a second list of places.** Done 2026-11-10: pages name an authority by
   its place, read from Places in the reader's language (`src/lib/law/authority-names.ts`);
   a country with no place yet is named by `Intl`, the two authorities with no single place
   from messages, and two places of one name are told apart by their level. The config keeps an
   English `label` for logs, the API and prompts. Still to do: `within` and the level are
   hand-written where Places could supply them.
2. **A page's name is written twice**: in `Site.links` and again in each page's metadata. Target:
   the page's `generateMetadata` reads its `Site.links` entry.
3. **Translation coverage is uneven.** `/places`, `/compare`, `/structures` and `/statistics` are
   translated; most other pages show English and say so. The method descriptions, codings and
   gaps are English only.
4. **Large files.** `components/atlas/atlas.tsx` (770 lines) mixes country state, subdivisions,
   towns, tax layer and search and wants splitting into hooks; `lib/places/importer/run.ts`
   (1,028 lines) is one transaction and wants its steps separated; three config files exceed
   1,000 lines (`sources.ts`, `law/index.ts`, `metrics.ts`) and are data, to be split by pack
   or authority.
5. **AI quality is checked structurally, not by judgement.** Numbers, citations and verdict words
   are checked; whether the reasoning is sound is not, and no real model has been run against
   the checks yet.

## What Solon does not hold, so the map is honest

Corporate and company bylaws are not a corpus Solon collects. It holds the law of states,
cantons, communes and the EU, the legal forms a jurisdiction offers (structures), the statistics
and how they are made, and the governance profile of each organization that runs under Solon.
Network states, villages and towns are organizations (use cases under `/for/…`) or, where
a state recognises them, places.

## Navigation

The header had four panels and 27 links. It now has four panels (Law, Places, Data,
Governance) of four or five links each, and the whole map is one keystroke away: Find (the
button, Ctrl or Cmd + K, or "/") searches pages, statistics, places and laws together. The footer
and the mobile menu still list every page, the mobile menu as folds that open on the section
you are in.
