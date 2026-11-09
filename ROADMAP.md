# Roadmap

Where Solon is going, in the order it is going there. Solon is the governance
plane of the OrangeCat stack: proposals, one-click or signed votes, versioned
rules and an append-only record for any group. Nothing below is dated on
purpose — order carries the argument — and nothing is described as built unless
it is. What Solon does today is listed under "Shipped"; the one place the site
itself reads that status from is `src/lib/content/capabilities.ts`.

## Now

### The law as data: every law in Switzerland and Liechtenstein {#law}

The law of every authority, as the publisher published it: who enacted it, from
when to when it was in force, where it applies, and a hash that proves the copy
is the publisher's. Not summaries, not our own wording. Causius reads it from
here; until then it reads the publishers directly. The design, the measured
size (21,728 federal and cantonal texts in force, as LexFind counts them on
2026-10-22) and the sources are in `docs/design/2026-10-law-as-data.md`.

- [x] The register of what exists for the Confederation, the 26 cantons and the intercantonal agreements: 33,441 acts (22,047 in force) with title and number, read from LexFind's list, and a coverage page counted from the data {#law-register}
- [x] The register for Liechtenstein: the 3,407 acts of the Government's Systematic Register, named by LR number with the Landesgesetzblatt issue that published each {#law-register-li}
- [ ] Each act's own page at the authority that publishes it, for the Swiss acts (built and tested; the production load is not done), and the communes in the register {#law-register-links}
- [x] Federal text from Fedlex, every act in force, loaded in production; read again by the law sync {#law-federal}
- [x] Liechtenstein text from gesetze.li, every act, loaded in production. Each version is dated by the day it was read, because Lilex does not state when one took effect {#law-li}
- [x] Cantonal text for all 26 cantons and the intercantonal agreements, loaded in production. Zürich is read from the canton's own publication with the canton's in-force date; the other 25 from each act's document, cut into articles and dated by the day it was read, until each has a reader of its own {#law-cantons}
- [x] The law sync on a clock: every Sunday it reads every publisher again, Wyoming included, so what Solon holds stays current without anyone running it (`/law/coverage` shows the date) {#law-sync-clock}
- [x] Places data kept in the repository imported after every deploy, when its bytes changed: an edited tariff reaches the site by itself {#places-data-auto}
- [x] Acts can be found and read on Solon itself, with the publisher's link, the page each copy was read from and its hash {#law-reading}
- [x] Search over the text of the provisions in force, ranked, each hit citing its act, anchor, publisher's page and hash; the first piece of the retrieval layer for the assistants {#law-search}
- [x] Ask the law: a chat that plans which places and law words a question needs, searches those provisions and answers from them only, citing each one; public, in any language {#law-ask}
- [ ] Earlier versions of every act, and what changed between them {#law-history}
- [ ] Municipal regulations, commune by commune (one adapter per collection, a shared loader). Loaded: the City of Zürich, the eleven communes of Zug, the three of Glarus and ten of Liechtenstein's eleven. Triesenberg, the eleventh, answers Solon's reader with a bot check (2026-11-07), so its regulations are read from the Internet Archive's newest copies, each act page saying it is the archive's copy and of which day; its first load waits for a run on Solon's server, which can reach the archive. Any publisher that refuses Solon's reader is read the same way. Of Switzerland's twenty most populous communes, fifteen more are configured (2026-11-08): Winterthur, St. Gallen and Biel/Bienne on LexWork; Luzern, Thun, Chur, Schaffhausen and Sion in the i-web CMS's legal module, which Solon now reads; and Genève, Lausanne, Köniz, Fribourg, Neuchâtel, Lugano and Bellinzona, which link their acts from pages of their own and are read the same way as Liechtenstein's communes. Their first load, a dry run first, runs on Solon's server, as the sandbox they were added from could reach neither their sites nor the archive. Basel's communal law is the canton's; Bern, Vernier and La Chaux-de-Fonds are not yet read. The other Swiss communes, about 2,100, are not; the most populous go first {#law-communes}
- [ ] A public API, and Causius reading the law from here with the publisher as its fallback {#law-api}
- [x] Law in the site's main menu, beside Places and Decisions {#law-menu}

### Law you can act on {#law-act}

A law that can only be read is half open. Anyone should be able to point at an
article, write the change they want, and gather support for it — and see, for
that place, what it would take to make the change real. Solon does not claim
to make law: a proposal here is evidence of support, carried to the
authority that decides, and the record says so.

- [x] The amendment engine: changes pinned to the hash of the text they amend, immutable revisions, forks, support signed or by account, a hash-chained log anyone can verify, and the official routes as sourced data; served at `/api/v1/law/amendments` (design: `docs/design/2026-11-amending-the-law.md`) {#law-amend-engine}
- [x] Propose a change to any article: an editable copy, the change shown as a redline against the publisher's text, filed as a proposal that carries the hash of the text it amends {#law-redline}
- [x] Support a proposed change, one click or a signed vote, counted the same way as any other proposal {#law-support}
- [x] Thinking a change through with the assistant while drafting it: what it would do, who would gain and who would bear a cost, where something like it is already law (in the law Solon holds, and studies and experience on the web), each claim cited, no side taken {#law-consult}
- [ ] Signing a proposal or a support with one's own Bitcoin key from the page (the API takes signatures today; the page offers one click) {#law-sign-on-page}
- [ ] A conversation under each proposal, the fleet's shared comment thread {#law-discuss}
- [ ] The official route for each place, as data: who can put a change on the ballot or before the legislature, how many signatures in how long (a federal popular initiative in Switzerland: 100,000 in 18 months), with the source of each rule {#law-route}
- [ ] A proposal that reaches the place's bar is handed on in the form the authority accepts, with its supporters counted and the record linked {#law-handoff}
- [ ] What applies here: pick a point and see every layer of law in force there — federal, state or canton, commune — each with "propose a change" {#law-here}

### One globe for every place and its law {#globe}

The map is the front door to the law. One globe, from the whole Earth down to a
commune, showing every place Solon holds and how much of its law it holds.

- [x] The globe on the home page: the Earth, every country and state Solon holds law for shaded by how much and marked with a dot (so Liechtenstein can be tapped), a tap opening its law; the site's own colours, in every language {#globe-home}
- [x] One atlas instead of a globe and a map: the Earth, a tap flying into a country and drawing its places on the same map, coloured by tax at your income; beside it the country's law, its places and their sources; on the home page and `/places`, a view shared by its address {#atlas}
- [ ] The atlas's steps between a country and its communes (cantons, counties, states), every country's places drawn (Estonia, Liechtenstein, Wyoming's counties), and the atlas on `/law` {#globe-deep}
- [ ] The world outlines published in Solon's own geography manifest, so Substrata and every other app draw the same files through geo-kit's loader {#globe-shared}
- [ ] Every place's page links to its law, and every act's page to its place on the globe {#globe-law-links}
- [ ] The renderer stays the fleet's one map package (`@bitbaum/geo-kit`); what the globe needs that it lacks is added there {#globe-package}

### Beyond Switzerland: Wyoming first {#law-world}

The goal is the law of every place, readable and actionable by anyone. Each new
place is a publisher to read, a register of what exists, its map, and its
official route. Wyoming goes first: its statutes are published free online, the
text a US legislature enacts is not copyrightable, and its DAO LLC and DUNA
statutes are the legal wrappers groups governed on Solon are most likely to
use.

- [x] Wyoming's statutes and Constitution, read from the Legislature's downloads (45 files, about 21,000 sections), cut into sections, with the publisher's link and hash; the production load is by hand, like every other publisher's (`law-text.yml`, source `wyoleg`) {#law-wy-statutes}
- [ ] Wyoming's administrative rules {#law-wy-rules}
- [x] Wyoming and its 23 counties on the globe: in Places by their FIPS codes, drawn from the Census Bureau's boundaries when the atlas opens the United States {#law-wy-places}
- [x] Wyoming's official route: the citizen initiative, with its thresholds and its limits, from Article 3, Section 52 of its Constitution {#law-wy-route}
- [ ] Wyoming's referendum, the route for undoing an act the legislature passed (the same section) {#law-wy-referendum}
- [ ] New Hampshire's statutes (the RSAs): every chapter the General Court's tables list as an act, each section a provision with its heading, its text and its source note, a repealed section kept as the site marks it and a chapter repealed whole marked out of force; read from gc.nh.gov 11 seconds apart, safe to stop and rerun. Where the site's firewall refuses Solon's reader (it answered "Web Page Blocked" on 2026-11-06), a chapter is read from the Internet Archive's dated copy, and the act page names the copy. Built and tested against the publisher's own pages as a public 2017 mirror holds them; the server's dry run against the live site and the production load are not done (`law-text.yml`, source `gcnh`) {#law-nh}
- [ ] Grafton's ordinances {#law-nh-grafton}
- [ ] The warrant-article route a town's voters can take (RSA 39:3: 25 registered voters or 2% of them, whichever is less but never fewer than 10, by the fifth Tuesday before the annual meeting). It changes a town's law, not the state's, so it waits for the first New Hampshire town to be an authority {#law-nh-route}
- [ ] The places' and the law's data model without Swiss assumptions: a new country is configuration and an adapter, not a change to the schema {#law-world-model}
- [x] Estonia's national law in force, read from Riigi Teataja (the State Gazette): the register from its public search, each act's text from the gazette's own XML with the day it took effect, read again every week {#law-ee}
- [x] Estonia's counties and municipalities as places, by their EHAK codes (Statistics Estonia and the Land Board, EHAK2026v1) {#places-ee}
- [ ] Estonia's municipalities' own regulations, which the same register lists {#law-ee-local}
- [x] The European Union as the layer above its members: an authority whose law applies in each of its 27 member states, so Estonia's and Luxembourg's pages and questions include it, the way a canton's include the Confederation. The atlas draws no shape for it (a union is not a country in Natural Earth); its law is reached from each member it holds {#law-eu-layer}
- [ ] The European Union's regulations and directives in force (tens of thousands of acts): the register from the Publications Office's Cellar SPARQL endpoint a year at a time, named by CELEX number and titled in English; each act's English text from EUR-Lex as HTML, the latest consolidated version that has begun or else the act as the Official Journal published it, dated by the day the publisher states, cut into its preamble, articles and annexes under EUR-Lex's anchors (`art_1`, `anx_I`); reuse under Commission Decision 2011/833/EU with its notice; safe to stop and rerun in batches, read again every week. Built and tested against excerpts in the publishers' shapes, because neither host answered the sandbox it was written in; the server's dry run against the live hosts and the production load are not done (`law-text.yml`, source `eurlex`) {#law-eu}
- [x] Austria's federal law in force, read from the Federal Chancellery's RIS (Rechtsinformationssystem des Bundes) through its Open Government Data API (v2.6, application `BrKons`): the register of 10,681 consolidated acts (statutes, constitutional laws, ordinances, notices, treaties), each once by its Gesetzesnummer with its Kurztitel, listed in a hundred-document pages; each act's whole consolidated German text from the RIS's page, cut into its sections (`§ 4`), articles (`Art. 7`, `Art. 2 § 4`) and annexes (`Anlage 1`) under the RIS's own markers, dated by the latest day a section took effect; CC BY 4.0 with the RIS's notice on the act page; safe to stop and rerun in batches (`law-text.yml`, source `ris`). The reader is verified against the live API by dry runs on Solon's server (2026-11-08: the whole register listed, and no failure in a sample of 60 acts nor in the ABGB, ASVG, B-VG, DSG, EStG, StGB, MRG and UStG, the ABGB cut into 1,380 provisions and the B-VG into 223 with its annex); the production load is the next item {#law-at}
- [ ] Austria's production load: the first full run of `ris` on Solon's server (about three seconds an act, so a few runs at limit 1500), the weekly law sync then reading it again, and the RIS told of the mass download as its FAQ asks (ris.it@bka.gv.at) {#law-at-load}
- [ ] Austria's Länder: the RIS also holds each state's consolidated law (`LrKons`), its Bundesgesetzblatt and its court decisions, none read yet; and Austria in Places, which has no pack {#law-at-more}
- [x] Germany's federal law: every act in the Federal Ministry of Justice's portal Gesetze im Internet (6,143 statutes and ordinances in force on 2026-11-08), named by the portal's abbreviation (`bgb`, `gg`) and titled by its German long title, kind from the title; each act's XML cut into its paragraphs, articles and annexes under anchors from their numbers (`par_12a`, `art_3`, `anlage_1`); not protected by copyright (§ 5 UrhG); dated by the day read, read again every week and stored anew only when the text changed; paced at about a request a second. Unit tests run on hand-written excerpts in the portal's shape, because the portal did not answer the sandbox it was written in; the server's dry runs against the live portal listed all 6,143 acts and cut 68 of them (the Bürgerliches Gesetzbuch, Grundgesetz, Strafgesetzbuch, Handelsgesetzbuch, Abgabenordnung, Einkommensteuergesetz and Gewerbeordnung among them) with no failures; the production load is by hand, then the weekly sync (`law-text.yml`, source `gii`) {#law-de}
- [ ] Germany's Länder: each state publishes its own law (not read yet; federal law only) {#law-de-laender}
- [ ] The European Union's law in its other official languages, its decisions and treaties, and the atlas showing EU law in each member's panel {#law-eu-more}
- [x] The United Kingdom's legislation, from legislation.gov.uk (The National Archives): UK Public General Acts and UK Statutory Instruments, the register from the Atom feeds a type and a year at a time (newest first), named by address (`ukpga/2018/12`) and titled in English; each item's current (revised) CLML text cut into its introductory text, sections and schedules under the XML's own ids (`section-3`, `regulation-2`, `schedule-1`), subsection numbers in brackets, a repealed or not-yet-commenced provision left out, an item repealed whole marked out of force and one with nothing commenced left for the next run, dated by the publisher's own date; Open Government Licence v3.0 with its notice; paced by the site's robots.txt crawl-delay (5 seconds when checked, 2026-11-08), within its fair use limit of 1,500 requests in 5 minutes; safe to stop and rerun. Verified live by the server's dry runs of 2026-11-08 (1,152 items listed and 45 cut with no failures); the production load is not done, and the weekly sync does not carry it (a full pass lists every year and asks 5 seconds a page; see law-uk-sync below) (`law-text.yml`, source `ukleg`) {#law-uk}
- [ ] The devolved legislatures' acts and instruments (`asp`, `ssi`, `anaw`, `asc`, `wsi`, `nia`, `nisr`) as authorities of their own, and the United Kingdom's pre-1948 instruments {#law-uk-devolved}
- [ ] The United Kingdom's law kept current each week: read only the years and items that changed (the site's change feeds), so a weekly run does not list every year of statutory instruments again; and the instruments the site holds only as a PDF until its XML appears, read from the PDF meanwhile {#law-uk-sync}
- [x] Estonia's income tax in Places: 22% above a basic allowance of EUR 8,400 (Tulumaksuseadus § 4 and § 23), no municipal rate {#places-ee-tax}
- [x] The United States in Places: the nation, its fifty states and the District of Columbia, and Wyoming's counties, by their FIPS codes (Census Bureau); another state's counties are data, not code {#places-us}
- [x] The federal income tax in Places for 2026, single and married filing jointly, with the standard deduction (Rev. Proc. 2025-32), and Wyoming's state income tax recorded as zero (W.S. 39-12-101) {#places-us-tax}
- [x] The globe names the world: countries, first-level subdivisions (Natural Earth 1:10m, public domain) and every place of 1,000 people or more (GeoNames, CC BY 4.0), placed without overlap and revealed by zoom, loaded a country at a time; zoom where you point; built by `pnpm run geography:world` {#places-globe}
- [ ] Second-level subdivisions (districts, counties) for every country, from geoBoundaries (CC BY 4.0), loaded the same way, and villages under 1,000 people (GeoNames cities500) where a reader zooms that far {#places-globe-more}
- [ ] Every state's counties, and each state's own income tax beside the federal one {#places-us-states}

### Every organization on its own pages

Most app pages still read the oldest organization. Solon governs many, so every
page must be about one of them, and a member must see every group they belong
to in one place.

- [x] Anyone with an account may found an organization {#founding}
      — founding chooses its governance profile
- [x] `/orgs/{slug}` shows an organization's roster, record and who decides
- [ ] `/orgs` — a public directory of every organization
- [ ] My Solon (`/me`) — my groups, the votes waiting for me, my proposals
- [x] Member pages within an organization: role, votes cast, proposals filed
- [ ] Retire `primaryOrg()` from every page; old links redirect into the
      first organization

### The governance agent

An AI clerk in a bounded office: it drafts proposals, keeps members informed,
writes the minutes and checks spending against decisions. It never votes where
its group's humans-only rules apply, and its office is defined by the group's own rules.

- [x] Sibling agents (the Cat, Loki) hold seats and cast signed votes
- [ ] Draft a proposal from a plain-words request
- [ ] Minutes for every closed session, written from the record
- [ ] Spending checked against the decisions that allowed it

### Building in public

The roadmap and changelog you are reading are the canonical record, kept in the
repository and served through the fleet map.

- [x] `ROADMAP.md` and `CHANGELOG.md` in the repository, in the fleet's contract {#records-in-repo}
- [x] `/roadmap` and `/changelog` rendered from the fleet map {#records-public}
      without authentication
- [ ] Link signed-decision and source-code evidence from the development profile

### Light and dark, as the reader chooses {#themes}

Solon was dark only. The shared tokens carry both themes; the reader should get
the one their device uses, or the one they pick.

- [x] A light theme beside the dark one: the device decides until the reader picks Light, Dark or Device in the header, kept in their browser; photographs stay dark under their type {#theme-light}
- [ ] The theme script and the toggle moved into `@bitbaum/design-tokens`, so Loki and the fleet's other apps switch the same way {#theme-package}

## Next

### The charter: rules as data, amended by the rules

Today an organization's rules are a profile chosen at founding, read from
configuration. The charter makes them a versioned document the group amends
through its own `GOVERNANCE_RULES` votes — who votes on what, by what method,
with what threshold and quorum.

- [ ] A versioned `charters` table; the shipped profiles become templates
- [ ] A proposal that amends the charter, applied when the vote closes
- [ ] One source for thresholds: the ratification check watches the profiles too

### Exit: fork a group, leave with your record {#fork}

Many small rule sets beat one big one only if people can move between them.
Any group may choose heavy coordination or almost none; what Solon holds to is
that its rules are public and its members can leave. Forking needs the charter
above, because a group's rules must be data before they can be copied.

- [ ] Fork an organization: a new one with a copy of its charter and policies, its origin recorded, founded by whoever forks it; no one's permission needed {#fork-org}
- [ ] Every rule set shows its forks and where it came from, so rules can be compared side by side {#fork-lineage}
- [ ] A member leaves with their own record: every act they signed, exportable and checkable elsewhere {#fork-leave}
- [ ] Nested groups: a part of an organization adopts rules of its own for what is its own, and stays linked for what is shared {#fork-nested}
- [ ] A rule-set template for groups that want almost no collective decisions, beside the five shipped ones; a template, never a default {#fork-minimal}

### The law beside the numbers {#stats}

A law says one thing; how it is enforced and what happened after it changed
are other things. Solon should show all three on one record: the text, the
enforcement, and the statistics over time with every amendment marked, each
traceable to its source and its articles, so a person can see the gap and
propose a change on the same page. Several axes of freedom, never one score:
each axis is a published, versioned definition with its author, and a group's
weights are its own policy, voted like any other. Statistics are facts in the
existing places model, not a second store. The reasons, the model and the
order are in `docs/design/2026-11-freedom-laws-statistics.md`; the framework behind them
(rules, practice and outcome without political labels, and the collectivism–individualism
compass defined as compulsion and exit) is `docs/design/2026-11-freedom-framework.md`, and how
to add content is `docs/development/adding-statistics.md`.

- [x] Statistical series as facts: metrics in the registry with their definition, what they cover (which levels of government, which part of the country) and the publisher's series code, every year's value kept with the retrieval it came from, a revision superseding and never overwriting; read every month from the World Bank's World Development Indicators and the OECD's Tax Database, Revenue Statistics and Government at a Glance for Switzerland, Liechtenstein (World Bank only), Estonia and the United States, at `/statistics`. Series that cover only central government were taken off the charts because they made federal countries look small {#stats-series}
- [ ] Eurostat's and the national statistical offices' series, beside the World Bank's and the OECD's {#stats-series-more}
- [x] Links from a series to the law it is about, each with why and the page it was checked on, written into an append-only record where a change or a removal is a new row: the federal income tax tariff (DBG Art. 36), Estonia's income tax rate (TuMS § 4) and Swiss intentional killing (StGB Art. 111) {#stats-law-links}
- [ ] Enforcement as an attributed assertion beside the statute, never in it: rates where measured, practice where described, with evidence. The record and the page's section are built; no statement is loaded yet, because each needs a source someone read {#stats-enforcement}
- [x] Law events: what changed in the law in its own words (before and after), how it came about step by step, how each body voted by party, who initiated, sponsored, recommended and opposed it, and what was claimed or criticised, kept apart from what happened, each line with the page it was read on. Five are loaded: Estonia's tax rate 20% to 22% (2023), the US Tax Cuts and Jobs Act (2017), two Swiss firearms ballots (2011, 2019) and Kennesaw's gun ordinance (1982), at `/statistics/events`. Law versions of linked acts are marked on the timeline too {#stats-events}
- [x] First series loaded with sources: top statutory income tax rate, government expenditure and tax revenue with all levels of government counted (OECD), central government's share of all tax revenue (OECD), government consumption and intentional homicides per 100,000 (World Bank) {#stats-first}
- [ ] The tax wedge, credited components of published freedom indexes where their licence allows, and a first enforcement proxy {#stats-first-more}
- [x] A map coloured by any statistic, on the atlas's renderer, with the values in a table and a panel for each place; it colours the four countries Solon holds and every country added later without changes {#stats-map}
- [ ] The map with every country: the world as places (names without taking sides in disputes, `#law-world-model`), so the World Bank's and the OECD's series cover them all {#stats-map-world}
- [x] Places side by side on a line chart, a timeline over the same years whose marks open the event's own page, a list of the events beneath it, and the caveat that a line moving after a law changed does not show the law moved it {#stats-timeline}
- [x] The numbers around an event: the place's line cut at the year the change applies and scaled to itself, its peers beside it on their own scale, and a table of each place's values the year before, the year of and three years on, with no claim about why {#stats-event-numbers}
- [ ] Law events marked on the line itself, added to `@bitbaum/chartkit` rather than drawn here {#stats-timeline-markers}
- [x] Ranked bars, a line chart and a timeline on `@bitbaum/chartkit`, which Solon now uses, each mark opening the publisher's figures and each chart readable as a table {#stats-charts}
- [x] A scatter of any two measures (one point per place at the latest year it has both) and parallel coordinates for every axis, both table-readable and linking each point to its series, at `/statistics/compare` {#stats-charts-more}
- [ ] Scatter, parallel coordinates and the metric map moved into `@bitbaum/chartkit` and `@bitbaum/geo-kit`, sparklines in a place's panel, and the voting-methods tally moved onto chartkit {#stats-chartkit-move}
- [x] Axes as versioned definitions with their author, scored only among the places shown, with weights the reader sets in the link. Two examples ship, credited as examples: how much of the economy passes through government, and where tax is collected; neither says which end is better. A reader builds an axis of their own from the measures, the direction of each and a weight, in the link {#stats-axes}
- [ ] The other axes from the conversation (collectivism and individualism, ease of exit for a person or a sub-group, economic against personal freedom), which need series nobody has loaded yet; each is added with its publisher and licence {#stats-axes-more}
- [ ] Who lobbied, beyond who voted: registers of interests and the published positions of bodies, where a publisher states them, for each event {#stats-advocates}
- [ ] More events, loaded one at a time with sources someone read: more tax and firearms laws, and the laws behind each loaded series {#stats-events-more}
- [ ] What a place claims (its constitution, its statutes) kept apart from what it achieves, as separate metrics on the same axis {#stats-claims}
- [x] Saved chart views and saved axes, stored under the sha256 of what they show, shared by link, and attached to a proposal as evidence when its text links one {#stats-views}
- [x] Dimensions held in three layers (what the law says, what happens in practice, what results), never collapsed to one score: each measure ranked place by place, one measure against another with the gap, one place over time, and a layer with no series saying what would fill it. Taxation is loaded: the statutory top rate and the average tax wedge (law), tax revenue and expenditure (outcome); the practice layer waits for tax-gap series {#stats-layers}
- [x] Data integrity plumbing: a publisher's reliability flag kept on every figure and drawn on the charts, a series-quality report (gaps, large steps, stale, provisional) on every page and as `statistics:quality`, and `statistics:verify`, which checks every page a record cites for the words the record relies on, run weekly {#stats-quality}
- [ ] The compass as data (compulsion started with military service; the rest below): collectivism–individualism read as compulsion and exit, from measures coded from the law (conscription, compulsory insurance, compulsory membership, exit tax, cost and time to renounce citizenship, right to resign from an association), each linked to its provision, with the dimension and its weights a group can adopt {#stats-compass}
- [x] Exit measures first among them, coded from the law on an `exit` dimension: giving up citizenship (Switzerland, Estonia and the United States all 1, on stated conditions; Estonia medium confidence because its release route allows refusal) and the tax on leaving (United States 2, all assets above an exclusion). The practice layer waits for counts of renunciations and refusals {#stats-exit}
- [ ] Exit for a sub-group: secession and the right of a commune or canton to change its state, and the right to resign from an association, coded the same way; the departure tax for Switzerland and Estonia from a reading of the whole tax act {#stats-exit-more}
- [x] Coded assessments: a rubric registry and an `assessment` record kind in the append-only log; a coding names its rubric version, a point of the written scale, the provisions and quotes it was read from, a confidence and its reason, and shows as awaiting a second reader until a person other than the coder is named. First codings, from the statutes: compulsory military service in Switzerland and Estonia (2) and the United States (1, medium confidence), and compulsory health insurance in Switzerland (2) and the United States (1, the duty stands, its payment is $0), on the `compulsion` dimension {#stats-assessments}
- [ ] Second readers for the first codings, then more places and more rubrics (compulsory insurance, compulsory membership, exit tax); the cannabis possession example for Liechtenstein and Monaco waits for readable law texts {#stats-coding-more}
- [x] Charts screened for sense and every page readable with help: a figure outside its plausible band is left out and listed, places read at different dates, trends from too few figures, thin rankings and scatters carry warnings; each page's figures become numbered plain-words facts, and an AI explanation (and answers to a reader's question) is written from those alone and checked before it is shown {#stats-explain}
- [ ] The same explanation on event pages and the compare and axis views, and a check of an explanation's reasoning by a second model {#stats-explain-more}
- [x] How the rankings are made: nine indexes of freedom and governance (Fraser, Cato/Fraser, Heritage, Freedom House, V-Dem, World Bank WGI, RSF, the Regional Authority Index, OECD fiscal decentralisation) described the same way on `/statistics/methods`: who makes each, what it says it measures, how, its parts, whether its data may be shown, what has not been read, the same critical questions for every index of a kind, and an AI explanation from what was read only {#stats-methods}
- [x] One country registry for all of Solon (`config/world/countries.ts`, from Natural Earth): the law globe, the statistics map and the OECD sources read their codes from it, and a test fails when anything names a country it lacks (`docs/design/2026-11-places-ssot.md`) {#places-ssot}
- [x] Every country a place: a `world` pack holds the nation level of all 235 countries no other pack holds, generated from the registry (`pnpm run places:world-countries`); every country gets the World Bank's indicators and the OECD's tax series go to its 38 members, sources generated from the registry and staggered through the morning so no publisher sees a burst (the OECD allows about 60 requests an hour) {#places-world}
- [x] The World Bank's six governance indicators (voice, stability, effectiveness, regulation, rule of law, corruption; CC BY 4.0) for every country, on a `governance` dimension that says plainly they are perceptions of 35 sources and estimates, beside empty law and results layers that say what would fill them {#stats-wgi}
- [x] Deep research with AI (`/statistics/research`): a model with read-only tools reads Solon's series, dimensions, method descriptions and law (and the web where a backend is set) for up to three rounds; every fact a tool returns becomes a numbered source and the report is written from those alone and checked like every other explanation, with the sources always listed {#stats-research}
- [ ] Findings kept: a research finding a person confirms becomes a curated record or a method entry, with its evidence words checked weekly {#stats-research-keep}
- [ ] The practice layer for the first dimensions: tax compliance and the tax gap, then drug-law enforcement where a publisher has figures {#stats-practice}
- [ ] Published freedom indexes' components, credited to their publisher and only where their licence has been read and allows it. Licences read (`docs/design/2026-11-index-licences.md`): World Bank WGI is CC BY and loadable; OECD subnational data likely; Fraser, Heritage, Cato, Freedom House, V-Dem (share-alike), RSF and Henley are not {#stats-indexes}
- [ ] Law-change markers drawn on the line and paired bars for one place, both added to `@bitbaum/chartkit`, and small multiples {#stats-chartkit-features}
- [ ] A group adopts a dimension, its layers and its codings as policy, amended by vote, every mapping in the append-only record {#stats-dimension-policy}
- [x] A group's own axes and weights, voted as its `statistic_axes` policy and read by `/statistics?org=`; the page pre-fills the proposal with the exact content, and the binding version is filed through the API like every policy {#stats-governed}

### A record anyone can prove complete {#proof}

Signed votes let anyone recount a decision. The next step is proving that
nothing was left out: the record as one chain, its head anchored where no
one, Solon included, can rewrite it.

- [ ] Each audit event carries the hash of the one before it {#proof-chain}
- [ ] The chain's head anchored to Bitcoin with OpenTimestamps, regularly, and the proofs published {#proof-anchor}
- [ ] Every movement of a watched treasury shown beside the decision and the rule text that allowed it {#proof-money}

### Admission by vote

Someone asks to join; the members decide; the record shows who admitted whom.
The next biggest ease win after one-click voting.

- [ ] A signed-in visitor can ask for a seat
- [ ] A `MEMBERSHIP` proposal admits, suspends or removes a member on close

### Partner approval as a signed vote

The fleet's partner track — learner, candidate who builds one real project,
partner who runs a tenant on the box and registers client sites — needs its
approvals decided by members, not by an operator. Each application is a
proposal; the members vote; the reason is published with the decision so
anyone can read why a partner was admitted or refused.

- [ ] A partner application files as a proposal in the fleet's organization
- [ ] The decision document names the applicant, the outcome and the reason
- [ ] Loki reads the decision before granting a tenant

### Revenue-share rules as governance rules

How a product's revenue is shared with partners and originators is a rule, and
rules are voted. `originator_share` v1 already routes value to originators as a
policy; the partner revenue share follows the same shape — a deterministic split
anyone can recount, changed only by an `ALLOCATION_POLICY` vote, with payouts
flowing through OrangeCat.

- [x] `originator_share` v1: a deterministic split, pinned by content hash {#originator-share}
- [ ] A revenue-share policy for partners, versioned like every other policy
- [ ] OrangeCat reads the current version before a payout, never a copy

### One list of the kinds of group {#group-kinds}

A town, a canton, a company, an association, a network state and a charter city
all govern: they have members, rules, decisions and a record. Solon should hold
them as one kind of thing at different sizes. `jurisdictions` already separates
states from founded and proposed places; what is missing is the list of kinds
and what each must declare.

- [ ] The kinds in one config list (single source of truth), each declaring its decision rules, its membership, whether it holds money and what territory, if any, it claims
- [ ] Places and organizations read that list; no kind is named in code anywhere else
- [ ] A founding path for each kind, starting with the association and the quarter

### A place with a common fund and a budget {#commons}

A quarter such as Witikon is not a tax authority, and does not need to be one to
act as one. Anyone can found it as a place with a common fund: people give, the
group decides, and the money is spent in the open the way a commune's budget is.
The fund is OrangeCat's (an entity that can hold a wallet); Solon decides and
keeps the record. Solon's own treasury stays watch-only.

- [ ] A founded place holds a fund on OrangeCat that people can give to
- [ ] The budget as a decision: lines, amounts, a period, voted by the group
- [ ] Spending checked against the budget; the record shows what each line was used for
- [ ] A founded place's budget set beside a commune's, line by line

### Mandates and receipts: decisions that carry themselves out

A closed decision hands a signed instruction to OrangeCat (money) or Loki
(work), and their report comes back to the record. A Solon decision stays
evidence, not authority: each executor re-verifies the signatures itself.

- [ ] Mandate documents and a receipt endpoint; every decision page shows its
      lifecycle
- [ ] Loki executor: re-verify, then act
- [ ] OrangeCat executor: treasury spend and budget allocation
- [ ] Unmandated outflow from a watched treasury raises a `SAFETY` proposal

### Hiring a manager: contracts with success measures {#contracts}

A group can hire a company to run what it needs, which hires others for waste,
security or sanitation. Each is a contract judged by measures, paid for results,
and replaceable by vote when it fails. In Solon a contract is a mandate (above)
with terms: who, to do what, paid how, judged by which measures, until when.

- [ ] A mandate carries its terms: scope, payment, measures, end date
- [ ] The measures, who measures them and who may dispute a reading are charter data, not code
- [ ] Renewal, and replacement of a contractor, by vote; the record keeps the reasons
- [ ] A contractor's subcontractors visible in the record

### Passkeys and other signers

Bitcoin is one signer, not the door to a seat. A passkey gives a recountable
signature with no wallet; the charter sets the minimum assurance per category.

- [ ] Passkey (WebAuthn) signing
- [ ] Per-category minimum assurance level in the charter
- [ ] Emailed ballot links

## Later

### Bank accounts, not only Bitcoin

Import bank statements (camt.053) so every payment is matched against the
decision that allowed it, for groups whose money is in a bank.

### Deliberation

Discussion threads and amendments on a proposal before it opens, so the record
holds the reasoning as well as the result.

### One legislature for the stack

OrangeCat's groups become Solon organizations and OrangeCat's own group
governance retires, so there is one place a decision is made.

### The Verein template and a first pilot association

A rule template written for the Swiss association (Art. 60 ZGB), with the
Protokoll a general meeting must produce, and a pilot group running on it.

### Explainers from the record {#stats-explainers}

Short narrated summaries generated from a saved chart view and its law
timeline, every claim linked to its series and its articles. Not soon; the
saved-view format is kept free of anything that would block it.

### Groups of groups, and leaving with your record

Organizations join a larger one as members, each voting by its own internal
decision. Any organization can export its whole signed history and take it to
another host, where it can be checked again — with OpenTimestamps anchoring and
publication over Nostr so the record outlives any one server.

## Shipped

### Places: every Swiss commune, and its income tax at your income

`/places` maps every Swiss commune, coloured by the income tax at your income;
`/compare` puts places side by side; `/api/v1/places` serves the same data.
Church tax, wealth tax and fixed per-head taxes are not included. A commune
whose canton tariff or local multiplier is not modelled yet is drawn as having
no data; `/places/coverage` shows how much is covered.

Liechtenstein is on the map too since 2026-10-22: its eleven communes and its two
regions, Oberland and Unterland, found by name and by postcode (the postcodes
come from swisstopo's official directory). It has no tax model yet, so it shows
no tax figures.

### One-click governance, Bitcoin optional

A seat no longer needs a wallet. A signed-in member claims a seat, founds an
organization, files a proposal and votes with one click; each act is recorded
as Solon's record (`proof: ACCOUNT`). Anyone who wants a vote others can
recount signs with their own Bitcoin key (`proof: BIP137`), and agents always
sign.

### Who decides: one person, everyone, or elected delegates

An organization chooses at founding whether the founder decides, everyone
decides, or elected delegates decide for a term. Mandates narrow the electorate
and never widen it; a category the organization keeps humans-only stays
humans-only under every structure.

### Six ways to count

Yes or no, consent, approval, dots, scores and ranked choice, each with its own
signed ballot encoding — the signature covers the whole ballot, so nothing can
be changed in transit.

### Five rule templates

Town, association, co-op, collective and company board, compared rule by rule
on `/governance/profiles`.

### Founding is permissionless

Any signed-in account may found an organization; the organization,
the founding seat and both audit events land in one transaction. An
organization is attributed to a Loki project only through a grant Loki signed.

### Value routing to originators

`originator_share` v1: 10% of a product's net revenue to the originators of the
code it is built from, equal per originator, monthly, in Bitcoin, on a public
ledger — a deterministic split anyone can recount.

### The record, self-verifying

Append-only audit events, versioned policies, and `GET /api/v1/decisions/{id}`
returning the full signed record so anyone can recount a tally.

### Open books, watch-only

The treasury stores addresses to observe and never keys or funds; balances are
read straight from the chain, and there is no code path that can spend.

### Governance, taught from the product's own code

`/governance` and its lessons — methods, thresholds, who decides, profiles,
the ideas behind Solon, a new era — with every tally computed by the same
function that counts a live session.

### Five languages

English, German, French, Italian and Russian, with English as the source; a
page not yet translated says so in the reader's language.

### Accounts: Solon's own, or OrangeCat's

Create a Solon account with an email and a password or a passkey, with
two-step codes, or continue with an OrangeCat account. A session grants no
seat: a seat comes from founding or from a vote of the members.
