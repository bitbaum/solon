# Places: every jurisdiction on one map, official and founded

_Created 2026-09-29. Status: accepted design; nothing here is built unless it says so._
_Last modified 2026-10-01: commune boundaries are imported: swisstopo's yearly swissBOUNDARIES3D edition becomes `areas` and `administers` assertions plus one content-addressed TopoJSON file, published through a geo-kit manifest (§4.4, §8.2, §8.3, §9.1); Solon gets a light theme beside the dark one (§9). Earlier, 2026-09-30: `/compare` covers six more cantons (Bern, Lucerne, Zug, Basel-Stadt, Appenzell Ausserrhoden, Jura), each matched to the federal calculator; every commune's multiplier from the calculator's export (§6.2, §8.2). Earlier the same day: place search ignores accents and spelled-out umlauts, and `/compare` shows amounts in the country's number formats (pack `region`, §9.2). Earlier the same day: `/compare` is built: up to four places side by side, the tax estimate computed in the browser from the facts each chain holds, the latest year whose figures are all published, and the pack's own words for the model (`taxLabels`, §5, §9.2). Earlier the same day: the postcode import leaves out the directory's Liechtenstein communes and two commune-free areas, and reports them (§8.2); any other unknown commune still fails the run. Earlier the same day: `/places` is built (search by name or postcode, browse by level) with its API, and Places took Platform's header slot (§9.2, §9.3). Earlier the same day: the scheduled runner is built, a daily box timer
calling `/api/cron/places` (§8.3). Earlier the same day: postcodes resolve to
the places they lie in, from swisstopo's directory (`place_postcodes`, §4.6,
§8.2). Earlier the same day: `/places/coverage` is built, counted from the
data (§9.2), and places pages count as translated; production holds every P1
source so far, reloaded after the fix below (§8.3). Earlier the same day: valid
time is half-open, and the adapters now store it so (§4); a year's figures
still hold on 31 December.
Earlier, 2026-09-29: tariffs and the canton's multiplier import from the
Federal Tax Administration and match its calculator (golden fixtures, §6.2,
§8.2); POST retrievals are stored as envelopes and planning may probe the
source (§8.3). Earlier the same day: the canton of Zürich's commune multipliers import
(§8.2), adapters may skip rows with a reason and date yearly figures by the
pack's fiscal year (§8.3); the Swiss structure is live, loaded as §8.3
describes. Earlier the same day: P1 begun — the Swiss pack's structure is built:
the FSO commune register (all cantons, mergers since 2021) and the City of
Zürich's quarters import through real adapters that `places:fetch` retrieves,
with adapter options in config and Swiss terms of use on the licence policy
(§5.2, §8.1–§8.3, §11). Earlier the same day: the `charter_city` kind built; P0 is built apart
from the Register organization, which needs George's signature (§3, §11).
Earlier the same day: the no-literals and neutral-copy guards built, map
tokens added upstream (§9.1, §12); the minimal place page built; the P0 acceptance
test now covers it (§9.2, §11). Earlier the same day: importer framework,
invariant engine and chain reader built, with Testland importing and
evaluating in CI (§8.3, §11). Earlier: P0 foundations built — the tables of §4 (what the
build settled is listed there), the config registries and their validation
(§5.1), and `places:sync-config`, which every import run calls first instead of
a deploy hook (§5.3). Config labels live with their entries (§3). Earlier the
same day: paths corrected to Solon's layout; the evaluator named
`@bitbaum/tax-model`, produced in OrangeCat and vendored here (§6.2, §11). Earlier: George decided §13 (the Register starts under
"One person decides", everyone else advises, §8.4; editorial policies are
Register decisions, §5.4), and the doc was rewritten for world coverage and zero
hardcoding (§1, §4–§7)._
_Companions: `2026-09-solon-plan.md` (the product), `2026-09-solon-constitution-engine.md`
(the governance engine). What Solon IS stays in its Loki project profile; this
file is the design behind one function of it and does not restate the vision._

## 0. The brief

Solon governs the groups people found. It should also **count the ones that
already exist**: every state, every subdivision, and every authority that
governs a place de facto whether or not others recognise it. People should be
able to see them, compare them, take part in them, and leave them, all from one
place, including moving from Zürich to Aargau for taxes, or to Dubai. People
should also be able to **found** new ones: Witikon as a quarter that runs its own
fund, Scythia as a community with no territory, a charter city that does not
exist yet. **Every jurisdiction is put to the test, and anyone can see the
result.**

Coverage starts with the Canton of Zürich, then Switzerland, and ends with the
whole world, including places whose status is disputed: Abkhazia, South Ossetia,
Transnistria, Northern Cyprus, Kosovo, Taiwan, Somaliland, Western Sahara,
Palestine. **None of them may need a line of special-case code.** If the model
cannot hold one of them as data, the model is wrong.

This is one function of Solon among several, not a pivot. The idea has a name
in Swiss political economy: FOCJ, **functional, overlapping, competing
jurisdictions** (Frey and Eichenberger, University of Zürich).

## 1. First principles

Every section below follows from these. A design choice that breaks one is a bug.

1. **Mechanism in code, policy in config, facts in data.** The engine knows how
   to store a place, walk a hierarchy, evaluate a tax model and render a map. It
   knows nothing about Switzerland, cantons, CHF or 1 January. A new country is
   a config pack and an importer, never an engine change (§5).
2. **One producer per fact.** Each fact is written in exactly one place; every
   other surface reads it (fleet `AGENTS.md`). Where a fact must also live in the
   database for integrity, the database table is a *projection* of the config,
   synced at deploy, never hand-edited (§5.3).
3. **Record assertions, not truths.** "Georgia claims this territory", "these
   authorities administer it", "Russia recognises that state": each is a dated,
   sourced assertion by someone. Solon stores who asserts what, since when,
   according to whom. It never asserts in its own voice who a territory
   belongs to (§7).
4. **An authority is not a territory.** A government, a municipality or a founded
   community is an *authority*. A piece of land is an *area*. Usually one
   authority administers one area and nobody disputes it (every Swiss
   municipality). The model must also hold two authorities claiming one area,
   one authority administering land it is not recognised for, and authorities
   with no area at all.
5. **Nothing without a source.** Every fact, relation and name that is not
   founded on Solon points at a source whose raw bytes are kept and hashed.
6. **Time is a dimension, not an update.** Places merge, split, are recognised
   and de-recognised; tax rates change yearly. Facts are **bitemporal**: *valid
   time* (the period it describes) and *record time* (when we learnt it). Nothing
   is deleted, so "what did Solon say about this on 1 March?" always has an answer.
7. **Identity has no meaning.** Internal ids are opaque. External codes (ISO,
   federal statistics numbers, Wikidata) are *identifiers of* a place, many per
   place, each with a scheme and validity. No place is assumed to have an ISO
   code: Abkhazia has none, and Kosovo uses one ISO never assigned.
8. **Neutral by construction, not by care.** Neutrality is enforced by the model
   (assertions with attribution), the naming policy (config), and copy rules
   (tested), not by hoping every writer is careful.
9. **Privacy by architecture.** Solon stores no residence and no income. Estimates
   run in the browser.
10. **No dead ends.** Missing data, an ended place, a destination without
    coverage: each shows what is known, its source, and a next step.
11. **A rule arrives with its guard.** Each principle above that can be checked
    mechanically has a CI check (§12). A principle without a guard erodes.

## 2. Terms

One glossary entry each (`glossary.ts`); the UI uses the plain word, `/technical`
the exact one.

| Plain word (UI) | Exact term | Meaning |
|---|---|---|
| **Place** | jurisdiction (authority) | A body with residents or members, rules and money: a state, a canton, a municipality, a de facto authority, a founded community. |
| **Area** | area | A piece of land with a boundary, as a dataset draws it. Authorities *claim* and *administer* areas. |
| **State authority** | origin `state` | Exists outside Solon: recognised or not, national or subnational. Solon mirrors it and never governs it. |
| **Founded** | origin `founded` | Founded on Solon; it IS a Solon organization. |
| **Planned** | origin `proposed` | Founded, and proposing a territory or status it does not have yet (a charter city before its host agrees). |
| **Recognised by** | `recognises` relation | A state's recognition of another, dated and sourced. Recognition is never a column; it is always counted from these relations. |
| **Takes tax** | derived (§6.3) | The authority has a current tax fact for the period. Derived, never a flag. |
| **Way to take part** | instrument | Popular vote, initiative, referendum, election, assembly, petition, consultation, contact, exit. |

**Why "part of" and "takes tax" are separate.** Witikon is part of the City of
Zürich (a statistical quarter in district 7, incorporated in 1934). The city takes
tax; Witikon does not. The civic split today treats every level as a tax level,
and that is the bug.

## 3. Where each kind of knowledge lives

This table is the "no hardcoding" rule in operational form.

| Kind | Examples | Lives in | Changed by |
|---|---|---|---|
| **Mechanism** | hierarchy walk, tax-model evaluator, importer framework, invariant engine, map renderer | code (`src/lib/places/`, the shared `@bitbaum/tax-model` package) | PR with tests; contains **no** country, level, currency or date literal (guarded, §12) |
| **Structure config** | country packs (levels, local names, identifier schemes, tax model shape, fiscal year, currency), source registry, metric catalog, instrument kinds, identifier-scheme registry, licence policy | `src/lib/config/places/**` as typed TS modules validated by Zod | PR reviewed by humans; anyone may contribute a pack |
| **Editorial policy** | naming policy for disputed places, aggregate threshold, which third-party indices appear, staleness rule | **Solon policies** of the Register organization (`policies` table, versioned, each version adopted by a Register decision) | a Register decision under its governance profile (§8.4); this is the engine doc's "rules as data, amended by the rules" |
| **Facts** | places, areas, names, identifiers, relations, recognitions, tax rates, instruments, ballots | database, written only by importers and register decisions | import runs; corrections by decision (§8.4) |
| **Personal data** | residence, civic split, income | OrangeCat (residence, split), the browser (income) | the person |
| **Copy** | every sentence of the UI | `messages/<locale>.json` | PR |

Labels of config entries (level names, metric and scheme labels) live **with the
entry**, keyed by BCP 47 locale, not in `messages/*.json`. A pack names its levels
in its country's languages, Romansh included, which are not the site's locales, and
contributing a country must not mean editing five message files.

**Ownership across the three planes.** Solon holds the public facts and the
registries. OrangeCat holds the person (residence, civic split) and the money
(funds of founded places, bound to Solon organizations through the existing
group binding). The shared vocabulary of collective kinds stays in
`@bitbaum/collective-kinds` and gains `charter_city` (built: package 0.2.0,
bitbaum/orangecat#1191, Solon migration `0011_charter_city_kind`; place-bound,
default profile "Elected delegates decide"). **Country-specific
structure does not go into that package**: a package holds mechanism and
cross-product vocabulary, and country packs are data about the world, served by
Solon's API.

## 4. Data model

Postgres database `solon` on bitbaum, Drizzle, following `schema.ts` conventions:
app-minted text ids, named constraints, append-only where history matters.

**Built (P0, migration `0010_places_foundations`, `src/lib/db/places-schema.ts`),
empty.** What the build settled beyond the text below:

- Valid time is `date` and half-open: `valid_from` is the first day a row
  holds, `valid_to` the first day it no longer does (null = start unknown,
  null = current). A row for the year 2025 runs `2025-01-01` to `2026-01-01`;
  an adapter whose source gives a last day stores the day after it. Every table that reports the world also carries `superseded_at`, so
  a correction supersedes a name, identifier, relation or area as it does a fact.
- Triggers refuse a `DELETE` on every Places table and any change of a
  jurisdiction's `origin`.
- `facts_one_current_per_key`: one current row per jurisdiction, metric,
  variant and `valid_from`, so "the current value" is never a choice.
- Relations need a source, except `located_in` and `federated_with`, which a
  founded place states about itself (`jurisdiction_relations_sourced`).
- A `corrected` fact names its decision (`corrected_by_proposal_id`).
- Two bookkeeping tables: `place_config_syncs` (§5.3) and `place_import_runs`
  (each run's counts, quarantined values and errors, §8.3).
- Levels are keyed per pack (`place_levels (pack_key, key)`), so two packs may
  both have a `municipality` level.
- Waiting for the phase that first needs them: `ballots` (P2),
  `organization_places` with `relation-roles.ts` (P3), and the replacement of
  `organizations.country_code / region / locality` (§4.8, P1).

### 4.1 `jurisdictions`: authorities

| Column | Rule |
|---|---|
| `id` | opaque text PK |
| `origin` | `state` \| `founded` \| `proposed` (CHECK from the tuple in code: a closed, mechanism-level list) |
| `country_pack` | text null, FK → `place_country_packs.key`. Which pack describes it; null for founded rows and for state authorities not yet covered by a pack (they still exist, from the world backbone, §8.2). |
| `level_key` | text null, FK → `place_levels.key` (e.g. the Swiss pack's `canton`). Never a literal in code. |
| `organization_id` | text null, unique, FK → `organizations`. **Required for founded and proposed rows, forbidden for state rows.** |
| `slug_path` | text unique null. State rows: a readable path built by the pack's slug rules, e.g. `switzerland/zurich/zurich/witikon`. It does not use ISO codes, since not every state has one. Null for founded rows, which live at `/orgs/{slug}`. |
| `valid_from`, `valid_to` | valid time; rows are never deleted |
| `recorded_at` | record time |

```ts
check("jurisdictions_origin_shape", sql`
  (origin = 'state' AND organization_id IS NULL AND slug_path IS NOT NULL)
  OR (origin IN ('founded','proposed') AND organization_id IS NOT NULL
      AND level_key IS NULL AND country_pack IS NULL AND slug_path IS NULL)
`)
```

A founded place's name, description and kind come from its organization, and
the jurisdiction row adds only what an organization lacks.

### 4.2 Names

`jurisdiction_names (jurisdiction_id, locale, script, name, name_type, used_by_id,
source_id, valid_from, valid_to)`

- `name_type`: `self` (what the authority calls itself), `official_other` (what
  another authority officially calls it), `common`, `historical`.
- `used_by_id`: which authority uses this name, when it is not the place's own.
  One place can be *Tskhinvali* in one authority's usage and *Tskhinval* in
  another's. Both are stored, attributed.
- `locale` is BCP 47, `script` is ISO 15924: Cyrillic, Georgian, Latin and Arabic
  forms of one name coexist.
- **Which name is shown** is decided by the Register's naming policy (§7.2), not
  by code and not by the importer.

### 4.3 Identifiers

`jurisdiction_identifiers (jurisdiction_id, scheme, value, valid_from, valid_to,
source_id)`, unique on `(scheme, value, valid_from)`.

Schemes come from the **identifier-scheme registry** (`src/lib/config/places/identifier-schemes.ts`):
key, label, validator pattern, URL template, and `reserved: true` for schemes
only a state authority can carry (ISO 3166, national statistics codes). The
registry is synced to `place_identifier_schemes` and FK-referenced. A trigger
refuses a reserved scheme on a founded or proposed row: the anti-impersonation
rule, enforced in the database. **Wikidata is the one scheme expected for
every state authority worldwide**, because it covers places ISO does not.

### 4.4 Areas and what authorities assert about them

- **`areas`** `(id, geometry_ref, source_id, valid_from, valid_to)`. `geometry_ref`
  names a feature in a versioned geometry asset (§9.1). The database holds no
  geometry.
- **`area_assertions`** `(id, jurisdiction_id, area_id, assertion, asserted_by_id,
  source_id, valid_from, valid_to)` with `assertion` ∈:
  - `claims`: the authority claims sovereignty or jurisdiction over the area;
  - `administers`: the authority exercises administration there in practice, as
    reported by the source;
  - `proposes`: a planned place proposes it (charter cities).

  `asserted_by_id` records **whose view** the row reports when a source reports a
  position (e.g. a state's legal designation of an area).

**Built (P1, communes)**: an import that draws areas writes each as an
`areas` row with one `administers` assertion by its place, and publishes the
file the rows point into (below, §9.1). `geometry_ref` is geo-kit's
`geo:v1:<source>:<edition>:<file sha256>:<feature>`, so a new edition, or a
change to how the file is simplified, supersedes the old rows and their
assertions together; a rerun of the same edition changes nothing. The source
states only who administers an area; `claims` wait for sources that report
them (P4).

For a Swiss municipality this is one area, one `claims`, one `administers`, same
authority. For a disputed territory it is one area with several `claims` and
whatever `administers` the sources report. §7 walks through it.

### 4.5 `jurisdiction_relations`: between authorities

| `relation` | Meaning | Rule |
|---|---|---|
| `part_of` | subdivision within one authority's own hierarchy | **exactly one current parent per child** (partial unique index). Holds even under dispute, because each authority's hierarchy is its own. |
| `overlaps` | e.g. a school municipality serving several municipalities | many |
| `succeeds` | mergers, splits, renamings with a new identity | many |
| `located_in` | a founded place inside a state place | many |
| `federated_with` | founded places forming a federation (engine doc §6) | many |
| `recognises` | diplomatic recognition of one state authority by another | many; dated; **withdrawal ends the row** (`valid_to`), it is not deleted |
| `member_of` | membership of an organisation of states (UN, EU, …) | many; the organisation is itself a jurisdiction row |

Every row carries `source_id`, `valid_from`, `valid_to`, `recorded_at`. Cycles in
`part_of` are rejected by the invariant engine (§8.3).

**Allowed relations per level pair** (a canton is part of a nation, not the reverse)
are declared in each country pack's level definitions (§5.2) and checked by the
invariant engine, not coded.

### 4.6 `facts` and `sources`

- **`sources`** `(id, source_key → registry, retrieved_at, url, content_sha256,
  snapshot_key, importer_version, licence_spdx)`. One row per retrieval; the raw
  bytes are kept under their hash.
- **`facts`** `(id, jurisdiction_id, metric_key → place_metrics, variant,
  valid_from, valid_to, value_numeric, value_json, unit, currency, source_id NOT
  NULL, method, recorded_at, superseded_at)`.
  - Metrics come from `src/lib/config/places/metrics.ts` (label key, unit, value type,
    definition, schema of `value_json`), synced and FK-referenced.
  - `currency` is ISO 4217, per fact. **No currency is assumed anywhere.**
    Cross-currency comparison converts with sourced, dated exchange-rate facts,
    and says so.
  - Bitemporal: the "current" view takes the newest `recorded_at` per key whose
    `superseded_at` is null. A correction supersedes and never overwrites.
  - `method`: `imported`, `derived` (names its inputs), `corrected` (names the
    decision).
- **`place_postcodes`** `(id, pack_key → place_country_packs, postcode,
  locality, jurisdiction_id, share, source_id NOT NULL, valid_from, valid_to,
  recorded_at, superseded_at)`. **Built** (migration `0012_place_postcodes`).
  One row per postcode locality and place it lies in, so one postcode can
  return several places; `share` is the part of the locality's addresses in
  the place, as the source states it. A pack's `postcodePattern` says what a
  postcode looks like there; a pack without one takes no postcodes. Written by
  importers per source, like relations: what a source no longer states is
  superseded. `resolvePostcode` (`src/lib/places/postcodes.ts`) answers
  "which places, on this day", the largest share first.

### 4.7 `instruments` and `ballots`

`instruments (id, jurisdiction_id, kind → instrument-kind registry, eligibility
jsonb, requirements jsonb, how_key, official_url, source_id, valid_from, valid_to)`.
Kinds, and the JSON schemas of `eligibility` and `requirements`, live in
`src/lib/config/places/instrument-kinds.ts`. All thresholds are data: a federal initiative's
signature count and window are a row, not a constant.

**Founded places store no instruments.** They are derived from the
organization's governance profile / charter by `lib/places/instruments.ts`, so a
state and a founded place are compared from each one's single source.

`ballots (id, jurisdiction_id, instrument_id, vote_date, title_key|title, official_url,
source_id, status)`: scheduled popular votes (P2).

### 4.8 Organizations about a place, and changes to existing tables

- `organization_places (organization_id, jurisdiction_id, role)`, with roles from
  config (`civic_group`, `association`, `watchdog`, …). A Quartierverein is
  *about* a place without claiming to be it.
- `organizations.country_code / region / locality` (free text, #200) is replaced
  by `jurisdiction_id`. The steps: add → backfill by identifier or exact name →
  **founders confirm the rest, no fuzzy merge** → switch the place-bound CHECK →
  drop the text columns. One migration per step.

### 4.9 Scale

The world backbone is a few hundred state authorities with their first-level
subdivisions, a few thousand rows. Switzerland in depth adds about 2,100
municipalities and their parishes, school municipalities and quarters. Every
country covered in depth adds its own. Hundreds of thousands of rows with
history is comfortable for Postgres with btree indexes on
`(jurisdiction_id, metric_key, valid_from)`, `(scheme, value)` and
`(from_id, relation)`. Chains are one recursive CTE, cached per place and
invalidated by import runs.

## 5. Config architecture

### 5.1 Layout

```
src/lib/config/places/
  index.ts                  assembles the registries into `placesConfig`, validated at load
  schema.ts                 Zod schemas for everything below — the contract
  countries/
    index.ts                the list of packs (empty until P1)
    switzerland.ts          one pack per country; file name = pack key
    …
  sources.ts                source registry
  metrics.ts                metric catalog
  instrument-kinds.ts       instrument kinds and their JSON schemas
  identifier-schemes.ts     identifier schemes, with `reserved`
  licences.ts               licence policy: SPDX ids allowed, and what each obliges
  relation-roles.ts         organization_places roles (P3)
```

Every module `satisfies` its schema's input type: typed at compile time,
validated at load (`definePlacesConfig` parses with Zod, then
`placesConfigProblems` checks what refers to what), tested in CI. Engine code
takes a `PlacesConfig` as a parameter instead of importing `placesConfig`, so a
test can hand it a made-up country. **Built in P0**, with every registry empty
except the licence policy of §13 (`CC0-1.0`, `PDDL-1.0`, `CC-BY-4.0`).

### 5.2 A country pack

A pack is the whole of what the engine knows about one country's *structure*.
Its *facts* come from importers. The Swiss pack, abbreviated:

```ts
export const switzerland = {
  key: "switzerland",
  names: { de: "Schweiz", fr: "Suisse", it: "Svizzera", rm: "Svizra", en: "Switzerland" },
  currency: "CHF",
  fiscalYear: { startMonthDay: "01-01" },
  defaultLocales: ["de", "fr", "it", "rm"],
  slug: { strategy: "official-name", transliterate: true },
  levels: [
    { key: "nation",        parent: null,           names: { de: "Bund", fr: "Confédération", … } },
    { key: "canton",        parent: "nation",       names: { de: "Kanton", fr: "canton", … } },
    { key: "district",      parent: "canton",       names: { … } },
    { key: "municipality",  parent: "district",     names: { … } },
    { key: "church_municipality", overlaps: "municipality", names: { … } },
    { key: "school_municipality", overlaps: "municipality", names: { … } },
    { key: "city_district",       parent: "municipality", coverage: "partial", names: { … } },
    { key: "statistical_quarter", parent: "city_district", coverage: "partial", names: { … } },
  ],
  identifierSchemes: ["bfs_municipality", "bfs_district", "zurich_city_quarter"],
  sources: ["bfs-municipality-register", "swisstopo-localities", "zh-tax-multipliers", "estv-tariffs", …],
  taxModel: switzerlandIncomeTax,                    // §6.1, from ./switzerland.tax.ts
  instrumentKinds: ["popular_vote", "initiative", "referendum"],
} satisfies CountryPackInput;
```

The country's own identifiers (Wikidata, ISO 3166) are not in the pack: they are
data on its root jurisdiction, imported with a source like every identifier.

Nothing in that block is read by name anywhere in `src/`. The engine iterates
`levels`, resolves `parent`, looks up `names` for the reader's locale, and hands
`taxModel` to the evaluator.

**Built (P1)**: `src/lib/config/places/countries/switzerland.ts`. It differs from
the sketch in three ways. The levels stop at what P1 imports (nation, canton,
district, municipality, and the City of Zürich's districts and statistical
quarters as `partial`); parishes and school communities come with P2. The
income-tax model has no church component for the same reason. And the
nation has no identifier source yet, so the commune-register source creates
the root and states its ISO code, set in that source's options; a later
world source matches it by that code.

### 5.3 Config → database projection

Registries that facts FK-reference (`place_country_packs`, `place_levels`,
`place_metrics`, `place_identifier_schemes`, `place_instrument_kinds`) are
**projections** of config, written by an idempotent `pnpm run places:sync-config`
(`src/lib/places/sync-config.ts`, built in P0). **Every import run syncs first,
inside its own transaction**, so the registries always exist before anything
references them and deploy needs no extra step (the fleet's deploy applies
migrations and has no pre-start hook). CI runs it with `--check` on a freshly
migrated database. The sync:

- inserts new keys and updates labels;
- **refuses to remove a key still referenced** by any data, naming it. A key
  that vanished from config and that nothing uses is marked retired, never
  deleted; config can also retire a key explicitly (`retired: true`);
- refuses changes the data cannot survive: a metric's value type once facts hold
  it, or making a scheme reserved that a founded place already carries;
- writes an audit row (`place_config_syncs`) with the config's hash and git SHA.

So the database enforces integrity (FKs), config stays the single producer, and
adding a country needs no migration.

### 5.4 Settings that are policy, not structure

The aggregate threshold, the compare-column limit, the staleness rule, the
naming policy and the third-party-index list are **Register policies** (§8.4):
versioned in the `policies` table, each version adopted by a Register decision,
read at runtime. Their initial values are in §13, not written into code.

## 6. Tax: a declarative model and a pure evaluator

### 6.1 The model

A country's tax formula is **data in its pack**. The Swiss income tax, as data:

```ts
export const switzerlandIncomeTax = {
  schemaVersion: 1,
  base: "taxable_income",
  components: [
    { key: "federal", tariff: { level: "nation", metric: "tax.income.tariff" } },
    {
      key: "cantonal_and_communal",
      tariff: { level: "canton", metric: "tax.income.tariff.basic" },
      multipliers: [
        { level: "canton", metric: "tax.multiplier" },
        { level: "municipality", metric: "tax.multiplier" },
        { level: "school_municipality", metric: "tax.multiplier", optional: true },
        { level: "church_municipality", metric: "tax.multiplier", when: "church_member" },
      ],
    },
  ],
  variants: ["single", "married"],   // which tariff variant applies
  inputs: ["taxable_income", "church_member"],
} as const satisfies TaxModel;
```

The schema covers progressive tariffs, flat rates, multipliers summed across
levels, conditional components, and caps. Deductions and social contributions
are later schema versions (`TaxModel` carries a `schemaVersion`). A country with a
different structure is a different model, not a code branch.

### 6.2 The evaluator

A small **pure** function, `evaluate(model, facts, input) → { components[],
total, effectiveRate, currency, complete, missing[] }`. It has no I/O, is
deterministic, and runs in the browser, so the income never leaves the device.
A missing required fact is never guessed: the estimate comes back incomplete
and names it in `missing`. OrangeCat (finances, civic split) and Solon (map,
compare, move planner) both need it, which is the fleet's test for a shared
package (decision §13). It is `@bitbaum/tax-model`: produced in
`orangecat/packages/tax-model`, with no dependencies, and copied byte for byte
into Solon under a drift check, the way `@bitbaum/collective-kinds` is shared. Its tests
are **golden fixtures per pack**: sample incomes, the official calculator's
output for them, and the source and date the output was captured from. The
evaluator is correct when it reproduces them within a stated tolerance.

**Built (P1)**: the Swiss golden fixtures are the Federal Tax Administration's
calculator for 2025 at CHF 100,000 taxable income without church tax: the City
of Zürich and Küsnacht, single and married, captured 2026-09-29. Imported
tariffs and multipliers reproduce them through the real chain within the
calculator's rounding to the franc (`switzerland.integration.test.ts`). What
schema version 1 cannot express yet, measured:

- Zürich's Personalsteuer (CHF 24 a person): no fixed amounts. Left out of the
  fixtures, and named in them.
- The federal tariff's top: above CHF 793,400 the tax is 11.5% of the whole
  income, which marginal brackets can only approximate; they overstate it by a
  constant CHF 1.40 there.
- Tariffs that divide a couple's income (splitting, in other cantons): the
  importer skips them with that reason instead of importing a wrong tariff.
- The model's `single` is a single person without children; ZH taxes single
  parents on the married tariff, which the model does not ask about yet.

**Built (P2, first cantons)**: a canton joins when the model reproduces the
calculator for it, measured 2026-09-30 at CHF 60,000, 100,000 and 250,000,
single and married, for two communes each (one for Basel-Stadt's city plus
Riehen), for 2025 and 2026: Bern, Lucerne, Zug, Basel-Stadt, Appenzell
Ausserrhoden and Jura match to the franc (108 cases), and Biel/Bienne is a
golden fixture through the real chain. Basel-Stadt's city has no commune tax
of its own; the calculator splits the canton's 100% into 50% canton and 50%
commune, and Solon records it as published. Lucerne's CHF 50 per-head tax is
left out like Zürich's. Not yet:

- Ticino: same shape, but its basic tax differs from the calculator's by
  CHF 25–50, so it waits until the difference is understood.
- Aargau, St. Gallen, Solothurn, Thurgau, Graubünden, Glarus, Schaffhausen,
  Nidwalden, Appenzell Innerrhoden, Geneva, Neuchâtel, Fribourg (married),
  Vaud and Schwyz: splitting or a family quotient, a later schema version.
- Basel-Landschaft (a formula), Uri and Obwalden (flat tax), Valais and Schwyz
  (separate commune tariffs): table types not read yet.

### 6.3 "Takes tax" is derived

An authority takes income tax in a period exactly when a model component
references its level and it has a current fact for that metric and period. The
Witikon quarter's level appears in no component, so it takes no tax. When a
school municipality merges into its political municipality, its facts end and
every chain updates itself. Nothing to edit.

## 7. Disputed, partially recognised and de facto places

### 7.1 How the model holds them: Abkhazia, worked through

Illustrative. The actual rows come only from sources.

- **Authorities** (all `origin: state`): Georgia; Georgia's own administrative
  unit for the territory, `part_of` Georgia; the Republic of Abkhazia, a
  top-level authority with its own `part_of` hierarchy of districts. Two
  authorities, two hierarchies, one area.
- **Area**: the territory, drawn by the geometry dataset.
- **Assertions**: Georgia's unit `claims` the area; the Republic of Abkhazia
  `claims` the area and, per the cited source, `administers` it.
- **Recognition**: `recognises` rows from each state that recognises the Republic
  of Abkhazia, each dated and sourced. Recognitions that were later withdrawn
  (it has happened) are rows with an end date.
- **Page, in Solon's voice**: "Claimed by Georgia and by the Republic of Abkhazia.
  Administered by the Republic of Abkhazia, according to [source]. Recognised by
  N of 193 UN member states ([source], as of [date])." Every noun is a link;
  every clause is a row.

South Ossetia, Transnistria and Northern Cyprus take the same shape. Kosovo and
Taiwan differ only in the data: more recognitions, different memberships,
different identifier schemes. Western Sahara exercises areas with several
claimants and split administration. Palestine exercises `member_of` with an
observer status. **An acceptance test (§11, P4) builds each of these from
fixtures and fails if any needs code outside the generic model.**

### 7.2 Names, maps and words

- **Naming policy is a Register policy**, not code. The proposed initial policy:
  on a place's own page, its self-name comes first; names others use are listed
  below with who uses them. Lists and maps use the self-name plus, in
  parentheses, the name most common in the reader's locale when it differs.
- **Maps take no side.** An area with more than one current `claims`, or where the
  administering authority is not the only claimant, is drawn with a hatched fill
  and a legend: "Claimed by … and …; administered by …". There is no default
  point of view and no choice of whose borders are "real". The geometry dataset
  must support this (§9.1).
- **Solon's own words are neutral, and a test checks them.** Copy for these places
  uses only relation language (claims, administers, recognises). Words that take a
  side (occupied, breakaway, puppet, liberated, and their counterparts) may appear
  only **inside quotations attributed to a source**. A copy test scans
  `messages/*.json` for a configurable term list (§12).

### 7.3 Money and sanctions

Place pages are information. **Money is different.** OrangeCat contributions to a
fund bound to a place in, or controlled from, a sanctioned area must respect
applicable sanctions law (Swiss SECO first, since the operator is in Switzerland).
Sanctions lists are **data**: imported from the official publishers, sourced and
dated, like every other fact. OrangeCat's giving flow checks them before money
moves, and a refusal says why and where the list comes from. Nothing
about this is hardcoded per country. SECO's lists apply first; UN and EU lists
follow once legal advice confirms them (decided, §13).

## 8. Data sources and import

### 8.1 Licence policy first

`src/lib/config/places/licences.ts` lists the SPDX licences the register accepts and
what each obliges (attribution text, share-alike scope). **An importer whose
source licence is not on the list does not run.** The policy matters because
the obvious world datasets differ: some are public domain or CC0, some CC BY
(attribution), some share-alike (ODbL: a derived *database* must be shared under
the same terms), some non-commercial (excluded). No share-alike source in
P1–P4 (decided, §13).

**Built (P1)**: Swiss public bodies publish under terms of use, not licences,
because raw data is mostly not protected by copyright in Switzerland. The
policy lists them as `LicenseRef-` entries, each the equivalent of a class the
decision admits: `LicenseRef-opendata-swiss-open` (opendata.swiss "Open use",
citing recommended; public-domain-like), `LicenseRef-opendata-swiss-by` ("Open
use. Must provide the source."; CC BY's obligation), and
`LicenseRef-ch-official-act` (official acts, decisions and their figures, such
as tariffs and multipliers, which Art. 5 URG leaves unprotected). The
Register can narrow this by decision like any editorial policy.

### 8.2 Sources, by publisher

Each importer's first task is to **confirm access path, format and licence**
and record them. This document names datasets. It does not assert URLs or
licence terms; those are verified at import time and recorded in the registry.

| Scope | What | Publisher / dataset |
|---|---|---|
| **World backbone** | existence of states and de facto authorities, names in many languages and scripts, hierarchy, recognitions and memberships, with references | Wikidata (identifiers and references; each imported statement keeps its reference) |
| World | boundaries, including disputed-area handling | a boundary dataset chosen under the licence policy: candidates are Natural Earth (which publishes disputed areas and point-of-view variants) and geoBoundaries |
| World | UN membership | the UN's own member-state list |
| World | tax, where available | OECD tax database for its members; national tax authorities per pack |
| World | sanctions | SECO, and others per §7.3 |
| Switzerland | municipalities, districts, cantons, every merger with its date | Federal Statistical Office: official municipality register with mutation history |
| Switzerland | postcode → municipality (**one postcode may span several**) | swisstopo: official directory of localities with postcodes |
| Switzerland | boundaries | swisstopo swissBOUNDARIES3D; City of Zürich open data for districts and statistical quarters |
| Switzerland | tax multipliers and tariffs | Canton of Zürich Statistical Office (P1); Federal Tax Administration (ESTV) and cantonal publications (P2) |
| Switzerland | popular votes, ways to take part | Federal Statistical Office vote data; Federal Constitution and federal political-rights law; cantonal constitutions and laws |

The source registry holds each as an entry (key, publisher, dataset, homepage,
licence SPDX, attribution key, cadence as a cron expression, adapter module,
packs served). Cadence is config, so the scheduler reads it and no job has a
hardcoded date.

**Built (P1)**, each confirmed on 2026-09-29 and recorded in
`src/lib/config/places/sources.ts`:

| Source key | What | Access | Terms |
|---|---|---|---|
| `bfs-communes-snapshot` | every canton, district and commune valid on a date, with validity and parent | FSO register API, CSV, no key | opendata.swiss open |
| `bfs-communes-mutations` | mergers between two dates | same API | opendata.swiss open |
| `zurich-statistical-quarters` | the City of Zürich's 12 districts and 34 quarters | the city's WFS, GeoJSON | CC0 |
| `zurich-municipal-multipliers` | each Zürich commune's multiplier per year, without church tax, read from 2021 | Office for Statistics and Data, CSV | opendata.swiss "by" |
| `estv-income-tax-scales` | the federal tariff and the basic tariff of each modelled canton (Zürich, Bern, Lucerne, Zug, Basel-Stadt, Appenzell Ausserrhoden, Jura), single and married, per year since 2021 | the Federal Tax Administration's tax-calculator export, POST | official act (Art. 5 URG) |
| `estv-canton-multipliers` | each modelled canton's own multiplier per year since 2021 | the same calculator's multiplier export, POST | official act (Art. 5 URG) |
| `estv-commune-multipliers` | each commune's multiplier per year since 2021, for the modelled cantons except Zürich; confirmed 2026-09-30 | the same export for group 30, every Swiss commune by its FSO number | official act (Art. 5 URG) |
| `swisstopo-commune-boundaries` | every commune's territory, from the latest swissBOUNDARIES3D edition begun (yearly on 1 January, plus mid-year editions for mergers such as 2025-04-06); confirmed 2026-09-30. The layer also holds cantons' lake areas, Liechtenstein and the foreign enclaves, which the source's `where` leaves out; 2,110 communes in 2026-01 | the federal geodata STAC catalogue, zipped Shapefile in LV95 (`shapefile_areas`: snapped to 25 m as read, reprojected to WGS84, one topology keeping 5 % of the points, about 220 KB gzipped) | swisstopo OGD: free use, name the source |
| `swisstopo-postcode-localities` | every postcode locality, the commune it lies in and its share of the locality's addresses (1,223 of 3,190 postcodes span several communes); confirmed 2026-09-30. The directory also lists Liechtenstein's 11 communes (no canton) and two commune-free areas (BFS 2391 Staatswald Galm, 5391 Comunanza Cadenazzo/Monteceneri); `skipWhen` leaves those 22 rows out and the run reports them | the federal geodata catalogue, zipped semicolon CSV (`csv_postcodes`) | swisstopo OGD: free use, name the source |

The calculator's exports answer for years it has not published with another
year's figures (asked on 2026-09-29, "2027" gave the canton a 98% multiplier
and "2030" 95%). Its adapter therefore asks the calculator's published year
range before planning and never requests a year beyond it.

A Zürich commune whose school communities levy different rates (Uster and
Turbenthal today; 16 commune-years since 2021) has no single multiplier: which
one applies depends on the address. The importer leaves those rows out and
lists them in the run's report until the postcode resolver can tell the
addresses apart. The Federal Tax Administration's figures differ from the
canton's for at least one commune (Aeugst am Albis 2025: 90 against 92); the
canton publishes its communes' own decisions, so its figures are the ones used.
The calculator's export for every commune shows one rate for Uster and
Turbenthal without saying there are two, so it is read only for cantons whose
communes levy one rate; the modelled cantons are listed once
(`MODELLED_CANTONS` in `sources.ts`) and shared by the three ESTV sources.

Found for the next step: the city's address register with postcode, quarter
and parishes per address (CC0), which gives postcode → quarter with shares.

### 8.3 The importer framework

One framework, one adapter per source. The framework owns everything the
adapters must not reimplement:

1. **Fetch and snapshot**: raw bytes stored under their sha256, a `sources` row.
2. **Parse** with the adapter's Zod schema. A format change fails loudly.
3. **Map** to the generic shapes (jurisdictions, names, identifiers, areas,
   assertions, relations, facts), keyed by external identifiers, never names.
4. **Diff** against current state. `--dry-run` prints it; CI dry-runs every
   adapter against fixture snapshots.
5. **Apply** in one transaction: insert, end (`valid_to`), supersede. **No deletes.**
6. **Invariants**, generic and parameterised by the packs, checked before commit:
   - every row at a level has exactly one current `part_of` parent at the
     pack-declared parent level;
   - no `part_of` cycles;
   - every fact validates against its metric's schema and has a source;
   - tariff brackets ascend and rates stay in [0, 1];
   - values outside a metric's declared plausible band are **quarantined and
     reported**, not published.

   Any failure aborts the run.

A failed run alerts through Loki's cron runner. Stale data is shown as stale.

**Built (P0)**: `src/lib/places/importer/` (`run.ts` the steps above,
`batch.ts` the generic shapes, `validate.ts` the config checks and quarantine,
`snapshots.ts` the sha256 store), `src/lib/places/invariants.ts`, adapters in
`src/lib/places/adapters/` (the `fixture` adapter reads the generic shapes
as-is, so a batch can be written by hand and reviewed), and
`pnpm run places:import <source-key> <file> [--dry-run] [--url=…]`, which
prints the report and exits 1 on a failed run. What the build settled:

- Every run is a row in `place_import_runs`, failed ones included, with its
  counts, quarantined values and problems. A dry run does the whole
  transaction, invariants included, and rolls it back, so its diff is exact.
- The run syncs the config registries inside its own transaction (§5.3) and
  records the retrieval in `sources` only if it applies.
- A source speaks for itself: names, identifiers and relations it stated
  before and no longer states are superseded; what other sources said is left
  alone. Facts are per period: an omitted period stands, a changed value
  supersedes. Current state places the source knew and no longer mentions are
  **reported** (`missingFromSource`), never ended: only a source saying so can
  end a place.
- A new place's `slug_path` is fixed when it is first recorded (pack key for
  the root level, then one segment per `part_of` step from its own name;
  overlapping places sit directly under the pack key), so links hold through
  renamings. A clash gets the identifier appended.
- The invariants run over the pack's whole current hierarchy, not just the
  batch.
- Snapshots live in `PLACES_SNAPSHOT_DIR` (default `./data/snapshots`, key
  `ab/<sha256>`).
- `src/lib/places/chain.ts` reads it back: a place's chain on a date (itself,
  its `part_of` ancestors, the overlapping places over any of them), the
  chain's current facts, and those facts in the evaluator's terms. Whether a
  level takes tax is `taxingLevels` over them, from the model, not a flag.

**Built (P1)**: fetching. An adapter may declare `retrievals(options, today)`,
what a scheduled run fetches, which must change nothing when rerun on an
unchanged source, and `backfill`, older states loaded once when a source is
first loaded (never by schedule, since an older state imported after a newer
one restates the past). `pnpm run places:fetch <source-key> [--backfill]
[--dry-run] [--plan]` fetches them in order and imports each; the first failed
run stops the rest. What the first real adapters settled:

- **Adapters parse formats and name no country.** Which levels, schemes and
  parts of a source its rows become is the source's `options` in config,
  checked by the adapter's own schema at run time and by a unit test for every
  registered source. The no-literals guard covers the adapters too.
- A source may state relations of places it does not list (a register of
  mergers); those relations are diffed like any other the source states.
- An ended place is filed under the last parent it had. When an ended place
  and a current one share a name, the one recorded first keeps the plain path,
  so a backfill imports today's state first.
- Measured on the full register: the backfill (today, then one snapshot a year
  since 2021) takes about 25 seconds on a laptop; a rerun changes nothing.
- An adapter may leave a row out on purpose (a figure that does not apply to
  the whole place); it names the row and the reason, and the run's report
  lists them under `skipped`. Anything else it cannot read fails the run.
- Figures published per year become facts over the pack's fiscal year
  (`fiscalYear.startMonthDay`), so no adapter assumes years start in January.
- A request may carry a body; it is sent as a JSON POST, and the snapshot is an
  envelope holding the request with the response text, as a web archive stores
  them (`importer/envelope.ts`). The response to such a request often does not
  say what was asked (a tariff export does not name its year), so the snapshot
  alone must be enough to import it again. `sources.url` keeps the endpoint.
- Planning may ask the source first (`probe`: the framework makes the request,
  the adapter reads the answer), for sources whose published range is not a
  date rule.

**In production, a first load or a backfill**: the deployed app is a
standalone bundle without the scripts, so a load runs from a checkout of the
deployed commit on the box, as the app's user, against the box's database,
with snapshots under `/opt/solon/shared/places-snapshots`, first with
`--plan` and `--dry-run`. The Swiss structure was loaded this way on
2026-09-29 at `b7027f1`, and reproduced the local load exactly. All six Swiss
sources were reloaded on 2026-09-30 at `5877485`, which superseded the
inclusive end dates (978 facts, 125 place updates) without deleting a row.

**The scheduled runner** (built 2026-09-30): the box's appcron timer
(`appcron-solon-places`, registered in Loki's `install-app-crons.sh`) calls
`POST /api/cron/places` once a day with the app's `CRON_SECRET`. The route
fetches and imports every source whose cadence names that day
(`src/lib/places/schedule.ts` reads the day fields; the timer owns the hour), in
registry order, with snapshots under `PLACES_SNAPSHOT_DIR`. A failed run answers
500, which fires the timer's failure alert. `?source=<key>` runs one source now.
It calls no model. Backfills stay manual, from a checkout.

**Areas and their file** (built 2026-10-01): a batch may carry `areas` and one
`geometry` (level, edition, TopoJSON text). The check refuses areas without a
file, a file without a collection named after the level, and areas naming a
feature the file lacks or naming one twice. The run stores the file under its
sha256 in `PLACES_SNAPSHOT_DIR/geometry/` before the transaction (written
aside and renamed, so a reader never sees half a file), then diffs the areas
as above (§4.4). A retrieval may say when its state begins (`validFrom`,
read from the catalogue's edition date); areas take it as their valid-from.

Not yet: disputed areas and several viewpoints (P4), and CI dry-runs of real
adapters against live sources (CI imports cuts of the real retrievals
instead).

The cross-application geometry contract and pure validators live in the public
`@bitbaum/geo-kit` package, pinned by immutable commit in Solon, Substrata and
OrangeCat. Solon's `geojson_tiers` adapter now validates present GeoJSON
structure and WGS84 coordinates before mapping the jurisdiction hierarchy;
sources with no geometry remain supported. The commune boundaries above are
persisted and published (§9.1); the world backbone and disputed areas remain
P4. Private residence coordinates stay in OrangeCat and are never sent to
Solon.

### 8.4 Corrections and editorial policy: the Register

Wrong data is fixed by a decision, not an edit. A **Register** organization on
Solon decides corrections (effect `register.correct`, engine doc §2.2: appends a
`corrected` fact or relation citing the decision) and owns the editorial
policies of §5.4. Anyone may propose, with a source. This dogfoods the engine on
public, low-stakes, real questions, and makes Solon's own editorial choices
visible and contestable.

**Who decides (decided 2026-09-29).** The Register is founded under the existing
"One person decides" profile (`SOLE`), with George as founder and only mandate
holder. Its organization page says so, as it does for every `SOLE`
organization. Everyone else proposes and advises, including through **advisory
votes** (engine doc §2.5): members cast ballots that do not bind, the tally is
published beside the decision, and the decision records whether it followed the
tally. Advisory votes are not built yet. Until they are, members advise by
proposing. Moving the Register to a shared profile later is one `profile`
decision taken under `SOLE`, which the engine already supports.

## 9. Product and UX

The plan of record's rules hold, with one change: Solon gets a light theme
beside the dark one (decided 2026-09-30, with the map; both from the shared
tokens). Shared tokens, sans headlines, three
depths, every sentence in `messages/*.json`, Swiss German spelling, no
concatenated sentences, no dead ends.

### 9.1 Map and list

- **Every map has a list** with the same data, sortable and keyboard navigable.
  On phones the list comes first and the map is a tab.
- Geometry is built into simplified TopoJSON per level and dataset version,
  keyed by `geometry_ref`, served as versioned static assets. Disputed areas get
  their own features so they can be hatched (§7.2).

  **Built (P1, communes)**: `GET /api/v1/places/geography` is a
  `@bitbaum/geo-kit` manifest (schema 1) of every file a current area points
  into: its source, level, edition, validity, size, bounds and sha256, which
  the map checks before drawing. `GET /api/v1/places/geography/{sha256}.topojson`
  serves the file itself as immutable (cached a year; the name is the
  content). The Swiss communes are one file of about 220 KB gzipped. Not yet:
  the map itself, lakes and canton outlines, earlier editions.
- The colour scale and the hatch pattern are **tokens** in `@fleet/design-tokens`,
  colour-blind safe. Colour is never the only carrier. (Built:
  bitbaum/design-tokens#31 adds `--map-scale-1…7` (viridis, luminance rising at
  every step, pinned by a test), `--map-no-data`, `--map-boundary` and the
  hatch geometry. Solon takes them with the package release that carries them,
  when the map is built in P1.)
- **World scale needs RTL and many scripts**: layout uses logical CSS properties
  (`margin-inline-start`, not `margin-left`), fonts cover the scripts the names
  table contains, and locale data (plural rules, number and date formats,
  display names of languages and currencies) comes from CLDR through `Intl`,
  never a hand-kept table.

### 9.2 Screens

The screens are those of the first version of this document, now generic:

- **`/places`**: map and list, opening on the reader's chain (from OrangeCat)
  or the widest covered scope. One metric at a time from the catalog, with the
  definition, period and source in the legend. The "tax for an income of __"
  metric is computed in the browser. Search by name, postcode or identifier; a
  postcode spanning several places asks. Founded places toggle on.

  **Built (P1, list only)**: `src/app/[locale]/places/page.tsx` searches by
  postcode (any pack's `postcodePattern`) or name, and browses each pack's
  levels with their counts; `src/lib/places/search.ts` reads names, levels and
  parents for all hits at once. A postcode spanning several places lists each
  with its localities' share of addresses. Names match without case or
  accents, and an umlaut spelled out matches it ("zurich" and "Zuerich" find
  "Zürich"): `src/lib/places/fold.ts` folds the query in code and the names in
  SQL from one character table, so no extension or index is needed. The
  communes' boundaries are published (§9.1); the map is the next step. The same search is `GET /api/v1/places?q=`, and a place page is
  `GET /api/v1/places/{path}`, both listed on `/integration`.
- **Place page** (`/places/{slug_path}`), top to bottom:
  1. name (per the naming policy), level (from the pack, in the reader's
     language), origin badge;
  2. chain breadcrumb;
  3. **Status**, when there is anything to say: claims, administration and
     recognition sentences (§7.1);
  4. **Takes tax?** with the numbers and the chain;
  5. **How you take part**: instruments and upcoming ballots, each with a real
     outbound action. Solon never casts official votes or collects official
     signatures;
  6. **Inside**, then **Founded here**, then **Groups about this place**;
  7. *Compare* and *Moving here?*;
  8. folded **"Where these numbers come from"**.

  A founded place shows the same skeleton: contributions (voluntary, on top of
  tax), fund and ledger, derived instruments, Join. An ended place keeps its page
  with the successor link.

  **Built (P0, minimal)**: `src/app/[locale]/places/[...slug]/page.tsx` renders
  1, 2 and a plain 4 (whether the place levies tax, from `taxingLevels`; "no tax
  model yet" when its pack has none), plus other names, identifiers (linked
  through the scheme's `urlTemplate`) and the latest retrieval of each source
  behind the place. What a reader sees is decided by `placeView`
  (`src/lib/places/place-view.ts`, pure) from what `loadPlacePage`
  (`place-page.ts`) reads; `PlaceProfile` (`src/components/places/`) takes its
  translator as a prop, so the acceptance spec renders Testland's pages from
  the database with the test config. Copy lives in the `Places` namespace of
  `messages/*.json`, in all five languages. A path nobody holds, or a place
  whose pack the running config lacks, is a 404 (a render check guards it).
  The rest of the list comes with the phases that bring its data.
- **`/compare`**: columns up to the Register's limit, rows grouped as Money, Say,
  Leaving, Status, Size. Every cell sourced, missing shown as missing. **No
  Solon score**; personal weights computed in the browser and labelled as the
  reader's.

  **Built (P1, Money only)**: `src/app/[locale]/compare/page.tsx` compares the
  places in the link (`?p={path}&p=…`, so a comparison can be shared) up to
  the Register's limit (`REGISTER_POLICY_DEFAULTS.compareLimit`, 4, until the
  Register adopts its policies), with a search to add another.
  `src/lib/places/compare.ts` loads each chain and the facts the pack's tax
  model reads, all for one period: the latest fiscal year whose figures are
  all published at the places' own levels (up to two years back), said in the
  heading when it is not the current one. The estimate runs in the browser
  (`compare-view.ts`, no database import; `place-comparison.tsx`): the reader
  types their taxable income and household, which stay in the tab
  (sessionStorage) and never enter a link, a form or a request. Rows: tax per
  year with the effective rate and the difference to the lowest (only within
  one currency), each component, each multiplier the model reads, and who
  levies it. A missing figure says why: set by a lower level (a canton's
  column has no commune's multiplier) or not recorded yet. The pack names its
  model's inputs, variants and components and what the estimate leaves out
  (`taxLabels`, required beside a `taxModel` and checked by the config
  guard). Amounts use the pack's `region` number formats in the reader's
  language (`de-CH` reads "CHF 13’050", `fr-CH` "13 050 CHF"); a pack without
  a region uses the language's own. Say, Leaving, Status and Size are one row, "not compared yet", with
  the coverage link, until their data exists; personal weights come with
  them. The golden values of §6.2 are reproduced through `/compare` in the
  Swiss integration test.
- **`/move?from&to`**: estimate difference (browser), dates and deadlines (each a
  sourced fact of the places involved), the fiscal-year rule stated from the
  pack's tax model, outbound steps, change in instruments and ballots. A
  destination without coverage shows what is known and "suggest a source".
- **Founding a place** (`/orgs/new`): the place step (inside a state place,
  no territory, or proposed territory), the name check listing places with the
  same name, reserved identifiers and levels impossible to take.
- **`/me/places`**: my chain (residence held by OrangeCat), founded places I
  belong to, my civic split with the law's split as the reference line, next
  ballots.
- **`/places/coverage`**: per country, which levels, metrics, instruments and
  sources are covered and how fresh they are, **computed from the data**. World
  coverage is honest from day one: a country in the backbone but without a pack
  says exactly that. **Built** (`src/lib/places/coverage.ts`): per pack, the
  current places at each level, how many at each level hold each fact the tax
  model reads (and any other fact they hold), and each source's latest
  retrieval and latest real import run. Instruments join with P2, and
  countries without a pack with the backbone (P4).

### 9.3 Navigation

The header budget is four links. Places replaces Platform in the header, and
Platform moves to the footer (decided, §13). Labels come from `site-config.ts`.
**Built** 2026-09-30: the Places panel holds `/places` and `/places/coverage`;
Platform is its own footer group.

### 9.4 States

Every data surface specifies loading (skeleton in final layout), empty (latest
available period plus "suggest a source"), stale (the period in the same
sentence), error (what failed, retry on the same card) and below threshold ("fewer
than k people here have declared").

## 10. Privacy and the civic split

**Privacy.** Solon stores no residence and no income. OrangeCat stores residence
own-row, at the pack level the person chooses (a municipality by default, a
quarter if they opt in). Estimates run in the browser. Aggregates use the
Register's threshold, rounded.

**The civic split** (OrangeCat) becomes generic:

1. Residence by postcode or search → Solon `resolve` → the person confirms →
   OrangeCat stores the jurisdiction id.
2. Shares go over **the taxing levels of the chain, derived from the pack's tax
   model** (§6.3), plus founded places the person belongs to. The rows become
   `civic_split_shares (actor_id, jurisdiction_id, share)`, with sum-to-100
   enforced by a deferred constraint trigger. Witikon appears as "takes no tax",
   with its founded places and funds.
3. **The law's split** for the person's income, computed in the browser from the
   same model, is the reference line their declared split sits against.
4. Local funds are looked up by jurisdiction id.
5. Existing free-text rows: exact matches are linked, and the rest are confirmed
   by their owners. Nothing is merged silently.
6. OrangeCat cannot foreign-key into Solon, so a nightly reconcile flags ids whose
   place ended and asks the person to confirm the successor.

`orangecat/src/config/tax-estimates.ts` (a Zürich table and string matching) is
retired when the Swiss pack and its facts serve the same numbers; its sources
move into the registry.

## 11. Build order

Each phase ships on its own, verified live, with its acceptance test written
before the build.

**P0: foundations, no country yet**
- `src/lib/config/places/schema.ts` and the empty registries; `places:sync-config`;
  migrations for §4 with empty tables. (Built: §4, §5.1, §5.3.)
- `@bitbaum/tax-model` with the `TaxModel` schema, tested against a synthetic
  model, then vendored into Solon with its drift check. (Built:
  bitbaum/orangecat#1190, `src/lib/tax-model/`, `check:vendored-drift`.)
- The importer framework with a fixture adapter; the invariant engine. (Built:
  §8.3.)
- The CI guards of §12; tokens for the map scale and hatch; `charter_city` kind.
  (Built: the no-literals and neutral-copy guards, §12; the tokens, §9.1;
  `charter_city`, §3. The other §12 guards come with the data they check:
  golden tax fixtures with P1 (built, §6.2), dispute fixtures with P4, the
  no-dead-ends checks with the screens.)
- The Register organization, founded by George under `SOLE` (his signature),
  with the initial policies of §13.
- **Acceptance**: a made-up country pack with fixtures imports, validates,
  renders a place page and evaluates a tax model, **with changes only to its
  pack under `src/lib/config/places/` and its fixtures**, none to the engine.
  (Built: Testland, in `src/lib/places/__tests__/fixtures/testland/` and
  `places-import.integration.test.ts`, imports, validates, renders its place
  pages and evaluates its tax model in CI's integration job.)

**P1: the Canton of Zürich** (the Swiss pack, partially filled)
- Levels down to statistical quarters for the City of Zürich. About 160
  municipalities with mergers, five years of multipliers, federal and cantonal
  tariffs, and the postcode resolver.
- `/places`, place pages, `/compare`, `/places/coverage`, the API. OrangeCat's
  civic split reads the chain.
- **Acceptance**: 8053 resolves to Witikon (quarter, takes no tax) › Zürich (city,
  takes tax) › Zürich (canton) › Switzerland. City of Zürich vs Küsnacht at CHF
  100,000 shows two estimates matching the golden fixtures, and every number
  links to its snapshot.
- Built so far: the structure. `src/lib/config/places/countries/switzerland.ts`
  (levels, schemes, the income-tax model without church tax, which P2's
  parishes bring); the FSO register for **all** cantons rather than Zürich
  alone, because its mergers can only be linked when both ends are known
  places, with snapshots since 2021 and 79 mergers as `succeeds`; the City of
  Zürich's 12 districts and 34 quarters. Witikon resolves up its chain to
  Switzerland and its page says it takes no tax
  (`switzerland.integration.test.ts`, from cuts of the real retrievals). Live
  since 2026-09-29, with the canton's commune multipliers since 2021. Federal
  and cantonal tariffs and the canton's multiplier import from the Federal Tax
  Administration, and the City of Zürich and Küsnacht at CHF 100,000 match its
  calculator (§6.2). `/places/coverage` counts all of it from the data.
  Postcodes resolve to communes from swisstopo's directory (§4.6, §8.2); a
  postcode reaches its quarter once the city's address register is imported,
  so 8053 reaches the City of Zürich today, not Witikon.
  `/places` searches and lists them, and the API serves both (§9.2);
  `/compare` sets them side by side with the estimate in the browser (§9.2).
  Next: the Register (George) and the city's address register.
  P2 has begun: six more cantons' tariffs and multipliers (§6.2).

**P2: Switzerland in depth**
- All municipalities, all cantonal models and multipliers, church and school
  levels, federal and cantonal instruments, ballots, the move planner inside
  Switzerland.
- **Acceptance**: Zürich → Aarau shows the difference, the fiscal-year rule,
  both deadlines, outbound steps and the change in ballots, none of it typed by
  hand.

**P3: founded places**
- The place step, `located_in`, `federated_with`, derived instruments, founded
  places in compare and in civic splits.
- **Acceptance**: a founded Witikon inside the official quarter, with a
  governance profile and an OrangeCat fund, compared row by row with the City
  of Zürich.

**P4: the world backbone**
- Every state and de facto authority, first-level subdivisions, areas with
  claims and administration, recognitions, UN membership, names in all scripts,
  the naming policy, hatched disputed areas, sanctions data for OrangeCat's
  giving flow.
- **Acceptance**: fixtures for Abkhazia, South Ossetia, Transnistria, Northern
  Cyprus, Kosovo, Taiwan, Somaliland, Western Sahara and Palestine build and
  render with the §7.1 sentences, sourced and dated, with **no code outside the
  generic model**. The neutral-copy test passes. A new recognition, or a
  withdrawn one, reaches the page by an import alone.

**P5+: countries in depth**
- One pack at a time (levels, tax model, instruments, sources), contributed by
  anyone, reviewed like code, with golden fixtures. `/places/coverage` shows the
  progress.

## 12. Guards (each principle that can be checked, is)

| Principle | Guard |
|---|---|
| No country, level, currency, month-day or ISO literal in the engine | `scripts/check-places-no-literals.ts`: fails on any registry key, ISO code or currency code under `src/lib/places/**` and the vendored `@bitbaum/tax-model`, except in tests and fixtures. Keys are read from the registries, so the check has no list of its own. **Built**: `pnpm run check:places-literals` in `verify` (TypeScript AST, codes recognised by `Intl`; also scans the place page; the engine's own vocabulary is exempt), and a unit test runs it with Testland's keys |
| Config is valid | Zod validation of every module in `verify`; each pack's slug rules produce unique paths; each pack's tax model type-checks against its metrics |
| Config and database agree | `places:sync-config --check` in CI against a migrated test database |
| Nothing without a source | a DB constraint (`source_id NOT NULL` where required) plus an invariant for founded exceptions |
| Neutral words | copy test over `messages/*.json` with the configurable term list; quotations must carry a source key. **Built**: `src/i18n/__tests__/neutral-copy.test.ts`, terms in `src/lib/config/places/neutral-terms.ts` (phrases where a word has an innocent governance sense); a `quote` with a sibling `source` is exempt |
| Tax is correct | golden fixtures per pack, captured from official calculators, with source and date |
| Model generality | the P0 made-up-country test and the P4 dispute fixtures run in CI forever |
| No dead ends | e2e: an ended place, a place with no data, and an uncovered destination each render a next step |
| Accessibility | render checks at 390px and 1440px, keyboard path through the list view, RTL snapshot |

## 13. Decisions that are George's

All decided 2026-09-29.

1. **Header**: Places replaces Platform, and Platform moves to the footer (§9.3).
2. **Evaluator package**: one small shared package for the in-browser estimate,
   used by OrangeCat and Solon. One implementation, and income never leaves the
   device.
3. **Register organization**: George holds all control at first. Profile `SOLE`,
   George the only mandate holder; others advise, including by advisory vote
   (§8.4). Corrections are `OPERATIONS` decisions.
4. **Initial Register policies**: George sets them. Starting values: aggregate
   threshold 5 (no figure shown for fewer than five people), compare limit 4,
   stale when the period ended more than 3 months ago, naming policy as in
   §7.2. They are policies George can change by decision, not constants.
5. **Licence policy**: accept CC0, public domain and CC BY. No ODbL source in
   P1–P4; decide on ODbL before any OpenStreetMap-derived source.
6. **Third-party indices** (freedom, democracy, corruption): not before P4, and
   then only under the publisher's name.
7. **Sanctions**: start with the Swiss SECO lists, since the operator is in
   Switzerland. Extending to UN and EU lists waits for legal advice, before P4
   puts money near a sanctioned area.
8. **Founded places claiming territory**: open to anyone. The badge always says
   founded or proposed, never state.
9. **Solon's vision line**: unchanged until P1 ships. Then the Loki project
   profile names Places, because nothing is described as existing before it
   does.

## 14. Risks

| Risk | Mitigation |
|---|---|
| Solon is seen to take a side on a disputed place | assertion model; attributed names; hatched maps; neutral-copy test; editorial policy decided openly by the Register |
| A wrong tax number misleads someone | "estimate" in the same sentence; golden fixtures; every number linked to its snapshot |
| A new country needs engine changes | the P0 made-up-country acceptance test runs in CI permanently |
| Data goes stale | cadence in config, staleness shown, cron alerts, coverage page |
| A source changes format or licence | Zod parse fails loudly; licence re-checked per retrieval; importer refuses a non-allowed licence |
| Money reaches a sanctioned party | sanctions data checked in OrangeCat's giving flow, sourced and dated |
| Impersonation of a state place | reserved identifier schemes and levels, enforced by trigger; origin badge everywhere |
| Residence data leaks | not stored in Solon; own-row RLS in OrangeCat; thresholds and rounding |
| Scope swallows the governance core | Places writes only through existing organization and proposal flows; one section of the product |
