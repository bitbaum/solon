# Adding statistics, events and dimensions

How to add content to the statistics layer. The design is in
`docs/design/2026-11-freedom-framework.md`; this is the checklist. Every step
has a test or a command that fails when it is done wrong, so a mistake is found
by a program and not by a reader.

Commands (all under `pnpm run`):

| Command | What it does |
|---|---|
| `places:sync-config` | Writes the metric and source registries (config) to the database |
| `places:fetch <source>` / `places:import <source> <file>` | Reads a source (by its adapter) and loads its figures |
| `statistics:sync` | Writes the curated records (links, events) into the append-only log |
| `statistics:quality` | Reports gaps, large steps, stale and provisional figures per series |
| `statistics:verify` | Fetches every page the curated records cite and checks the words each is expected to hold |
| `verify` | The whole gate: format, lint, types, design, tests |

## 1. Add a series

1. **Find the publisher's series and read its terms.** Note the series code,
   what it measures in the publisher's own words, what it covers (which levels
   of government, which people), its unit, and its licence. If the licence is
   not on `src/lib/config/places/licences.ts`, stop: a Register decision admits
   it first.
2. **Add a metric** to `src/lib/config/places/metrics.ts` with a `statistic`
   block:
   - `definition`: what it measures, in the publisher's terms, in every
     language (do not describe methods you have not read);
   - `scope`: **what it covers**, in one sentence (a series that counts only
     central government must say so; a federal country will otherwise look
     small beside a unitary one);
   - `series`: `publisher`, `code`, `url`, and for SDMX `measure`, `key` (with
     `{iso3}` where a country goes) and `match` where a flow holds several series
     under one measure;
   - `unit` and a `plausible` band: values outside it are quarantined at import.
   A metric whose series is not comparable across countries is not charted: leave
   `statistic` off, or retire it with `retired: true` (never delete one that has
   data).
3. **Name the source.** World Bank and OECD series are generated per country in
   `src/lib/config/places/sources.ts` from the metric blocks; for a new publisher
   add an adapter in `src/lib/places/adapters/` (format only: it names no country)
   and register it in `adapters/index.ts`. Add the source key to the country's
   pack (`countries/*.ts`).
4. **Test it** against a real response saved as a fixture
   (`src/lib/places/__tests__/fixtures/`). Check the mapping, that a missing
   value is skipped and reported, and that the plausible band holds.
5. **Load it twice.** `places:sync-config`, then `places:fetch <source>`; the
   second run must report `factsInserted: 0`.
6. **Look at it.** `statistics:quality` lists gaps and large steps; open the
   statistic's page. Read the numbers against the publisher's page. If two
   countries look alike or unlike for a reason of scope, the scope sentence is
   wrong or missing.
7. **Place it.** Add the metric key to a layer of a dimension in
   `src/lib/config/statistics/dimensions.ts`, or leave it unplaced on purpose.

## 2. Add an event

An event is something that happened to the law of a place: a statute, a
referendum, an ordinance. Add it to `src/lib/config/statistics/events.ts`.

- **Read the primary pages first.** Official gazettes, parliaments' own records,
  the roll call. Do not write from memory or from a summary. If a site refuses
  programs, do not disguise the request; use another official source (the US
  Senate's vote was taken from GovInfo's bill record for this reason).
- **Every line carries evidence**: publisher, `url`, `read` (the day you read
  it) and `expect`: the words the page must still hold (a figure, a name, a quoted
  sentence). A page a program cannot read (a JavaScript app) is marked
  `unchecked: true` and the record also cites a copy a program can read.
- **What changed**: the wording before and after, in its own language, with a
  translation, each with its evidence. If you have only one side, say `before:
  null`; do not invent the other.
- **How it came about**: dated steps. **Votes**: counts or a share; a breakdown
  by party must add up to the totals (the loader fails otherwise).
- **Who stood where**: `actors` with a role (initiator, sponsor, responsible,
  voted for or against, recommended yes or no, supported, opposed, said) and what
  the source says they did. Name only what a source names: if no sponsor is
  named, say none is.
- **Claims are `reported`**, never facts: `kind` claim, critique or context, `by`
  whoever said it, with evidence. An effect is never stated in Solon's voice.
- **`series`**: the statistics to chart around it, by metric key; none where
  Solon holds no series (the page then says so and shows the claims).
- **`caveat`**: what a reader should keep in mind before reading a cause into a
  line.
- Run `pnpm run statistics:verify`; then `pnpm run statistics:sync`; open
  `/statistics/event/<slug>`.

A large step flagged by `statistics:quality` in a rate series is a candidate
law-change year: look for the act behind it.

## 3. Link a series to the law

Add a `law_link` record to `src/lib/config/statistics/records.ts`: the metric,
the place, the act (authority, identifier scheme, value), the provision, **why**
the series is about it, and evidence with the words read. Cite the version of the
text you read; the human page may be unreadable by a program (`unchecked`).

## 4. Add or change a dimension or an axis

- A **dimension** (`src/lib/config/statistics/dimensions.ts`) has three layers. A layer
  with no series must say what would fill it; the loader fails otherwise. A
  metric sits on one layer of one dimension.
- An **axis** (`src/lib/config/statistics/axes.ts`) lists measures, each with a direction
  (`sign`) and a weight, a `direction` sentence saying what a higher score means
  (never which end is better) and an `author`. Use only series whose scope is the
  same in every country shown.

## 4a. Code a legal feature

A coding reads one feature of a law onto a written scale.

1. Write the rubric in `src/lib/config/statistics/rubrics.ts`: the question, every point of
   the scale with a definition, and the edge cases decided so far. Changing a point's
   meaning means a new `version`; old codings keep the version they were made under.
2. Add the coding to `src/lib/config/statistics/assessments.ts`: the place, the rubric and
   its current version, the value, the provisions (act and article) and the quoted
   wording with where it was read, a `confidence` and, below high, what is `open`.
   Code only from a text you opened.
3. Put the rubric on a layer of a dimension (`rubrics: [...]`).
4. `reviewedBy` starts empty. The page says "awaiting a second reader" until a person other
   than `codedBy` is named there; the loader refuses the coder as their own reviewer.
5. `pnpm run statistics:sync`, then `pnpm run statistics:verify` to check the cited words.

## 5. Add a country

A country is a pack and its sources (see `docs/design/2026-09-places-and-jurisdictions.md`).
For the statistics: add its ISO 3166-1 numeric code to
`src/lib/config/statistics/world.ts` (a test fails if a pack's country is
missing), and its World Bank and OECD sources are generated from the metrics.

## 6. What the page checks for you

- Every metric needs a `plausible` band; a figure outside it is left out of every chart.
- `pnpm run statistics:quality` prints the chart warnings (`!` lines) beside the series
  notes. A warning on data you know is right means the check is wrong: narrow or remove it
  in `src/lib/statistics/sanity.ts` with a test, never explain it away in a caveat.
- The AI explanation reads only what `brief.ts` (metric pages) and `dimension-brief.ts`
  (dimension pages) list as facts. A new kind of thing a page shows needs a fact kind there,
  its English line in `explain.ts` and its template in `Statistics.explain.facts`.

## Before you open the pull request

`pnpm run verify`, `pnpm run statistics:verify`, `pnpm run statistics:quality`,
and the page opened at 390 px wide in light and dark. Nothing is described as
built until it is.
