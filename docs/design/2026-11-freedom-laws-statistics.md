# Freedom, laws, statistics and the charts that join them

2026-11-08. The owner's direction, from a conversation about measuring freedom
along several axes, the gap between what a law says and how it is enforced, and
seeing what happened before and after a law changed. `ROADMAP.md` carries the
work items ("The law beside the numbers", under Next); this file carries the
reasons, the model and the order. It is not a ranking of the whole product.

## What the owner asked for

- Beside the text of each law: how it is actually enforced (prosecution and
  arrest rates, practical tolerance, evidence links), kept apart from the
  statute.
- Statistics, current and historical, from national statistical offices, the
  OECD, Eurostat, the World Bank and others, each value with its definition,
  place, period, source, method note and revision flag.
- Every statistic and enforcement record able to point at the articles it is
  about. Amendments and new ordinances as events that can be laid over a time
  series.
- Several axes rather than one score: collectivism and individualism,
  centralization and decentralization (how easy exit is, for a person and for
  a sub-group), more or less government, economic and personal freedom, and
  axes people define themselves, each with weights the reader sets. What a
  jurisdiction claims kept apart from what it achieves.
- Charts, all clickable and traceable: maps coloured by any metric, timelines
  with two series and law events marked, ranked bars, sparklines, stat tiles,
  law-versus-enforcement side by side, scatter and parallel coordinates, a
  detail panel per place, and chart specifications a person saves, shares or
  turns into a proposal. Server-rendered SVG where possible, readable as a
  table, drawn in the design tokens.
- History presented with its caveats. The owner's example: the 1982 Kennesaw,
  Georgia ordinance requiring heads of household to keep a firearm, which
  carried exemptions and no enforcement mechanism. Reports at the time noted a
  fall in burglaries; statewide trends and the absence of enforcement make a
  simple causal reading incomplete. Solon should show the ordinance, the crime
  series, the peer and state trend, and the caveats on one timeline, not a
  single narrative. (Every figure for this case is sourced when it is loaded;
  none is stated here.)
- Groups attach series and saved views to proposals as evidence; methodology,
  axis definitions and weights are themselves versioned policies a group
  votes on; every mapping, note and saved view sits in the append-only record;
  "show the law" and "show the source series" everywhere.
- Later, not soon: short narrated explainers generated from a chosen series
  and law timeline. The model must not block it.

## What already exists (read 2026-11-08)

Most of the foundation is built; this work extends it rather than adding a
second store.

- **Statistics already have a home.** `facts` (`src/lib/db/places-schema.ts`)
  is a bitemporal, sourced value of a place for a period: `jurisdiction_id`,
  `metric_key`, `variant`, `valid_from`/`valid_to`, numeric or JSON value,
  unit, currency, `source_id`, `method`, and corrections that supersede and
  name the decision that made them. Metrics are a config registry
  (`src/lib/config/places/metrics.ts`, today tax tariffs and multipliers)
  projected into `place_metrics`. A time series is the facts of one metric for
  one place ordered by `valid_from`.
- **Sources are hashed retrievals** (`sources`: URL, retrieval time, content
  sha256, snapshot, licence). A statistic from the OECD is one more source key.
- **The law is data** (`legal_acts`, `legal_act_versions`,
  `legal_provisions` in `src/lib/db/law-schema.ts`), with versions that say
  from when to when they were in force. An amendment taking effect is already a
  dated event in that table; it does not need to be entered twice.
- **The map exists.** The atlas (`@bitbaum/geo-kit`) already colours Swiss
  communes by income tax at a given income. Colouring it by any metric is a
  generalisation of that, not a second map.
- **Neutrality is a design principle with guards**
  (`docs/design/2026-09-places-and-jurisdictions.md`, principles 3 and 8):
  Solon records attributed assertions and never speaks in its own voice about
  contested matters. Freedom scores are contested, so the same rule applies.
- **Charts:** Solon draws its own small SVG tally (`src/components/learn/tally.tsx`)
  and does not yet depend on `@bitbaum/chartkit`. The fleet rule is that every
  chart is chartkit; this work adds the dependency and moves the tally onto it.

## The model

1. **Statistics are facts.** New metrics are registry entries (key, value
   type, unit, a definition, the publisher's own series code). The fields the
   owner listed map onto what `facts` has: definition → the metric registry;
   geography → `jurisdiction_id`; period → `valid_from`/`valid_to`; value;
   source → `source_id`; method note → `method` plus a note on the source
   registry entry; revision → a superseding row (record time already answers
   "what did Solon say on 1 March?"). The only addition expected is a
   confidence or provisional flag a publisher states, and a way to hold a
   series for a place Solon does not yet hold as a jurisdiction (it gets the
   jurisdiction first; no orphan series).
2. **Enforcement is an attributed assertion, separate from the statute.** A
   row says: this source asserts, for this place and period, this about the
   enforcement of these provisions — a measured rate (which is then also a
   fact) or a described practice, with evidence links. It never edits the
   law's text and is never shown as the law.
3. **Links to the law are a join, not a copy.** A link table from a metric (or
   one fact, or one enforcement assertion) to legal provisions, with who made
   the link and why. Links are added and retracted, never rewritten, and sit
   in the audit record.
4. **Events are read, not re-entered.** A law event on a timeline is a
   `legal_act_versions` row taking or leaving force, or a proposal closing.
   Events with no act in Solon yet (a policy shift, an enforcement change) are
   sourced assertions of their own.
5. **Axes and weights are policies, not Solon's opinion.** An axis is a
   named, versioned definition: which metrics, which direction, how they are
   normalised, and who defined it. A score is computed from facts under one
   axis version and always shown with that version and its author. Solon ships
   no default "freedom ranking"; it can ship example axes credited to their
   published originals (an index publisher's methodology, with the publisher
   named). A group adopts or amends axes and weights through its own votes
   (`GOVERNANCE_RULES` or a policy category), versioned like any other policy.
   A claim (what a constitution or statute promises) and an outcome (what a
   series measures) are different metrics and are never averaged together
   without saying so.
6. **A saved view is a document.** A chart specification (kind, metrics,
   places, period, axis versions, weights) stored with its hash, so a proposal
   can cite exactly the view its author saw, and anyone can reopen it. The same
   specification can later feed a narrated explainer; nothing about it is
   chart-library specific.

## The charts

Every chart is `@bitbaum/chartkit` (or `@bitbaum/geo-kit` for the map),
server-rendered SVG where the kind allows, with the same numbers available as a
table and every mark linking to its fact, its source and its linked
provisions. What chartkit lacks is added to chartkit, not drawn here.

In order of value: the atlas coloured by any metric; a timeline with two
series and law events marked, optionally with peer places or the national
trend beside it; ranked bars and stat tiles; sparklines in the place detail
panel (value, source, linked law, short series, enforcement); law beside
enforcement; scatter and parallel coordinates for several axes at once.

Causality is never drawn by the chart. A timeline shows the series, the
events, the comparison places and the caveats recorded with them; it does not
annotate "this caused that".

## Order, and why

1. **The model**: new metrics in the registry, the provisions link, the
   enforcement assertion, and law events read from act versions. Without it
   every chart would invent its own data.
2. **A few high-value series with sources**: top marginal income tax rate,
   tax wedge, government consumption as a share of GDP (OECD, World Bank),
   one or two published freedom-index components credited to their
   publisher, and one enforcement proxy. Each loaded by an importer like the
   law and places importers, hashed and safe to rerun.
3. **Map, timeline and ranked bars** on chartkit, every mark clickable to
   source and statute; the place detail panel.
4. **Axes, weights and saved views**: reader-set weights first, saved and
   shareable specifications next.
5. **In groups**: attach a series or a saved view to a proposal; axis
   definitions and weights as group policies voted and versioned.
6. **Later**: narrated explainers generated from a saved view.

## Open questions

- Which publishers' licences allow redistribution of their series (the OECD,
  the World Bank and Eurostat publish under open licences; index publishers
  vary). A series whose licence forbids it is linked, not copied.
- Whether enforcement assertions need their own table or are facts with a
  JSON value plus the provisions link. Decide when the first enforcement
  series is loaded, against real data.
- How a reader's unsaved weights are kept without storing anything about the
  reader (principle 9: privacy by architecture) — the address bar, as the
  atlas does.

## What was built (2026-11-08)

- **Series.** Metrics carry a `statistic` block (definition, publisher, series
  code, page) in `src/lib/config/places/metrics.ts`; sources are generated from
  it in `sources.ts`, so a series code is written once. Two adapters:
  `worldbank_indicators` (World Bank Indicators API v2, JSON) and `oecd_sdmx`
  (OECD SDMX, CSV with codes). Both licences are CC BY 4.0. A percentage is
  stored as a ratio. A year with no value is skipped and reported, never stored as
  zero. A server error from a publisher is retried twice, because the OECD's API
  answered 500 and then 200 on the same day.
- **The record.** `statistic_records` (`src/lib/db/statistics-schema.ts`) is one
  append-only log for law links, events and enforcement: the latest row of a
  `record_key` is its state, and a trigger refuses updates and deletes. The
  curated list is `src/lib/config/statistics/records.ts`, written by
  `pnpm run statistics:sync` and by every run of the daily places cron. Each record
  names its place and its act by identifiers, so it survives a reload of either.
  A record whose place is not loaded yet is skipped and tried again on the next run.
- **Law events** are read from `legal_act_versions` of the linked acts, dated by the
  publisher, and are never entered twice.
- **Pages.** `/statistics` shows ranked bars per series and the axes.
  `/statistics/<metric>` is a line chart of the chosen places, with a timeline of
  law events over the same years, the linked law, enforcement and per-place
  sources; the metric's dots become hyphens in the path, because a dotted path skips
  the locale routing. `/statistics/view/<sha256>` is a saved view. All five
  languages are covered.
- **Evidence.** `statistic_views` keeps a view under the sha256 of its canonical
  spec. `createProposal` attaches every saved view its text links
  (`proposal_evidence`) in the same transaction, so the hash is inside the signed
  text.
- **Axes.** `src/lib/statistics/axes.ts` scores among the places shown (min to
  max, turned by sign, weighted mean). Reader weights come from the link
  (`w.<metric>=`). A group's own axes are its active `statistic_axes` policy,
  read with `?org=`.

### Added 2026-11-09

- **Scope.** A statistic carries a `scope` sentence shown beside every chart. The first
  version charted central-government-only series (World Bank `GC.TAX.TOTL.GD.ZS`,
  `GC.XPN.TOTL.GD.ZS`), which put Switzerland at 9.5% of GDP in tax and Estonia at
  22.7%; the OECD's all-levels figures are 27.2% and 35.2% (2024). Those two metrics are
  retired and replaced by `tax.revenue.general` (Revenue Statistics) and
  `economy.government.expenditure` (Government at a Glance); `tax.revenue.central_share`
  is the central government's share of all tax collected, a decentralisation proxy.
  SDMX series that share a flow and measure are told apart by `match` columns.
- **Events.** An event record (`src/lib/config/statistics/events.ts`) holds what
  changed (the wording before and after, in its own language, with a translation),
  `process` steps, `votes` (counts or a share, with a breakdown by party that must add
  up to the totals), `actors` by role (initiator, sponsor, responsible, voted for or
  against, recommended yes or no, supported, opposed, said), `reported` statements
  (claim, critique, context, each with who made it), the `series` to chart, a caveat,
  and the pages everything was read on. Every line needs a source, enforced by the
  schema; a claim about an effect is never a fact in Solon's voice. Sources read for the
  first five: Riigikogu's open API and Riigi Teataja (Estonia), GovInfo bill status and
  the House Clerk's roll call (US), Swissvotes (CC BY 4.0), the Christian Science
  Monitor of 17 March 1982 and Scientific American (Kennesaw). The US Senate's site
  refused a plain request, so its vote is taken from GovInfo's bill status instead.
- **Pages.** `/statistics/event/<slug>`, `/statistics/events` (filter by place and kind),
  timeline marks that open them (two marks when the change begins later than the
  decision), the numbers around an event (its line cut at the year the change applies
  and scaled to itself, peers on their own chart, and a table: the year before, the year
  of, three years on, and the change), `/statistics/compare` (scatter), parallel
  coordinates in every axis panel, a world map per statistic on `@bitbaum/geo-kit`
  (`ISO_NUMERIC` in `config/statistics/world.ts` must list every pack's country; a test
  enforces it) and a reader-built axis kept in the link.
- **What the Kennesaw page shows, and does not.** The ordinance text, the vote
  (unanimous, per the 1982 report, no count), the council members, police chief, NRA and
  anti-handgun coalition quoted then, the officials' burglary claim and McDowall's
  critique of 1981 as the base year. Solon holds no burglary series for a city that size,
  so no chart is drawn and the page says so.

Still open, with the reason, on the roadmap: the map with every country (it
needs the world as places), enforcement statements, more series (Eurostat,
national offices, the tax wedge), who lobbied beyond who voted, the axes of
collectivism and exit (they need series nobody has loaded), event markers on
the line, and moving scatter, parallel coordinates and the map into the shared
packages.
