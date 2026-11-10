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
- [x] The law in the reader's language: a machine translation, labelled, cached by the hash of the words it translates and checked before it is kept, with the authentic text a click away; titles in lists too {#law-translated}
- [x] Every configured word in the reader's language: rubrics, budget lines, tax forms, sources and who published them, from one catalog keyed by the English, a test failing while any is missing {#i18n-config}
- [x] A code printed as a page that links its Word file is read from the file, article by article; held stubs read again with `--stubs` {#law-documents}
- [ ] Signing a proposal or a support with one's own Bitcoin key from the page (the API takes signatures today; the page offers one click) {#law-sign-on-page}
- [ ] A conversation under each proposal, the fleet's shared comment thread {#law-discuss}
- [ ] The official route for each place, as data: who can put a change on the ballot or before the legislature, how many signatures in how long (a federal popular initiative in Switzerland: 100,000 in 18 months), with the source of each rule {#law-route}
- [ ] A proposal that reaches the place's bar is handed on in the form the authority accepts, with its supporters counted and the record linked {#law-handoff}
- [ ] What applies here: pick a point and see every layer of law in force there — federal, state or canton, commune — each with "propose a change" {#law-here}

### Contested law: one place, two sets of law, side by side {#contested}

Where a place governs itself and another state regards it as its own, two sets
of law claim the same people. Solon sets them side by side, question by
question, in each side's own words, so the trade-offs can be argued about the
substance; it never says which side is right (design:
`docs/design/2026-11-contested-law.md`).

- [x] Every place the world list marks as claimed has a comparison page and its place pages link to it; South Ossetia and Georgia compared on six questions (territory, who may propose a law, taxes, citizenship, moving and leaving, defence), each quote checked weekly {#contested-p1}
- [x] What each side's public budget rests on, from its own budget law, with what the figures say by arithmetic about spending the same without what was received (South Ossetia 2023: 81% of revenue was aid from the Russian Federation) {#contested-ledger}
- [x] South Ossetia's official route: a bill reaches the Parliament through any one deputy (Constitution, Art. 69); "propose a change" on every held article of the comparison {#contested-route}
- [ ] The codes the South Ossetian Parliament publishes as Word files read into articles, so the Tax Code can be amended article by article (design: `docs/design/2026-11-from-comparison-to-change.md` §4) {#contested-codes}
- [ ] Safe support where proposing is risky: counts without lists, a new pseudonym per proposal, commitments instead of account ids in the public log, a page that says what is kept; before any outreach (§5) {#contested-safe-support}
- [ ] A tax proposal shows its static effect on own revenue against the ledger; every budget-execution law as a series {#contested-proposal-money}
- [ ] The deputies, from the Parliament's own page, and the hand-over: the redline, the count per electorate and the log hash, sent to deputies who choose to receive them, their answer recorded {#contested-handover}
- [ ] Support counted per electorate and tier (declared, vouched, attested), never summed (§6) {#contested-electorates}
- [ ] Reach: a Telegram bot through chatkit, a signed static mirror, an onion address {#contested-reach}
- [ ] Georgia's law in the register (matsne.gov.ge refuses automated readers; a dated archive copy read from the box), the statutes each constitution defers to on both sides, and the compulsion and exit rubrics coded for both with a second reader {#contested-statutes}
- [ ] What each side's law says about acts, documents and property made under the other's, as its own question {#contested-recognition}
- [ ] Abkhazia, Transnistria, Northern Cyprus, Somaliland and Kosovo read the same way: config and readers, no new code {#contested-more}
- [ ] Land one state administers and another claims (the areas disputed by Russia and Ukraine): sourced `claims` and `administers` rows, both countries' registers, the area hatched on the atlas {#contested-areas}
- [ ] Layered regimes, where law applies by zone and by who a person is (the West Bank and its settlements, Gaza): each layer from its own sources, two readers before it is shown {#contested-layers}
- [ ] Results on each side (each statistics office's own series) beside the texts, and terms for a place proposed with support counted per electorate, never summed {#contested-results}

### Budgets: what governments raise and what they spend it on {#budgets}

Every place's public money on one model: what came in and from where, what it
was spent on down to the group, whether it balanced, how it moved over the
years and who pays for it, each figure linked to its law or statistics office,
any two budgets comparable on the same classifications (design:
`docs/design/2026-11-budgets.md`).

- [x] The model: COFOG and ESA 2010 taxonomies in config, scope in every key, metrics and sources generated from them; budget laws as documents held to their stated totals; one `Budget` shape and pure analysis for both {#budgets-model}
- [x] Eurostat's government finance for 30 countries from 1995, spending by function and group, revenue by kind, the balance, in shares of GDP; every division also a statistic with its map and ranking {#budgets-eurostat}
- [x] `/budgets` and `/budgets/<place>`: key figures, who pays, what the money is spent on with every division opened into its groups, where it comes from, the years, the sources and the publisher's own lines, and "propose a change"; a budget card on a country's page; the contested places' budget section through the same components {#budgets-pages}
- [ ] Sub-national budgets (cantons, communes) and Solon organizations' budgets as holders {#budgets-entities}
- [x] Every amount in the reader's currency (US dollars by default; EUR, CHF, GBP, RUB, GEL), chosen once and remembered across the site,, converted at the budget year's average rate from official publishers, beside its share of GDP {#budgets-money}

- [ ] The money code (`src/lib/money/`) moved into a fleet package, so OrangeCat and every product convert the same way {#money-package}
- [ ] The IMF's Government Finance Statistics for the countries Eurostat does not cover, after its licence is read {#budgets-imf}
- [ ] A proposal that names categories and amounts, its effect on the balance computed; a page comparing places function by function {#budgets-proposals}

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
- [ ] Second-level subdivisions (districts, counties) from geoBoundaries, loaded a country at a time like the first level, and villages under 1,000 people (GeoNames cities500). geoBoundaries carries a licence per country (Public Domain for the United States, swisstopo's terms for Switzerland, "Data license Germany – Attribution – Version 2.0" for Germany, read from its API on 2026-11-09), so each country's licence is read against the policy before its file is built, not the set loaded in bulk {#places-globe-more}
- [ ] Every state's counties, and each state's own income tax beside the federal one {#places-us-states}

### Scope and order: what we load, where, and why {#law-scope}

The goal is every law and regulation of every place. The way to get there is to
be deliberate: loading everything at once takes forever and most of it would
never be read. The rules below decide what is loaded next, so a load is never
started because a source happens to be easy.

**How a layer is chosen**

1. **Only places on the owner's list.** A country, state or city is loaded
   because the owner asked for it, in this order. Nothing else is scheduled, and
   nothing is loaded "for completeness" before the list is done.
2. **Wide before deep.** A whole layer of a place (its national law, then its
   states, then its counties and municipalities) before the next place.
   Rules that bind the most people come first within a place; rules made close
   to the people they bind are never a footnote, and follow.
3. **Sized before loaded.** Each layer starts with a sizing note: how many acts,
   who publishes them, in what form (XML, HTML, PDF only, scripted page), under
   what licence, how often they change, how fast the publisher lets a reader go.
   A layer whose sizing note is missing is not loaded. A layer that cannot be
   read yet is recorded as blocked, with the reason, not dropped.
4. **One shape for every layer.** Every layer is the same three things: acts,
   dated versions, and provisions with the publisher's address and a hash.
   Because proposing a change pins to the hash of the text it amends, a
   proposal, a redline and support work the same on a federal act, a county
   ordinance or a municipal regulation, in any country. A new place is
   configuration and one adapter, never a new schema or a new proposal path.
   Anything that would need a place-specific table is a design question first.
5. **Measure the pace.** Publishers set the speed (the UK's robots.txt asks for
   one request every five seconds). Throughput is measured per load and written
   here, so a plan says how long a layer takes before it is started.

**Order, and where each stands** (counts as of 2026-11-10; "of" is what the
register lists)

Tier 1, the first list
- [x] Switzerland: the Confederation, the 26 cantons, the intercantonal
      agreements: about 25,000 texts
- [x] Liechtenstein: 3,412 of 3,412
- [ ] Estonia: 9,957 of 10,375; its municipalities' own regulations are not read
- [x] Luxembourg: 1,134 of 1,134, from Legilux. Luxembourg was asked for by the
      owner.
- [x] Wyoming's statutes and Constitution (45 of 45 files); its administrative
      rules and referendum route are open
- [ ] The twenty most populous Swiss cities: loaded for Zürich, Winterthur,
      Luzern, Lausanne, Geneva, St. Gallen, Biel, Lugano, Fribourg, Neuchâtel,
      Sion, Thun, Chur, Schaffhausen, Köniz, Bellinzona, Vernier. Bern and La
      Chaux-de-Fonds are blocked: both publish their lists with scripts, and
      each needs its own reader. Basel is a canton and is covered as one.

Tier 2, the large legal systems around them
- [ ] European Union: 7,103 of 17,615. Measured about 470 acts an hour, so about
      a day. The newest consolidated texts answer "not found" until published,
      and are read on a later run.
- [x] Austria: 10,681 of 10,681 (federal). Its Länder are open.
- [x] Germany: 5,976 of 6,174; 167 acts have no text in the portal's XML. Its
      Länder are open.
- [ ] United Kingdom: 5,006 of 11,228, about 420 an hour at the site's own pace.
      The devolved legislatures (`asp`, `ssi`, `anaw`, `asc`, `wsi`, `nia`,
      `nisr`) are open.

Tier 3, the mission jurisdictions: unsized, each needs its sizing note first
- [ ] United States, federal: the United States Code (and later the regulations
      and the Federal Register). The Code is published free by the Office of
      the Law Revision Counsel; to be sized.
- [ ] United States, states: Wyoming first (done), then New Hampshire (partly
      loaded), Texas, Florida and Delaware, then the rest, one sizing note each.
      Fifty states publish in fifty forms and under different licences; the
      strategic question is which few matter, not how to load all fifty.
- [ ] United States, counties and municipalities: Grafton, New Hampshire, first
      (the warrant-article route is already recorded). Many municipal codes sit
      with commercial hosts (Municode, American Legal Publishing); sized
      county by county, and only for places a group on Solon asks about.
- [ ] Microstates, DIFC and ADGM, Singapore, charter cities: each after its
      sizing note, in the order the owner sets.

**Not scheduled:** every country, state or city not listed above. They are added
only when the owner asks, and the first step is always its sizing note.

**Known gaps in what is already loaded:** Bern and La Chaux-de-Fonds (above);
Germany's 167 acts without text; Estonia's 418; Fribourg's 8, Zürich's 17,
Chur's 2 and Schaffhausen's 1 acts; the reasons are known for Fribourg's (a
bot check, and acts with no PDF on their page) and not yet for the others.

### Liechtenstein, finished: the first country with every level {#li-done}

Liechtenstein is the country every later one is built on, and the first where a proposal made on
Solon can become real law (the Landtag and the people decide; Solon is evidence of support, handed
on, never law itself). So "done" is a list that is checked on production, not a feeling. A line is
ticked only when it has been checked and the check is named.

Law, at every level
- [x] The nation: 3,412 of 3,412 acts with text from gesetze.li, read again every week
- [x] The eleven communes' own regulations (337 acts; Triesenberg's from the Internet Archive's
      dated copy, labelled as such)
- [ ] Text accuracy: a random sample of 30 acts holds at least 99% of its pages' words, on two
      samples in a row, footnotes and act headers aside (`law:text verify --authority li`). Now:
      95.8% on one sample; the remaining gap is mostly act headers; the check ignores headers next
- [ ] The communes' PDFs checked the same way (the check reads HTML only): how many were read from
      a text layer and how many by OCR, and the OCR ones read by a person
- [ ] Every act the register lists is held, and none held is gone from the publisher (one held
      address answers 404 today)
- [ ] Earlier versions and what changed between them, from the day Solon first read each act; the
      publisher gives no effective dates, and the page says so

Reading, in German first
- [ ] Every page of the law, the places and the proposal flow in German, with no "not translated"
      notice, written in Liechtenstein's own legal vocabulary and read by a native speaker
- [ ] The country page shows law per level (nation, then each commune with its own count); the two
      counts the atlas and the Law page show agree and say which is which
- [ ] The atlas shows Liechtenstein as its own places, one outline, communes named, phone first

Changing the law
- [x] The official routes recorded and cited to the article: initiative and referendum for a law
      and for the Constitution, and the municipal assembly's
- [ ] The routes shown on the act page and on the propose page, in German, before anyone files
- [ ] The whole flow tried end to end on production by a person: find an act, propose a change to
      an article, see it as a redline pinned to the text, support it, see the route's bar beside
      Solon's count, and read that it is not law
- [ ] How a proposal that reaches the bar is handed on to the Landtag or the Government, written
      with the people who will receive it (a decision for them, not for Solon)

Statistics
- [ ] A named list of series for Liechtenstein, each with its publisher and date. Today none loads:
      the World Bank's API answers the box HTTP 403, so no World Bank series has ever loaded
- [ ] The tax model's rates read against the published tariff, with the article

Keeping it true
- [ ] The weekly sync demonstrably reads the nation and every commune, and a failure is reported,
      not silent
- [ ] Every claim on the pages ("word for word", counts, dates) is read from the data or verified

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
- [x] Coded assessments: a rubric registry and an `assessment` record kind in the append-only log; a coding names its rubric version, a point of the written scale, the provisions and quotes it was read from, a confidence and its reason, and shows as awaiting a second reader until a person other than the coder is named. First codings, from the statutes: compulsory military service in Switzerland and Estonia (2) and the United States (1, medium confidence), compulsory old-age provision in Switzerland and the United States (both 3: a duty to a public scheme with no way out), and compulsory health insurance in Switzerland (2) and the United States (1, the duty stands, its payment is $0), on the `compulsion` dimension {#stats-assessments}
- [ ] Second readers for the first codings, then more places and more rubrics (compulsory membership, compulsory voting, exit tax; Estonia's pension insurance and Switzerland's and Estonia's departure tax wait for a reading of the provisions); the cannabis possession example for Liechtenstein and Monaco waits for readable law texts {#stats-coding-more}
- [x] Charts screened for sense and every page readable with help: a figure outside its plausible band is left out and listed, places read at different dates, trends from too few figures, thin rankings and scatters carry warnings; each page's figures become numbered plain-words facts, and an AI explanation (and answers to a reader's question) is written from those alone and checked before it is shown {#stats-explain}
- [ ] The same explanation on event pages and the compare and axis views, and a check of an explanation's reasoning by a second model {#stats-explain-more}
- [x] How the rankings are made: nine indexes of freedom and governance (Fraser, Cato/Fraser, Heritage, Freedom House, V-Dem, World Bank WGI, RSF, the Regional Authority Index, OECD fiscal decentralisation) described the same way on `/statistics/methods`: who makes each, what it says it measures, how, its parts, whether its data may be shown, what has not been read, the same critical questions for every index of a kind, and an AI explanation from what was read only {#stats-methods}
- [x] One country registry for all of Solon (`config/world/countries.ts`, from Natural Earth): the law globe, the statistics map and the OECD sources read their codes from it, and a test fails when anything names a country it lacks (`docs/design/2026-11-places-ssot.md`) {#places-ssot}
- [x] Every country a place: a `world` pack holds the nation level of all 235 countries no other pack holds, generated from the registry (`pnpm run places:world-countries`); every country gets the World Bank's indicators and the OECD's tax series go to its 38 members, sources generated from the registry and staggered through the morning so no publisher sees a burst {#places-world}
- [x] The World Bank's six governance indicators (voice, stability, effectiveness, regulation, rule of law, corruption; CC BY 4.0) for every country, on a `governance` dimension that says plainly they are perceptions of 35 sources and estimates, beside empty law and results layers that say what would fill them {#stats-wgi}
- [x] Deep research with AI (`/statistics/research`): a model with read-only tools reads Solon's series, dimensions, method descriptions and law (and the web where a backend is set) for up to three rounds; every fact a tool returns becomes a numbered source and the report is written from those alone and checked like every other explanation, with the sources always listed {#stats-research}
- [x] What is measured, and where it is not (`/statistics/gaps`): for a topic, what each place's statistical office collects and publishes, crossed with what and under what law (read from the office's own pages, each checked weekly, what was not read listed as unread), where the answer exists in one place and not in another, what would have to accompany a new measure so it is not misread, the objections with their safeguards, and who decides; with a position a group can propose and the checked AI explanation. First topic: crime by a person's background, for Denmark, Sweden, Norway, the Netherlands, Germany, Switzerland, the United Kingdom, the United States and France (where a decision of the Constitutional Council bars studies resting on ethnic origin or race) {#stats-gaps}
- [x] Navigation that scales: a header of four panels (Law, Places, Data, Governance) of four or five links each, a Find palette (button, Ctrl or Cmd + K, or "/") over pages, statistics, places and laws, the mobile menu as folds, and an engineering audit (`docs/design/2026-11-engineering-audit.md`) with import cycles gated in `verify` {#site-navigation}
- [ ] The audit's debt, in order: law authorities derived from places, a page's name written once, translation coverage, the large files {#site-debt}
- [ ] More topics and places for the gaps registry: the tax gap, enforcement of drug-possession law, clearance rates by offence, and the countries Solon models (Estonia's and Liechtenstein's offices were not read); the offices that block programs (France's Interior Ministry answers 403) read by a person and marked so {#stats-gaps-more}
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

### States through time {#time}

The atlas set to a date (1990, 1980, 1945, 1914, 1900) shows the states that
existed that day, their borders, and the law in force, asked the same questions
as today's places so the two can be compared. Disputed borders are shown as
[contested law](#contested) is: each claim sourced, no side taken. Nomadic
polities with no fixed border are drawn as a range, not a line. Why, and what
is hard about it: `content/blog/2026-11-10-states-through-time.md`.

- [ ] A time control on the atlas over the dates Solon already holds (Switzerland and Liechtenstein, from [earlier versions of every act](#law-history)) {#time-control}
- [ ] Historical borders from a sourced dataset (CShapes 2.0 from 1886; older maps marked as approximate), each state linked to the states before and after it {#time-borders}
- [ ] Historical constitutions on the same questions as today's places (who decides, who votes, how rules change, whether people may leave), from the Comparative Constitutions Project and the texts themselves {#time-constitutions}

### What if: states that never were {#whatif}

A scenario is a fork: a sourced starting state on a date, plus the changes a
person proposes (a border moved, a union kept, a constitution swapped), thought
through by the same assistant that thinks a law change through. Always marked as
a scenario, never shown as fact; anyone can fork anyone's. First candidates:
Iceland and Norway never independent, Singapore in Malaysia, Ireland never
independent, Northern Ireland's three options, the Icelandic Commonwealth set
beside a modern constitution.

- [ ] A scenario as data: starting state and date, changes, sources, and what is invented marked as invented {#whatif-model}
- [ ] Think a scenario through: likely effects, who gains and who pays, where something like it happened, each claim cited {#whatif-consult}

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
