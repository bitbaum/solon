# Places: one source of truth for each fact

Status: the country registry is built (2026-11-09); every country as a place is the next step.

A fact about a place lives in exactly one place in the repository. Everything else reads it.

| Fact | The one source | Read by |
|---|---|---|
| Which countries exist, their ISO 3166-1 alpha-2, alpha-3 and numeric codes, where to label them | `src/lib/config/world/countries.json` through `countries.ts`, generated from Natural Earth admin 0 by `pnpm run geography:world` | the law globe (`config/law/globe.ts`), the statistics map (`config/statistics/world.ts`), the OECD sources (`config/places/sources.ts`), the atlas's country labels |
| A country's name | the reader's browser or server (`Intl.DisplayNames` on the alpha-2) | every page; no list of names is kept |
| The places Solon holds in depth (cantons, communes, counties), their identifiers, validity and boundaries | the Places database, filled by the importer from the country packs (`config/places/countries/`) | the place pages, the tax maps, the statistics (facts hang on these places) |
| Base-map subdivisions and towns everywhere else | `public/geography/world/` (Natural Earth admin 1, GeoNames cities1000), generated | the atlas only; never a place a fact hangs on |
| Which law authority is which country | the authority's `place` (`config/law/index.ts`) | the globe derives its outline from it; nothing repeats the code |
| A US state's outline id (FIPS) | `STATE_FEATURES` in `config/law/globe.ts` | the globe |

Tests hold it together: `src/lib/config/__tests__/countries.test.ts` fails when the law, a pack,
a source or a statistic names a country the registry lacks, or one the outlines cannot draw.

## Rules

- A new list of countries, codes or names anywhere else is a bug: read the registry.
- The base map's subdivisions and towns are a picture. A figure, a law or a decision is attached
  to a place in the Places database, which carries its identifiers and validity.
- Generated files are regenerated, never edited (`pnpm run geography:world`; `--check` compares).

## Next: every country a place

Statistics today hang only on the four countries with a pack. To chart a series for every OECD
member (or every country), the nation level of every country becomes a place, created from the
registry: a light pack per country (codes, currency, the `nation` level only) generated from the
registry rather than written by hand, so the registry stays the one list. The OECD and World Bank
sources then come from one template per series and the registry's codes, not a line per country.
Depth (subdivisions, tax) is added to a country only when Solon holds it, as today.

## Next: research with AI

The explanation on statistics, dimension and method pages answers only from the page's numbered
facts and is checked (`src/lib/statistics/explain.ts`). Deep research goes further: it reads the
publisher's own pages and the law Solon holds, through the tools the law assistant already uses
(`src/lib/law/ask/research.ts`), and writes a report whose every sentence cites a page it fetched.
A finding worth keeping becomes a curated record or a method entry, with its evidence words checked
weekly like every other (`statistics:verify`), and a second person's review where it is a judgement.
