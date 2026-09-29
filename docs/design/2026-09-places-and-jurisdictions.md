# Places: every jurisdiction on one map, official and founded

_Created 2026-09-29. Status: proposal. Nothing here is built unless it says so._
_Last modified 2026-09-29: rewritten for world coverage and zero hardcoding —
first principles stated up front (§1); authorities separated from territory, with
claims, administration and recognition as sourced relations (§4, §7); every
country-specific fact moved to country packs and registries (§5); the tax
formula made declarative (§6)._
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
| **Mechanism** | hierarchy walk, tax-model evaluator, importer framework, invariant engine, map renderer | code (`src/lib/places/`, the shared evaluator package) | PR with tests; contains **no** country, level, currency or date literal (guarded, §12) |
| **Structure config** | country packs (levels, local names, identifier schemes, tax model shape, fiscal year, currency), source registry, metric catalog, instrument kinds, identifier-scheme registry, licence policy | `config/places/**` as typed TS modules validated by Zod | PR reviewed by humans; anyone may contribute a pack |
| **Editorial policy** | naming policy for disputed places, aggregate threshold, which third-party indices appear, staleness rule | **Solon policies** of the Register organization (`policies` table, versioned, each version approved by a vote) | a vote; this is the engine doc's "rules as data, amended by the rules" |
| **Facts** | places, areas, names, identifiers, relations, recognitions, tax rates, instruments, ballots | database, written only by importers and register decisions | import runs; corrections by decision (§8.4) |
| **Personal data** | residence, civic split, income | OrangeCat (residence, split), the browser (income) | the person |
| **Copy** | every sentence, level-name translations | `messages/<locale>.json` | PR |

**Ownership across the three planes.** Solon holds the public facts and the
registries. OrangeCat holds the person (residence, civic split) and the money
(funds of founded places, bound to Solon organizations through the existing
group binding). The shared vocabulary of collective kinds stays in
`@bitbaum/collective-kinds` and gains `charter_city`. **Country-specific
structure does not go into that package**: a package holds mechanism and
cross-product vocabulary, and country packs are data about the world, served by
Solon's API.

## 4. Data model

Postgres database `solon` on bitbaum, Drizzle, following `schema.ts` conventions:
app-minted text ids, named constraints, append-only where history matters.

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

Schemes come from the **identifier-scheme registry** (`config/places/identifier-schemes.ts`):
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
  - Metrics come from `config/places/metrics.ts` (label key, unit, value type,
    definition, schema of `value_json`), synced and FK-referenced.
  - `currency` is ISO 4217, per fact. **No currency is assumed anywhere.**
    Cross-currency comparison converts with sourced, dated exchange-rate facts,
    and says so.
  - Bitemporal: the "current" view takes the newest `recorded_at` per key whose
    `superseded_at` is null. A correction supersedes and never overwrites.
  - `method`: `imported`, `derived` (names its inputs), `corrected` (names the
    decision).

### 4.7 `instruments` and `ballots`

`instruments (id, jurisdiction_id, kind → instrument-kind registry, eligibility
jsonb, requirements jsonb, how_key, official_url, source_id, valid_from, valid_to)`.
Kinds, and the JSON schemas of `eligibility` and `requirements`, live in
`config/places/instrument-kinds.ts`. All thresholds are data: a federal initiative's
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
config/places/
  schema.ts                 Zod schemas for everything below — the contract
  countries/
    switzerland.ts          one pack per country; file name = pack key
    …
  sources.ts                source registry
  metrics.ts                metric catalog
  instrument-kinds.ts       instrument kinds and their JSON schemas
  identifier-schemes.ts     identifier schemes, with `reserved`
  licences.ts               licence policy: SPDX ids allowed, and what each obliges
  relation-roles.ts         organization_places roles
```

Every module is `as const satisfies <Schema>`, the pattern of
`entity-registry.ts` and `governance-profiles.ts`: typed at compile time,
validated at load, tested in CI.

### 5.2 A country pack

A pack is the whole of what the engine knows about one country's *structure*.
Its *facts* come from importers. The Swiss pack, abbreviated:

```ts
export const switzerland = {
  key: "switzerland",
  identifiers: { wikidata: "…", iso3166_1: "CH" },   // exact values filled from sources at build
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
  taxModel: "./switzerland.tax.ts",
  instruments: ["federal-political-rights", "cantonal-political-rights"],
} as const satisfies CountryPack;
```

Nothing in that block is read by name anywhere in `src/`. The engine iterates
`levels`, resolves `parent`, looks up `names` for the reader's locale, and hands
`taxModel` to the evaluator.

### 5.3 Config → database projection

Registries that facts FK-reference (`place_country_packs`, `place_levels`,
`place_metrics`, `place_identifier_schemes`, `place_instrument_kinds`) are
**projections** of config, written by an idempotent `pnpm run places:sync-config`
that deploy runs before the app starts:

- inserts new keys and updates labels;
- **refuses to remove a key still referenced** by any fact, and fails the deploy
  with the referencing rows. A registry entry is retired by marking it retired,
  never by vanishing;
- writes an audit row with the config's git SHA.

So the database enforces integrity (FKs), config stays the single producer, and
adding a country needs no migration.

### 5.4 Settings that are policy, not structure

The aggregate threshold, the compare-column limit, the staleness rule, the
naming policy and the third-party-index list are **Register policies** (§8.4):
versioned in the `policies` table, each version approved by a vote, read at
runtime. Their initial values are proposed in §13, not written into code.

## 6. Tax: a declarative model and a pure evaluator

### 6.1 The model

A country's tax formula is **data in its pack**. The Swiss income tax, as data:

```ts
export const switzerlandIncomeTax = {
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

A small **pure** function, `evaluate(model, facts, inputs) → { components[],
total, effectiveRate, currency, assumptions[] }`. It has no I/O, is
deterministic, and runs in the browser, so the income never leaves the device.
OrangeCat (finances, civic split) and Solon (map, compare, move planner) both
need it, which is the fleet's test for a shared package (decision §13). Its tests
are **golden fixtures per pack**: sample incomes, the official calculator's
output for them, and the source and date the output was captured from. The
evaluator is correct when it reproduces them within a stated tolerance.

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
about this is hardcoded per country. The legal reading of which lists apply is a
decision for George with advice (§13).

## 8. Data sources and import

### 8.1 Licence policy first

`config/places/licences.ts` lists the SPDX licences the register accepts and
what each obliges (attribution text, share-alike scope). **An importer whose
source licence is not on the list does not run.** The policy matters because
the obvious world datasets differ: some are public domain or CC0, some CC BY
(attribution), some share-alike (ODbL: a derived *database* must be shared under
the same terms), some non-commercial (excluded). Which share-alike sources to
accept is a decision (§13).

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

### 8.4 Corrections and editorial policy: the Register

Wrong data is fixed by a decision, not an edit. A **Register** organization on
Solon decides corrections (effect `register.correct`, engine doc §2.2: appends a
`corrected` fact or relation citing the decision) and owns the editorial
policies of §5.4. Anyone may propose, with a source. This dogfoods the engine on
public, low-stakes, real questions, and makes Solon's own editorial choices
visible and contestable.

## 9. Product and UX

The plan of record's rules hold: dark-only, shared tokens, sans headlines, three
depths, every sentence in `messages/*.json`, Swiss German spelling, no
concatenated sentences, no dead ends.

### 9.1 Map and list

- **Every map has a list** with the same data, sortable and keyboard navigable.
  On phones the list comes first and the map is a tab.
- Geometry is built into simplified TopoJSON per level and dataset version,
  keyed by `geometry_ref`, served as versioned static assets. Disputed areas get
  their own features so they can be hatched (§7.2).
- The colour scale and the hatch pattern are **tokens** in `@fleet/design-tokens`,
  colour-blind safe. Colour is never the only carrier.
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
- **`/compare`**: columns up to the Register's limit, rows grouped as Money, Say,
  Leaving, Status, Size. Every cell sourced, missing shown as missing. **No
  Solon score**; personal weights computed in the browser and labelled as the
  reader's.
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
  says exactly that.

### 9.3 Navigation

The header budget is four links. Recommendation: Places replaces Platform in
the header, and Platform moves to the footer (§13). Labels come from
`site-config.ts`.

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
- `config/places/schema.ts` and the empty registries; `places:sync-config`;
  migrations for §4 with empty tables.
- The evaluator package with the `TaxModel` schema, tested against a synthetic
  model.
- The importer framework with a fixture adapter; the invariant engine.
- The CI guards of §12; tokens for the map scale and hatch; `charter_city` kind.
- **Acceptance**: a made-up country pack with fixtures imports, validates,
  renders a place page and evaluates a tax model, **with zero changes under
  `src/`**.

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
| No country, level, currency, month-day or ISO literal in the engine | `scripts/check-places-no-literals.ts`: fails on any registry key, ISO code or currency code under `src/lib/places/**` and the evaluator package, except in tests and fixtures. Keys are read from the registries, so the check has no list of its own. |
| Config is valid | Zod validation of every module in `verify`; each pack's slug rules produce unique paths; each pack's tax model type-checks against its metrics |
| Config and database agree | `places:sync-config --check` in CI against a migrated test database |
| Nothing without a source | a DB constraint (`source_id NOT NULL` where required) plus an invariant for founded exceptions |
| Neutral words | copy test over `messages/*.json` with the configurable term list; quotations must carry a source key |
| Tax is correct | golden fixtures per pack, captured from official calculators, with source and date |
| Model generality | the P0 made-up-country test and the P4 dispute fixtures run in CI forever |
| No dead ends | e2e: an ended place, a place with no data, and an uncovered destination each render a next step |
| Accessibility | render checks at 390px and 1440px, keyboard path through the list view, RTL snapshot |

## 13. Decisions that are George's

1. **Header**: Places replaces Platform? (Recommended.)
2. **Evaluator package**: a small shared package for the in-browser estimate, used by
   OrangeCat and Solon? (Recommended, for privacy and one implementation.)
3. **Register organization**: founding seats and profile. (Recommended: the fleet,
   "everyone decides", corrections as `OPERATIONS`.)
4. **Initial Register policies**: aggregate threshold 5, compare limit 4,
   stale after the period ends plus 3 months, naming policy as in §7.2. (Proposed
   values for the first vote, not constants.)
5. **Licence policy**: accept CC0, public domain and CC BY; decide on ODbL
   (share-alike on a derived database) before any OpenStreetMap-derived source.
   (Recommended: not in P1–P4.)
6. **Third-party indices** (freedom, democracy, corruption): not before P4, and
   then only under the publisher's name. (Recommended.)
7. **Sanctions**: which lists apply to OrangeCat's giving flow, with legal advice.
8. **Founded places claiming territory**: open to anyone, since the badge tells
   the truth? (Recommended.)
9. **Solon's vision line**: if Places becomes a pillar of what Solon is, the Loki
   project profile is where that sentence changes.

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
