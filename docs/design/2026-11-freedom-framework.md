# The freedom framework: rules, practice and outcome, without labels

2026-11-09. The owner's brief, from a long conversation about political
compasses, the gap between law and enforcement, statistics and charts,
checked against the repository on the same day. `ROADMAP.md` carries the work
items (section "The law beside the numbers"); `2026-11-freedom-laws-statistics.md`
is the first design and what was built under it. This file is the thinking
behind both, so a bot that implements the roadmap keeps the same idea.

Status: the framework is decided; what is built is marked **[built]**, what is
next **[next]**, what is later **[later]**. Nothing here is claimed built unless
it says so.

## 1. What the owner asked for

- A way to see what is going on in the world's rules that does not depend on
  political labels. "Left", "right", "liberal", "socialist", "fascist" mean
  different things in different places and are used as insults; a compass
  built on them puts very different things side by side and splits similar
  ones.
- The most useful single dimension, in the owner's view, is
  **collectivism against individualism**: whether the rules subordinate the
  individual to a collective. Voluntary collectives are fine, provided there
  is free exit. Solon does not name enemies; it publishes the measures and the
  reader draws the line.
- Law on the books and enforcement are separate things and must be separate
  data. Liechtenstein and Monaco both forbid recreational cannabis; the
  penalties, the thresholds and above all how hard it is enforced may differ,
  and one "drug freedom" score would hide that.
- National statistics, current and historical, beside the law: maps coloured by
  a metric, timelines with law changes marked, ranked views, scatter plots,
  detail panels. Everything clickable and traceable to its source and its
  statute.
- History: what happened to a number after a law changed, with the caveats,
  shown not as one story but as the ordinance, the series, the peers and the
  objections.
- Perfect plumbing. Data integrity and quality control are paramount. Content
  must be easy to add.

## 2. The principle: measure rules and results, not labels

Solon does not classify a country or a party as anything. It holds
**measurements** (a statute's penalty, a tax wedge, the share of tax collected
centrally, an arrest rate) and **definitions** (an axis is a named, versioned
list of measures with directions and weights, with an author). Where a label is
wanted, it is a reader's choice of definition and weights, never Solon's
verdict. This is the same rule the places model already follows (record
attributed assertions, never speak in Solon's own voice about contested
matters) applied to politics.

Consequences that are already enforced in code:

- An axis never says which end is better; it states what a higher score means
  (`direction`) and who defined it (`author`) **[built]**.
- A score exists only among the places shown; it is a position, not an absolute
  **[built]**.
- A claim about an effect is a `reported` line with who made it, kept apart from
  what happened **[built]**.
- A layer or measure with no data is shown as missing, with what would fill it,
  never guessed **[built]**.

## 3. The compass: compulsion and exit

The owner's definition, made operational so it can be measured and argued with:

> A rule is **collectivist** to the degree that it compels a person to take part
> in, or contribute to, a collective arrangement, and makes leaving it costly or
> impossible. An arrangement people join and can leave at a bounded cost is
> **voluntary** and counts as individualist however large it is.

So the axis is not the size of an organisation or a government. It is two
questions asked of every rule:

1. **Compulsion.** Is participation or contribution required by law (a tax, a
   compulsory insurance, conscription, compulsory membership of a body, a ban on
   what a person may do with their own body or speech)?
2. **Exit.** Can a person, or a sub-group, leave: by moving away, by
   renouncing, by resigning from the body, by seceding? At what cost in money,
   time, rights and permissions?

A high-compulsion, low-exit rule is strongly collectivist. A high-compulsion,
cheap-exit rule (taxes in a small jurisdiction one can leave freely) is weaker
for it, which is why exit is a measure in its own right and not a footnote.
This is the idea behind Hirschman's *Exit, Voice, and Loyalty* and Tiebout's
account of people choosing among local governments, and behind the fleet's own
rule that groups may choose any rules as long as people can leave (see
`2026-11-global-law-and-exit.md`).

### Why this beats the left–right line, and where it does not

- It does not need the words "left" and "right". A conscription law, a drug
  prohibition, a speech restriction, an exit tax and a high income tax are all
  compulsion; they are found on both sides of the usual line, and the usual line
  hides that.
- Two things the usual line treats as one stay apart: **how much** the state
  does (more or less government) and **how much it compels** (compulsion and
  exit). A state can do much by voluntary arrangement, or little by compulsion.
- Two measures are also kept apart: **where** decisions are made (centralisation:
  who collects the tax, who writes the rule) and **whether one can leave**.

Honest limits, which the framework carries rather than hides:

- "Collectivism" is also a *cultural* variable in the social sciences (how much
  people see themselves as members of groups). This axis is about **rules**, not
  attitudes, and says so in its name.
- Some arrangements (a commons, defence, a legal system) cannot work without a
  measure of compulsion. The axis measures how much, and how far one can exit
  it; it does not say none is justified. That is for a group to decide, with
  the measures in front of it.
- Exit is never free. The measure is its **cost**, which is why exit series
  (§5) are a priority, not an extra.
- Other compasses exist and are legitimate lenses: the Nolan chart separates
  economic from personal freedom; the Political Compass uses an economic and a
  social axis. Solon's tool for them is the **reader-built axis** (§6): any
  mixture of measures, with direction and weight, kept in the link. The compass
  above is the default lens Solon argues for, not the only one it permits.

## 4. Three layers, never one score

Every dimension (taxation, personal use of a substance, speech, assembly, exit,
business licensing) is held as three layers **[built: model, one dimension
loaded]**:

| Layer | Question | Examples |
|---|---|---|
| **De jure** | What does the law say, including what it works out to for a typical case? | Maximum penalty; threshold amounts; administrative or criminal offence; medical exceptions; the statutory top tax rate; the tax wedge on an average wage (derived from the law) |
| **De facto** | What happens in practice? | Arrests and prosecutions per 100,000; what happens to small-quantity cases; police priority; compliance and the tax gap; practical tolerance |
| **Outcome** | What results for people? | Tax revenue as a share of GDP; price and availability; how free people say they are |

The point is the **gap** between layers, so a layer is never merged into a
single "freedom" number unless a reader chooses the weights. The page
`/statistics/dimension/<key>` shows each layer's measures, every measure ranked
place by place, one measure against another (law against practice) with the gap,
and one place over time **[built]**.

### The worked example loaded today: taxation

- De jure, headline: the statutory top income tax rate (OECD Tax Database).
- De jure, typical case: the average tax wedge on a single worker at the average
  wage (OECD Taxing Wages).
- De facto: **none yet**. The page says what would fill it (estimates of the tax
  gap and of compliance).
- Outcome: tax revenue, all levels of government, as a share of GDP (OECD
  Revenue Statistics); government expenditure (OECD Government at a Glance).

What it shows (2025): Estonia's statutory top rate is a flat 22% and the rules
take 42.6% of an average pay packet; Switzerland's 41.4% and 23.0%; the United
States' 43.7% and 30.0%. The two numbers answer different questions (the top
rate applies to the highest incomes, the wedge to the average wage), and the
page says so. That is the kind of gap the framework exists to make visible.

### The cannabis example (Liechtenstein and Monaco), as a specification **[next]**

Keep it in three layers on the neutral label "personal possession and use of
cannabis":

- De jure, coded from the statute and linked to its articles: maximum penalty,
  threshold amount, administrative or criminal, medical exception.
- De facto, from the best available statistics, each with a confidence and a
  note: arrests or prosecutions per 100,000, outcome of small-quantity cases,
  reported police priority.
- Outcome: price and availability proxies, or self-reported ease, where a
  publisher has them.

Whether international sources cover either country is **not known**: the usual
European drug statistics are compiled for EU member states, and neither is one.
National police and justice reports are the candidates to read first. Until a
series exists, the layer says "no series yet" and what would fill it, which is
already built. Do not fill it with an estimate nobody can trace.

## 5. What to measure for the compass, and where it could come from

Every candidate below is **a candidate**: its licence has **not** been read and
nothing is loaded until it has been (the licence policy excludes share-alike
sources until a Register decision admits one; `src/lib/config/places/licences.ts`).

| Axis | Measure | Layer | Status / candidate source |
|---|---|---|---|
| How much passes through government | Government expenditure, consumption, tax revenue (all levels), top rate, tax wedge | de jure / outcome | **[built]** World Bank, OECD |
| Where tax is collected | Central government's share of all tax | outcome | **[built]** OECD Revenue Statistics |
| Where tax is collected | Sub-central share of spending; local tax autonomy | de jure | OECD fiscal decentralisation series |
| Compulsion | Conscription (exists, length, alternatives); compulsory insurance; compulsory membership of a body; compulsory voting | de jure | coded from the law; International IDEA's compulsory-voting data as a candidate |
| Exit | Exit or expatriation tax; cost, fee and time to renounce citizenship; passport and travel rules; right of a member to resign from an association | de jure | **coded from the law**, each with its provision link |
| Exit | Emigration and residence-change frictions in practice | de facto | national and OECD migration statistics; surveys |
| Personal freedoms | Drug possession, speech, assembly, privacy | all three | statutes; police and court statistics; published freedom indexes |
| Economic freedoms | Business licensing, property rights | all three | statutes; published indexes |

Published freedom indexes (the Fraser Institute's Economic Freedom of the
World, the Cato Institute's Human Freedom Index, Freedom House, V-Dem) are
candidates **only for components**, credited to their publisher, never as a
Solon score; each licence must be read first.

## 6. Data model: what exists, what is next

### Exists **[built]**

| Concern | Where | Notes |
|---|---|---|
| A figure | `facts` (bitemporal), metric registry with a `statistic` block (definition, **scope**, publisher series code, page) | A correction supersedes; nothing is overwritten. `quality` (normal, estimated, provisional, forecast) and the publisher's own flag (`publisher_flag`) on every figure |
| Where a figure came from | `sources` (URL, retrieval time, sha256 of the bytes, snapshot, licence) | Raw bytes kept under their hash |
| Law, versioned | `legal_acts`, `legal_act_versions`, `legal_provisions` | Hashes; jurisdictions |
| Links, events, enforcement | `statistic_records` (append-only, DB trigger refuses update and delete) | Kinds `law_link`, `event`, `enforcement`; a change is a new row, a removal a retraction |
| Events | curated list, `src/lib/config/statistics/events.ts` | What changed, process, votes, actors, reported claims, series, caveat, sources |
| Dimensions | `src/lib/config/statistics/dimensions.ts` | Three layers; an empty layer must say what would fill it |
| Axes | `src/lib/config/statistics/axes.ts`; a group's own as the `statistic_axes` policy | Versioned, authored; weights are the reader's or the group's |
| Saved views and evidence | `statistic_views` (sha256 of the spec), `proposal_evidence` | Append-only; a proposal that links a view carries it |

### Coded assessments **[built, first codings 2026-11-09]**

Numbers come from publishers. **Coded legal features** (is possession a
criminal or an administrative offence? what is the maximum penalty? can a member
leave the association?) and **enforcement ratings** are judgements by a person
reading a text or a report. They need their own record, because a judgement can
be wrong:

```text
assessment
  id, jurisdiction, dimension, layer, feature (a key in a registry with a rubric)
  value            number or category on the rubric's scale
  valid_from, valid_to
  provisions[]     the articles the value was read from (links into legal_provisions)
  evidence[]       pages read, each with the words it relies on (as for events)
  method           coded | reported | estimated
  confidence       high | medium | low, with a note saying why
  coded_by, reviewed_by[]     two different people before it is shown as settled
  rubric_version
  recorded_at, superseded_at  append-only, as the rest
```

The **rubric** is data too: for each feature, its question, its scale with a
definition of each point, worked examples and the edge cases decided. A feature
with no rubric is refused. The review step uses what already exists: a coding
is a proposal, the reviewers vote, and the decision is in the record.

Why not now: it needs the rubrics written and the review workflow decided, and
the plumbing it stands on (append-only records, evidence with checked words,
proposals) is in place.

## 7. Charts

Solon draws with `@bitbaum/chartkit` (line, ranked bars, share bars, sparkline,
meter, timeline, stat tiles; server-rendered, token-coloured, each with a table)
and `@bitbaum/geo-kit` (the map). What was proposed, and where it stands:

| View | Status |
|---|---|
| Map coloured by any metric, click for a panel | **[built]** for the countries Solon holds; the world needs the world as places (`#law-world-model`) |
| Ranked bars per metric and per layer | **[built]** |
| Law against practice: scatter of two measures, with the gap table | **[built]** (`/statistics/compare`, `/statistics/dimension/<key>`) |
| One place over time, several measures on one axis | **[built]** |
| Timeline of law events, each opening its page | **[built]** |
| Law-change markers drawn **on** the line | **[next]**, to be added to chartkit's `LineChart` as `markers: [{ x, label, href, tone }]`, not drawn in Solon |
| Paired bars for one place (law beside practice) | **[next]**, added to chartkit as `PairedBars`, not drawn in Solon |
| Parallel coordinates | **[built]** in Solon; **[next]** move into chartkit |
| Small multiples (the same metric for several places) | **[next]** |
| Narrated or video explainers from a saved view | **[later]** (§9) |

Rule: a chart kind that is wanted by a second product moves into the package
before the second copy is written (fleet `AGENTS.md`). The scatter, the parallel
plot and the metric map are Solon's first copies and are listed in the roadmap
to move.

## 8. Quality control (paramount)

Integrity is enforced by the system, not by care. In force today:

1. **Every line of a curated record has a source**, schema-enforced; no source,
   no record.
2. **Every cited page names the words it relies on** (`expect`), or says a
   program cannot read it (`unchecked`); a test fails otherwise. `pnpm run
   statistics:verify` fetches each page and checks the words; a scheduled
   workflow runs it weekly (`statistics-verify.yml`). On its first run it found
   that two human-facing pages (Riigi Teataja, Fedlex) are JavaScript shells a
   program cannot read, so the records cite the machine-readable copies that
   were actually read.
3. **Imports are idempotent** and recorded: a rerun changes nothing unless the
   publisher did; raw bytes are kept under their hash.
4. **Implausible values are quarantined** at import (`plausible` bands per
   metric); a year with no value is skipped and reported, never stored as zero.
5. **A publisher's reliability flag is kept per figure** and drawn on the chart
   (provisional, estimated, forecast).
6. **Series are assessed from their own figures** (`pnpm run statistics:quality`,
   and a panel on every page): missing years, large steps, stale series, too few
   points. It flags and never discards. Its flags on rate series are candidate
   **law-change years**: an event worth adding.
7. **Records are append-only**, enforced by the database; a correction is a new
   row; a metric is retired, never deleted.
8. **Claims are kept apart from facts**, with who made them.
9. **Every number says what it covers** (`scope`). The first version charted
   central-government-only series next to all-levels series and made federal
   countries look small; that was caught by looking at the numbers, and the scope
   sentence and the tests now prevent it.
10. **Licences are a gate**: a source's licence must be on the policy before its
    adapter runs.
11. **Coded assessments need two different people** (§6): a coding shows as
    awaiting a second reader until someone other than the coder is named.
12. **A chart is checked for whether it can bear its weight**
    (`src/lib/statistics/sanity.ts`), on the page and in `statistics:quality`. A figure
    that is not a number or lies outside the metric's plausible band is left out of
    the chart and listed; places read at dates more than two years apart, a trend
    from fewer than three figures, a ranking of fewer than three places, a value
    carried forward for ten years to the latest, and a scatter of fewer than five
    points or of points from years far apart each carry a warning above the chart.
    A check that cried wolf on real data was removed rather than kept: a rate fixed
    by law legitimately stays put, and the retrieval a figure came from cannot say
    which publisher it is.
13. **An AI explanation can only restate the page's facts, and is checked.** Each
    page's figures become numbered facts without a model (`brief.ts`); a model writes
    from those alone and must cite them (`explain.ts`). Every number in its answer
    must be one a fact holds, every citation a fact that exists, every paragraph
    must cite, and it may not pass a verdict on a place or a person. It gets one
    retry with the problems named, then it is dropped and the plain facts remain. This
    catches invented figures and invented sources; it does not prove the reasoning
    wise, and the page says so.

### Definition of done for new content

A new series: metric with definition, scope, publisher series, plausible band;
source with licence and cadence; an adapter option, not new code, where an
adapter exists; a fixture and a test; loaded once and rerun to prove it changes
nothing; checked with `statistics:quality`; placed on a layer of a dimension or
said to be unplaced.

A new event: every line with a source and its `expect` words; the
before-and-after wording in its own language with a translation; votes with a
breakdown that adds up; claims as `reported` with who made them; a caveat;
`statistics:verify` passing. See `docs/development/adding-statistics.md`.

## 9. Later

AI-generated short videos or narrated explainers from a saved chart view and its
law timeline. The data model must not block it, and it adds two rules: a script
may state only what a verified record states, each sentence linking the record
it came from; and no number is ever produced by a model. Not near-term.

## 10. Order

1. Series, events, layers, quality plumbing **[built]**.
2. The world as places, so the map and every series cover every country
   (`#law-world-model`).
3. Exit and compulsion measures coded from the law, with rubrics, and the review
   workflow **[next]**.
4. De facto series for the first dimensions: tax compliance, then drug-law
   enforcement where a publisher has it.
5. Law-change markers on the line and paired bars, in chartkit.
6. Groups adopt dimensions and axes as policies; mappings and codings in the
   append-only record.
7. Explainers **[later]**.

## 11. Open questions

- Which published indexes' licences allow their components to be shown?
- The rubric language for coding legal features: one scale per feature, or a
  shared severity scale across features? Start per feature.
- How a reader's own axis should handle a place missing one measure (today it
  scores on the measures the place has and says which are missing).
- Whether "voluntary collective with exit" needs a measure of its own, or only
  the exit series on the arrangement it applies to.
