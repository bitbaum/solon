# Places: one source of truth for each fact

Status: the country registry and the world pack (every country as a place) are built (2026-11-09).

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

## Every country is a place

A `world` pack (`config/places/countries/world.ts`) holds the nation level of every registry
country no other pack holds, 235 of them, from `data/places/world/countries.json`, written by
`pnpm run places:world-countries` (`--check` in CI-style use) with names in five languages from
Unicode CLDR. Its sources are computed in `config/places/world.ts` and `sources.ts` from the
registry: the World Bank's indicators for every country, the OECD's tax series for the 38 members.
A country that gets a pack of its own leaves the world pack by regenerating the file; its sources
are re-pointed to its pack (`worldBankSource`/`oecdSource` take the pack as an argument).

Schedules are spread through the morning (the World Bank one country a minute, the OECD one every
five minutes): the OECD's SDMX API allows about 60 data requests an hour and answers the rest with
500. The importer names itself in its User-Agent, retries a server error five times with backoff and
paces the OECD six seconds between requests.

## Next: research with AI

The explanation on statistics, dimension and method pages answers only from the page's numbered
facts and is checked (`src/lib/statistics/explain.ts`). Deep research goes further: it reads the
publisher's own pages and the law Solon holds, through the tools the law assistant already uses
(`src/lib/law/ask/research.ts`), and writes a report whose every sentence cites a page it fetched.
A finding worth keeping becomes a curated record or a method entry, with its evidence words checked
weekly like every other (`statistics:verify`), and a second person's review where it is a judgement.
