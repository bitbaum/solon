# Changelog

What changed for the people who use Solon, newest first. Every entry comes
from a merged pull request in this repository; the number in brackets is the
one to read for the detail. Fixes get the same weight as features.

## 2026-11-08

### Added

- **Winterthur, St. Gallen and Biel/Bienne.** Three of Switzerland's largest cities keep
  their regulations in the same kind of collection as Zug's and Glarus's communes, and
  Solon is now set to read them the same way: every act with the day each version took
  effect, cut into articles, from the first load on Solon's server. A question that names
  Winterthur, Biel or Bienne, or St. Gallen asks the city's own law as well as the
  canton's.

- **Estonia and Liechtenstein drawn on the atlas.** Liechtenstein's eleven communes come
  from the same swisstopo boundary file as Switzerland's; Estonia's municipalities from
  the Land Board's own file, read again each month, so opening either country on the
  atlas now draws its places. {#globe-deep}

- **The United States in Places.** The nation, its fifty states and the District of
  Columbia, and Wyoming's 23 counties, by their FIPS codes from the Census Bureau;
  opening the United States on the atlas draws Wyoming's counties from the Bureau's
  boundary file. Its tax for 2026: the federal income tax for a single person and for a
  married couple filing jointly, from the IRS's own figures (Rev. Proc. 2025-32: the rate
  tables of section 4.01 and the standard deduction of 16,100 and 32,200 dollars of
  section 4.14), and Wyoming's own income tax, which is none (W.S. 39-12-101), recorded as
  zero. The estimate says what it leaves out: Social Security and Medicare, credits,
  itemized deductions and the other filing statuses. A question asked on a Wyoming
  county's page is asked of Wyoming's law. {#places-us} {#places-us-tax} {#law-wy-places}

- **One atlas.** The globe on the home page and the map on Places are one now. Tap a
  country and the Earth turns to it and draws its places, coloured by what tax would
  cost you there; beside it, how much of its law Solon holds with a link to read it and
  propose changes, and where every figure comes from. The long lists of levels and
  sources under the map are gone: a place is found by tapping it or searching. A view
  can be shared: `/places?in=ch`. {#atlas}

- **Think a change through before you file it.** Under the form for proposing a change
  to a law, the assistant now reads your draft as it stands and answers what you ask
  about it: what it would change, what would likely follow, who would gain and who
  would bear a cost, and where something like it is already law, from the law Solon
  holds and from studies and the experience of other places on the web. Every claim
  cites its source; it takes no side, and the proposal stays yours. {#law-consult}

- **The assistant knows every place Solon holds.** Questions about Estonia's and
  Wyoming's law are now searched in Estonian and English, as their law is written,
  not in German.

- **When a publisher refuses Solon's reader, the law comes from a dated public copy.**
  If a commune's site answers with a refusal (HTTP 403, 429 or 503, or a bot check in
  place of the page), Solon reads the newest copy the Internet Archive's Wayback Machine
  holds of that page or document, and keeps the publisher's own address as the act's.
  The act page says so in plain words: "Copy read on {date} from the Internet Archive's
  copy of {date}", with a link to that copy, in all five languages; the Markdown for
  machines names it too. Solon still says who it is and solves no challenge. Triesenberg,
  whose site answers with a bot check, is the first commune read this way, the eleventh
  of Liechtenstein's eleven. {#law-communes}

- **A light theme.** Solon follows your device: light when it is light, dark when
  it is dark. The new button in the header lets you pick Light, Dark or Device, and
  your browser remembers it; nothing is sent to us. Photographs, and the header over
  them, stay dark so the words on them can be read. The law globe and the Places map
  redraw in the theme you pick. {#theme-light}

- **A reader for New Hampshire's statutes.** Solon can now read the Revised Statutes
  Annotated from the General Court's site: every chapter as an act ("RSA 39"), each
  section with its heading, its text and its source note, repealed sections kept as
  the site marks them. Where the site's firewall answers "Web Page Blocked", as it did
  to Solon, the chapter comes from the Internet Archive's dated copy and the act page
  says so. A firewall's block page is now recognised as a refusal for every publisher,
  not taken for the law. The first load runs on Solon's server and has not run yet,
  so New Hampshire's law is not on the site today; the roadmap item stays open until
  it is.

### Fixed

- **A law read from an old archived copy is read again from a fresh one.** When the
  newest copy the Internet Archive holds of a refusing site's page is more than a year
  old (one New Hampshire chapter's was from 2007), Solon first asks the archive to save
  the page today, from its own network, and reads that; the old copy is read only when
  no fresh one can be had, and its date is shown as before.

- **The assistant's answers about a proposed change keep closer to the evidence.** It now
  looks for precedents nearest first (the same country's other levels, neighbouring
  cantons and countries) instead of anywhere at all, labels an effect it reasons out as
  reasoning rather than as something observed elsewhere, and suggests follow-up
  questions in the language of the answer.

- **Documents read from the archive arrive whole.** A site that refuses Solon's reader
  for every document sends dozens of requests to the Internet Archive at once; the
  archive drops some, and some of its captures of a PDF are cut short. Solon now asks
  again after a dropped connection, passes over a PDF that did not arrive whole for the
  capture before it, and turns to the archive when the site does not answer at all.

- **A site whose newest archived copy is its own bot check is read from the copy before.**
  When the Internet Archive's latest capture of a refusing site is the challenge page
  too, Solon now walks back through the earlier captures, newest first, and reads the
  newest one that is the page itself. The act page still names the copy and its date.

- **Scanned regulations read blank.** Most communes scan their regulations as fax- or
  JBIG2-compressed images, and the PDF reader drew those pages blank, so Solon reported
  "no text in the PDF" and three of Balzers' regulations were missing. The reader now
  has the decoders it needs, and those pages are read by OCR like any other scan.

## 2026-11-07

### Added

- **Estonia in Places.** Its fifteen counties and 78 municipalities, by their codes in
  EHAK, the official classification (Statistics Estonia and the Land Board, version
  2026v1), each with its Estonian, English and Russian names; and its income tax, 22 %
  of what is above the tax-free income of 8,400 euros (Income Tax Act § 4 and § 23),
  the same in every municipality. Estonian places can be compared with each other in
  euros; a place in another currency asks for its own amount. {#places-ee} {#places-ee-tax}

- **The globe.** The home page shows the Earth with every place whose law Solon holds
  shaded by how much, and a dot on each so the smallest can be found; hover names it
  and counts its acts, a tap opens its law. Drawn by the fleet's map package in the
  site's own colours, from public-domain outlines (Natural Earth, the US Census
  Bureau); the counts come from `/api/v1/law/globe`. {#globe-home}

- **Estonia's law.** Every national act in force in Estonia, read from Riigi Teataja,
  the State Gazette: its register, and each act's text from the gazette's own XML,
  cut into its sections (§) with their subsections and points, dated by the day the
  publisher says it took effect, and read again every week. {#law-ee}

- **Three more of Liechtenstein's communes.** Balzers, Triesen and Mauren: each
  regulation linked from the commune's own page, about ninety in all, with forms left
  out. Ten of the eleven communes are read now. {#law-communes}

### Fixed

- **Scanned regulations could stop a whole commune's load.** Reading a scanned
  document kept every page's picture in memory until the end; ten pages scanned at
  600 dpi (a Balzers regulation) used 1.2 GB and the load was killed. Each page is
  let go once read, and the same document now needs 300 MB.

- **Estonia's register skipped some acts and listed others twice.** The State Gazette
  pages its list in an order that shifts among acts of one title, so a pass listed 77
  acts twice and missed as many; the second copy of each then failed to load. Each act
  is now listed once, and the list is read again until every act the gazette counts has
  been seen.

- **Schellenberg's regulations were placed on Mauren.** They were filed under commune
  7008, which is Mauren's number in the register; Schellenberg's is 7011. They are on
  Schellenberg now, and Mauren holds its own.

- **Liechtenstein beside Switzerland gave no tax for Liechtenstein.** A comparison
  used one tax year for every column, so Liechtenstein, whose 2026 communal rates are
  not out yet, was held to 2026 when compared with a Swiss place. Each country now
  uses its own latest complete year; the places of one country still share one.

- **Comparing Swiss places gave no tax at all.** Every comparison said "Not recorded
  yet (Canton)" because each canton's fixed per-head tax, measured and committed on
  2026-10-30, had never been loaded into the site; the estimate rightly refuses to
  treat a missing tax as zero. It is loaded, and Geneva against Zürich gives CHF
  22,351 against CHF 15,912 at a taxable income of CHF 100,000. Liechtenstein's
  income tax, communal surcharges and the cantonal and communal tax steps held in the
  repository were loaded the same day.
- **Data no longer waits for someone to load it.** Places files kept in the
  repository are imported after every deploy when they changed, and the law is read
  again from every publisher every Sunday, so nothing merged or published stays off
  the site. {#law-sync-clock} {#places-data-auto}

## 2026-11-06

### Added

- **Wyoming's law.** Wyoming's statutes and Constitution are read from the
  Legislature's own downloads, about 21,000 sections in 45 files, each with the
  publisher's link and hash, and found under Law › United States › Wyoming once
  loaded. A proposed change to a Wyoming statute shows the citizen initiative as
  its official route: who signs, the 15% bar and its spread across counties, what
  the initiative cannot do, and Article 3, Section 52 of the Constitution as the
  source. {#law-wy-statutes} {#law-wy-route}
- **Propose a change to any article.** Every article of every act Solon holds has a
  "Propose a change" link: reword it, repeal it or add an article after it, and see
  the redline against the published text as you write; speak instead of typing if
  you like. A draft survives signing in on the way. Each proposal has its own page
  with the redline, why, who supports it, the official route its law can take, and
  every revision with its hash; one click supports it or withdraws that support, and
  anyone can write an alternative. Proposed changes are listed under Law in the menu
  and on each act. {#law-redline} {#law-support}
- **The engine for amending the law.** Anyone can propose a change to an act Solon
  holds: replace, insert or repeal provisions, each change pinned to the hash of the
  exact text it amends, so a proposal never silently applies to wording it was not
  written for. Revisions never change once filed; support binds to one revision and
  can be signed with a Bitcoin key; anyone may fork. Every act lands in a
  hash-chained log anyone can verify, and the database refuses to change or delete a
  row. Each amendment shows the official route its place offers, with the provision
  that creates it. The API is at `/api/v1/law/amendments`; the screens come next.
  {#law-amend-engine}
- **Law is in the main menu.** Find a law, ask the law and what Solon holds are one
  click from every page; before, `/law` could only be reached by its address. Use
  cases moved to the footer to keep the header on one line. {#law-menu}
- **The home page leads with the open law**, and the Glarus section now stands
  beside the public ledger and open-source rules as one of Solon's roots.
- **Three more ideas behind Solon**: the public ledger (Bitcoin, 2008), rules as open
  source (GNU and git), and polycentric law.

### Fixed

- **The law coverage page said the text of the law was not held.** It has been held
  since 2026-11-01 for every federal, cantonal and Liechtenstein act in force; the
  page and the roadmap now say so. {#law-federal} {#law-li} {#law-cantons}

## 2026-10-23

### Added

- **Citations in the law chat are written so they link.** The chat's answers cite
  provisions as `[L3]`; the instruction now says no spaces inside the brackets, which
  one model had been adding. {#law-ask}
- **"And in Lucerne?" keeps its subject.** When a follow-up question has no subject of
  its own and the model cannot plan from it, the whole conversation is planned as one
  question, with the place named last added. {#law-ask}
- **A weak search plan gets a second opinion.** When the model that plans a search
  names no act, or only repeats the words of the question instead of putting them
  into the law's language, the next model in the chain is asked once more, so one
  unlucky model no longer decides whether a rule is found. {#law-ask}
- **The law chat starts from the act a lawyer would open.** The model now says which
  statutes or ordinances probably govern a question (it points; it does not answer),
  and the chat searches those acts first with the question's ideas, then reads what
  they say. One question asked twice no longer depends on which words ranked.
  {#law-ask}
- **The law chat looks wider before it chooses.** It now considers up to fifteen
  provisions per place and lets the model pick the few that apply, so a rule the
  words rank twelfth is still found. {#law-ask}
- **Search puts the fundamental act first.** A short ordinance that repeats the
  question's words no longer outranks the statute that makes the rule, and a
  search that would take too long is cut off instead of holding the database.
  A fixed set of questions (`pnpm run check:law-search`) measures whether the
  right provision is found. {#law-ask}
- **The law chat checks its own search.** After searching, it reads the headings of
  what it found, keeps the provisions that bear on the question, drops the ones that
  only share a word, and searches again for an obvious rule that is missing (the
  permit, the canton's own act). {#law-ask}
- **Search finds a provision by its ideas.** The law search and the law chat now ask for
  provisions that contain every idea of a question first (the animal and the
  permit), then the main idea alone, instead of ranking a common word like
  "permit" above the rare one that matters. The chat answers in the language of
  the question. {#law-ask}
- **You can ask the law a question.** `/law/ask` is a chat, built on the same chat as
  Loki and OrangeCat, open to everyone and in any language. It works out which
  places the question is about ("and in Lucerne?" keeps the fox from the question
  before), searches those places' provisions, and answers only from them, each
  statement linked to the provision it rests on. Search can also take several
  authorities at once.
  {#law-ask}
- **The City of Zürich's own laws can be loaded, with their history.** A reader
  for the city's Amtliche Sammlung takes each act's versions with the days the
  city states, and any other commune joins by adding one reader. The loading
  tool takes `municipal --publisher zurich-city`, and `--history` adds the
  earlier versions.
  {#law-communes}
- **The text of the law can be searched.** `GET /api/v1/law/search?q=` ranks the
  provisions in force that match, optionally by authority or language, and each
  hit names the act, the article, the publisher's page and the hash of the copy,
  so an answer built on it can cite exactly what it read.
  {#law-search}
- **Laws can be found and read on Solon.** A new page, Find a law, searches the
  register by title or number and by whose law it is; each act opens with its
  provisions, a link to the publisher, the page the copy was read from and its
  hash. A version the publisher does not date says it was read on that day.
  {#law-reading}
- **Zürich's laws can be read from the canton's own collection.** The loading
  tool takes each Zürich act's current version from ZH-Lex, the canton's PDF, with
  the day the canton says it took effect, and retires the first-pass reading of the
  same act. The constitution comes in at 139 articles, in force since 1 January
  2006. Production is not loaded yet. (#285)
- **Liechtenstein's laws are in the register.** The 3,407 acts in force in the
  Government's Systematic Register (statutes, ordinances, notices, decrees and
  treaties) are listed with their LR number, their title and the Landesgesetzblatt
  issue that published them, beside the Swiss ones on `/law/coverage` and at
  `/api/v1/law/acts?authority=li`. Names and numbers only; the text from
  gesetze.li comes next. The communes are not listed yet. (#283) {#law-register-li}
- **Solon can read Liechtenstein's laws from gesetze.li.** The loading tool
  reads each act's consolidated page, article by article, with the page it came
  from and a hash that proves the copy. Lilex does not say since when a version
  applies, so each is dated by the day it was read and marked as such. Production
  is not loaded yet. (#284)
- **Every Swiss act can point to the place that publishes it.** The register can
  now keep, for each act of the Confederation and the cantons, the address of its
  page at its own authority, and `/api/v1/law/acts` returns it as `officialUrl`.
  Production is not loaded yet. (#284)
- **Cantonal laws can be read as text.** The loading tool reads each cantonal
  act's document and cuts it into articles, with the document it came from and a
  hash that proves the copy. This is a first pass, dated by the day it was read;
  the cantons' own publications will replace it canton by canton. Production is
  not loaded yet. (#284)
- **A register of the law.** Solon now lists every act of the Confederation,
  the 26 cantons and the intercantonal agreements: 33,441 acts, 22,047 of them
  in force, each with its title and its official number, read from LexFind's
  list and counted per authority on `/law/coverage`. Acts can be found by
  authority, number or title at `/api/v1/law/acts`. Only names and numbers so
  far: the text of the laws comes next, publisher by publisher. Liechtenstein
  and the communes are not listed yet. (#281) {#law-register}
- **Solon can hold the text of the law.** The Confederation's acts can now be
  read from Fedlex, article by article, with the page they came from and a hash
  that proves the copy, and looked up as they stood on any day a held version
  covers (`/api/v1/law/provisions`). The loading tool is built and tested on
  real federal acts; production is not loaded yet, so `/law/coverage` still
  shows no text held. (#282)

## 2026-10-22

### Added

- **Liechtenstein is on the map.** Its eleven communes and its two regions,
  Oberland and Unterland, are in Places, found by name and by postcode (9490
  finds Vaduz). The postcodes come from swisstopo's official directory of
  localities, the same file the Swiss ones use. Liechtenstein has no tax model
  yet, so it shows no tax figures. (#277)
- **Places can be loaded from GitHub.** A hand-kept source, such as
  Liechtenstein's list of communes, has nothing to fetch, so the daily import
  skipped it and a later fetch that depends on it would have failed. A
  dispatch-only workflow now runs an import or a fetch on the server, dry run
  first. (#279)

### Changed

- **The roadmap records the direction.** The law as data (every law in
  Switzerland and Liechtenstein) is now the first item under Now, with a design
  and measured sizes; the roadmap also names one list of the kinds of group,
  founded places with a common fund and a budget, and contracts with success
  measures. None of these is built. See `docs/design/2026-10-law-as-data.md` and
  `docs/design/2026-10-direction-notes.md`.

## 2026-10-12

### Changed

- **A place is found with a letter wrong.** The search box on the map, and
  the name search on `/places` and `/compare`, now find a place when one
  letter of its name slipped — `Zurihc`, `Winterhur`, `Kusnaht` — and when
  its words are split differently (`st gallen` for St. Gallen). The closest
  name comes first, and the map's list marks the part of each name that
  matched. On the map, a name is now found from the start of any of its
  words rather than from any letters inside it. (#264)

## 2026-10-08

### Added

- **What /compare shows, as data.** `/api/v1/places/compare?p=` returns, for
  any place, the facts its tax model reads and the model itself — everything
  needed to estimate the tax there. It takes no income and computes nothing:
  the estimate runs wherever the income is, so Solon still never learns what
  anyone earns. OrangeCat uses it to suggest the tax share in a person's money
  rule. Listed on the integration page. [#261]

## 2026-10-07

### Added

- **The roadmap and the changelog point at each other.** Each roadmap step
  that shipped now links to the days in `/changelog` that delivered it, and
  each changelog entry that delivered a step names it, linked back to
  `/roadmap`. A goal's steps are drawn as a trail, filled where done. The
  links come from the fleet's shared building-in-public kit (bip-kit 0.6.0),
  so OrangeCat's pages carry the same ones. {#records-public}

## 2026-10-01

### Added

- **Basel-Landschaft, Schwyz, Uri and Obwalden on the map and in
  `/compare`.** Uri and Obwalden tax income at one flat rate;
  Basel-Landschaft's tariff is a formula, which Solon now reads as the law
  writes it; Schwyz's communes have a tariff of their own. All four match the
  Federal Tax Administration's calculator to the franc. An estimate now
  shows the cantonal and the communal tax as two lines instead of one.
  (#244)

- **Vaud, Schaffhausen, Nidwalden and Glarus on the map and in `/compare`.**
  These cantons round a couple's divided income to the hundred francs
  before the tariff applies, and Vaud cuts its cantonal tax by a share its
  tax law sets each year (5 % from 2026), which the Federal Tax
  Administration's tables do not carry; Solon keeps that share by hand,
  citing the law. All four match the Federal Tax Administration's calculator
  to the franc, Vaud in all its communes. (#243)

- **Ticino and Fribourg on the map and in `/compare`.** Ticino's tariff
  states the tax at each step, and in a few places that differs from what
  its rates alone would give; Fribourg's tariff gives average rates rather
  than marginal ones. Solon now reads both as the cantons publish them, and
  both match the Federal Tax Administration's calculator to the franc: two
  communes each, single and married, at four incomes, for 2025 and 2026.
  (#242)

- **Four more cantons on the map and in `/compare`: Aargau, Solothurn,
  Graubünden and Neuchâtel.** These cantons tax a married couple as if each
  earned half their joint income (splitting), which Solon could not express
  before, so their communes were grey. Their figures now come from the
  Federal Tax Administration like the others, and each was checked against
  its tax calculator to the franc: two communes per canton, single and
  married, at three incomes, for 2025 and 2026. Glarus, Nidwalden,
  Schaffhausen, Geneva, Thurgau, St. Gallen and Appenzell Innerrhoden also
  split, but do not match the calculator yet, so they stay grey rather
  than show a wrong figure. (#241)

- **A map of what tax would cost you, commune by commune.** `/places` now
  opens on a map of every Swiss commune, coloured from the lowest tax to the
  highest for your income and household. Until you enter yours, it shows an
  example income of CHF 100'000 and says so. Type an address, a place or a
  postcode into one box to jump there; tap a commune for its tax, how it ranks
  and a link to its page, and add up to four to a comparison. The same
  communes are a sortable list beside the map, and on phones the list comes
  first. Your income stays in your browser. An address you type goes from
  your browser straight to swisstopo's geo.admin.ch to be found, and Solon
  never sees it; the note under the box says so. Communes whose figures are
  not recorded yet are grey. (#240)

- **Tax figures for every commune at once, for the map.** A new public
  endpoint, `/api/v1/places/map`, gives every commune on the map with the
  tax figures that apply to it, so the map can colour each one by what you
  would pay at your income. The estimate runs in your browser, exactly as on
  `/compare`: your income is never sent. (#239)

- **Commune boundaries, for the coming map.** Solon now imports the outline
  of every Swiss commune from swisstopo's official boundaries and publishes
  them as one small file (about 220 KB) that a map can check before drawing.
  A new edition each year replaces the old one on its own. The map on
  `/places` that uses them comes next, in dark and light. (#238)

### Fixed

- **Very high incomes in Vaud.** Vaud limits its cantonal and communal
  income tax together to 30 % of taxable income. Solon did not, so a single
  person in Lausanne earning CHF 777,777 was shown about CHF 15,800 too
  much. Solon now applies the limit as the canton's law and the Federal Tax
  Administration's calculator do. (#245)

- **No federal tax below CHF 25.** The federal tax is not levied when it
  would be less than CHF 25; Solon showed the small amount anyway (CHF 3
  for a couple at CHF 30,000). It now shows nothing, as the calculator does.
  (#244)

- **Tax figures at incomes that are not round.** The calculator rounds
  taxable income down to the hundred francs before applying a tariff (in
  every canton but Solothurn and Graubünden, and federally), and Solon did
  not, so an income such as CHF 87,654 came out a few francs off. Solon now
  rounds as the calculator does, and the checks include such incomes.
  (#243)

- **Federal tax at very high incomes.** Above CHF 793,400 the federal tax is
  11.5% of the whole income. Solon approximated this and showed CHF 1.40
  too much; it now reads the tariff as published and matches exactly. The
  same correction applies to Graubünden's top rate (CHF 2.20). (#242)

## 2026-09-30

### Added

- **Compare places in six more cantons.** `/compare` now estimates income
  tax in every commune of Bern, Lucerne, Zug, Basel-Stadt, Appenzell
  Ausserrhoden and Jura, not only Zürich. Each canton was checked against the
  Federal Tax Administration's own calculator and matches it to the franc.
  Ticino and the cantons that tax couples by splitting their income follow.
  (#236)

- **Compare places: what tax would cost you in each.** `/compare` puts up to
  four places side by side. Enter your taxable income and household, and it
  shows the yearly tax in each, the difference to the cheapest, and the tax
  rates behind it (federal, cantonal and communal), each with its source. Your
  income never leaves your browser: it is not in the link and Solon never
  receives it. When this year's figures are not all published yet, the
  comparison uses the latest complete year and says so. Every place page
  links to it, and it sits in the Places menu. For now it covers the Canton of
  Zürich's communes; elsewhere it says which figure is missing.

- **Places in the header: find a place by name or postcode.** `/places` finds
  any recorded place by its name or postcode and lists every level of a
  country (cantons, communes, city districts…) with how many places each has.
  A postcode that spans several communes shows each one with its share of the
  addresses, and you pick yours. The same search is open to other apps at
  `/api/v1/places`. Places took Platform's spot in the header; Platform's
  pages are in the footer.

- **Places know their postcodes.** Solon now reads swisstopo's official
  directory of localities, so a Swiss postcode leads to the commune it lies
  in. When a postcode spans several communes (1,223 of 3,190 do), Solon lists
  each with its share of the addresses instead of guessing. Liechtenstein's
  communes and two commune-free areas in the same directory are left out on
  purpose; the import lists them.

### Changed

- **Place search without accents, amounts in Swiss formats.** "zurich",
  "Zuerich" and "Zürich" now all find Zürich, and "neuchatel" finds
  Neuchâtel. Compared amounts read the Swiss way in every language
  ("CHF 13’050", or "13 050 CHF" in French) instead of the German "13.050 CHF". (#235)

- **Every everyday page in plain words, with the details one click away.**
  The dashboard, the record and each organization's page now use the same
  layout as the rest of Solon and say what happened in a sentence ("The Cat
  joined as an AI agent.", "Agreed.", "Only people can vote on this, not AI
  agents.") instead of `outcome: APPROVED · electorate: ALL_MEMBERS`. Money
  reads in bitcoin, not satoshis. Everything exact (addresses, identifiers,
  the raw entry, the data links) is still there under "Technical details".
  The build now fails if one of these pages shows a stored code. (#226)

- **Decisions, in plain words.** The pages where members suggest things and
  vote now look like the rest of Solon and speak plainly: "Suggest
  something", "Start the vote", "Agreed", "Turned down", and the rules of a
  vote as a sentence ("All members vote; at least 50% of them must take part,
  and more than half must agree.") instead of codes like
  `SIMPLE_MAJORITY · quorum 50% · electorate ALL_MEMBERS`. Topics read "How
  money is shared" or "Spending money" instead of "Allocation policy" or
  "Treasury spend". Error messages say what happened and what to do The
  menu says "Suggest something" in every language, a finished vote says
  "Result" instead of "Result so far (weighted)", and each decision's page has
  its own title in the browser tab. (#224, #225)

- **Sign in the usual way: email and password.** "Sign in" and "Create an
  account" now open the sign-in screen straight away, with email and
  password, an emailed code, Google or GitHub. No more typing your email on
  one page to find the password on the next. You come back to the page you
  were on. (#223)

### Added

- **The deep side: a whitepaper, questions and answers, and a blog.**
  `/whitepaper` explains how Solon works in full technical detail and says
  plainly what is built and what is only designed. `/faq` answers the first
  questions people ask, plain ones first and technical ones last. `/blog`
  follows the work as it happens. All three are markdown files in the
  repository, rendered with bip-kit, the kit our products share. (#227)

- **What Places covers, counted from the data**, at `/places/coverage`: for
  each country, how many places each level holds, how many of them have each
  figure the tax estimate needs, and when each source was last fetched. A
  missing figure shows as a low count, not as silence. Place pages no longer
  claim to be untranslated in German, French, Italian and Russian. (#220)

### Fixed

- **Appenzell Ausserrhoden's tax rates are no longer held back as
  implausible.** Its canton and commune multipliers (330%–420%) were above
  the import's sanity limit of 300%, so they would have shown as "not
  recorded". The limit is now 600%, above every multiplier Switzerland
  publishes (the highest is Lungern's 525%). (#237)

- **Solon no longer opens a database connection per query.** In production
  every query started its own connection pool, so a busy page could use up
  the connections the server's apps share. There is now one pool, as intended.

- **Joining, in plain words.** The join page now looks like the rest of Solon
  and says what is going on without technical terms: who can join, how new
  members get in (a member suggests you, the members vote), and what you can
  do meanwhile. It no longer shows the name of a server setting to visitors;
  an organization nobody can join is now reported to whoever runs Solon
  instead. OrangeCat's founder can now take its first seat. (#222)
- **Signing in when your OrangeCat account got its email later.** Solon said
  "Add an email to continue" to accounts that had one, and "Sign in again"
  led straight back to the same page. OrangeCat now tells Solon the email
  your account has. If sign-in ever does stop, the page is in your language,
  says what to do, and every button on it works. (#221)
- **Tax estimates on 31 December.** A year's tariffs and multipliers ended a
  day early, so an estimate on the last day of the year came out incomplete,
  and a commune that merged away looked gone the day before it did. Every
  period now ends on the day after its last day, as the rest of Solon counts
  time. (#219)

## 2026-09-29

### Added

- **Switzerland, as the official register has it.** Every canton, district
  and commune, with the mergers since 2021 (the old communes stay, marked as
  ended, and point to the one they joined), and the City of Zürich's districts
  and statistical quarters, each with a page at its place in the chain:
  `/places/switzerland/zurich/bezirk-zurich/zurich/kreis-7/witikon`. Everything
  comes from the Federal Statistical Office and the city's open data, with the
  source kept for every row. Taxes, postcodes and the map come next. (#215)
- **Each Zürich commune's tax multiplier, every year since 2021**, from the
  canton's own statistics. A commune whose school communities levy different
  rates (Uster, Turbenthal) shows none rather than a wrong one, until the
  address decides which applies. (#216)
- **Federal and Zürich income-tax tariffs, and the canton's own multiplier,
  every year since 2021**, from the Federal Tax Administration. Together with
  the commune multipliers they give the same income tax as the
  administration's own calculator for the City of Zürich and Küsnacht (checked
  at CHF 100,000, single and married; church tax and the CHF 24 personal tax
  are not counted yet). (#217)
- **A new kind of body: charter city.** A city with its own charter, founded
  by agreement with the state that hosts it — or proposed, before that
  agreement. Like a town, it cannot be founded without a place; picking it
  suggests elected delegates to decide. Same word as on OrangeCat. (#214)

## 2026-09-28

### Added

- **An organization says what kind of body it is, and where.** Founding now
  asks the one question it never asked: what ARE you — a circle, a family, an
  association, a cooperative, a collective, a company, a guild, a DAO, a town,
  a network state or a local fund. The list is the same one OrangeCat uses
  (bitbaum/orangecat `packages/collective-kinds`), so the word here is the word
  there. A town or a local fund cannot be founded without a place (country,
  region, locality); everything else may name one. Picking a kind suggests how
  it decides; the founder can still choose otherwise. The organization page
  names the kind, the place and — when it is more than informal — the legal
  status.
- **One body, two records: bind an organization to its OrangeCat organisation.**
  Give its OrangeCat address at founding; OrangeCat confirms the founder owns
  it, and its kind and place fill in what was left blank. The wallet lives
  there, the decisions live here, and the page links across.
- **What you can do — the map.** `/what-you-can-do` lists everything Solon does
  in plain words, with an example, three steps and a start for each, and opens
  with a box: type the question you want decided and a proposal is drafted
  from it. Linked from the footer.
- **Public roadmap and changelog.** `/roadmap` and `/changelog` render this
  repository's `ROADMAP.md` and `CHANGELOG.md` through the fleet map, without
  signing in, and are linked from the footer. {#records-in-repo} {#records-public}
- **Who decides: one person, everyone, or elected delegates.** Profiles used
  to vary only how votes were counted; every member always voted. An
  organization can now be run by its founder alone, by everyone, or by
  delegates elected for a term (365 days by default). Delegates decide money
  and operations; members keep membership, safety and the rules, which is how
  they elect and recall. A category with no live mandate falls back to the
  members, and the record says so. (#195)
- **Founding chooses how the organization decides.** Every organization
  founded so far became a town meeting silently. The founder now picks a
  governance profile at founding, the choice is bound into the signed text, and
  the organization page names it ("Association (Verein)", not an id). (#194)
  {#founding}

### Fixed

- **Founding no longer says a Bitcoin key is required.** The signed-out
  founding page still claimed votes verify through a Bitcoin key. A key is
  optional; the page now says so, and says what a key adds. (#196)

## 2026-09-25

### Added

- **Solon's own sign-up and sign-in.** `/sign-up` and `/sign-in` in Solon's
  design, in all five languages: email first, then Google, GitHub or an
  existing OrangeCat account. One account underneath for Solon, OrangeCat and
  Loki. The header's Sign in remembers the page you were on. (#191)
- **Use cases, the ideas behind Solon, a new era, and the platform.** `/for`
  compares companies, villages and towns, associations and co-ops, communities
  and network states, with one page each. `/governance/ideas` tells the ideas
  Solon stands on, each with its source; `/governance/new-era` says what
  changed and what technology still cannot do; `/platform` explains how Solon,
  OrangeCat and Loki work together. A four-panel menu describes every page in
  one line. (#190)
- **Five languages.** English, German (Swiss spelling), French, Italian and
  Russian, chosen by the URL and a switcher in the header — never guessed from
  the browser. Pages not yet translated say so in the reader's language. (#189)
- **A new front door.** Full-screen photographs, one statement and one action
  per section, a three-link header and copy written for the person who runs a
  group — no protocol vocabulary on the front pages. New `/hire` (free for
  pilot groups in beta) and `/credits`. (#188)

### Fixed

- **Every header control is a 44px touch target.** Sixteen controls in the
  header were smaller; the wordmark, the four section triggers, Sign in and
  Hire Solon now all meet the floor. (#193)
- **Phone layouts no longer scroll sideways, and the mobile menu opens.** Both
  had shipped and were found by looking; the render checks that now run in CI
  fail if either comes back. (#188)

## 2026-09-24

### Added

- **Govern with one click — Bitcoin is optional.** A seat no longer needs a
  wallet. A signed-in member claims a seat, founds an organization, files a
  proposal and votes with one click; each act is recorded as Solon's record.
  Signing with a Bitcoin key stays available for anyone who wants a vote others
  can recount, and agents always sign. Changing your vote replaces the earlier
  ballot until the session closes. (#184)

### Fixed

- **The site no longer claims every vote is Bitcoin-signed.** The home page,
  `/governance`, `/features`, `/integration` and `/propose` now say what is
  true: one click by default, a signature when wanted, every record labelled
  with which. (#187)
- **Dependency updates that had been dropped are back**, and minor updates
  arrive grouped so it cannot recur. (#185)

## 2026-09-20

### Added

- **A link that carries context lands on a form that kept it.** OrangeCat's
  "Govern it with Solon" button now opens `/propose` with the title, the entity
  and the cheapest category pre-filled — with its consequence stated and one
  tap to change — and the draft survives sign-in and joining. The form's
  category hints are read from the rules themselves instead of a hand copy.
  (#172)
- **A rules change shows whether it was decided.** Every pull request touching
  the governance rules is checked for a ratifying decision; when there is none
  it warns with a pre-filled link to the proposal that would. It records; it
  never blocks. (#172)

### Changed

- **Loki's plane is Execution, not Engineering.** The footer and the ecosystem
  page name what Loki is: where the work gets done. (#173)

## 2026-09-17

### Added

- **Anyone may found an organization.** The only way to create one used to be
  a database migration. Founding is now permissionless; the organization, the
  founding seat and both audit events land in one transaction. One identity
  holds one seat per organization, and an organization is attributed to a Loki
  project only through a grant Loki signed — never because the names match.
  (#166) {#founding}
- **Governance, taught from the product's own code.** Five pages —
  `/governance`, `/governance/methods`, `/governance/thresholds`,
  `/governance/who-decides`, `/governance/profiles` — where every tally is
  computed by the same function that counts a live session. (#168)

### Fixed

- **The approval floor is visible.** On the Approval tab, an option rated
  below the floor dims, so a reader can watch the tally being assembled. (#169)
- **A localization that was never wired up is gone.** Four dictionaries shipped
  where no visitor could reach them; the English copy moved into the components
  that use it. (#170)

## 2026-09-14

### Added

- **Value routing to originators.** `originator_share` v1: 10% of a product's
  net revenue, by default, to the originators of the code it is built from —
  equal per originator, monthly, in Bitcoin, on a public ledger. The split is
  deterministic and anyone can recount it; every later version needs an
  approved allocation-policy vote. (#164) {#originator-share}

### Changed

- **One signature step** for claiming a seat and filing a proposal. (#165)
- **FleetCrown is now called Loki** everywhere on the site. (#157)

## 2026-09-07

### Changed

- **Green pull requests merge and deploy themselves** through the fleet's
  shared sweep instead of a stale local copy, and the sweep no longer stalls on
  workflow changes. (#154, #155)
- Node, React, Next, Vitest and other dependencies updated. (#140–#153)

## 2026-09-05

### Changed

- **Design tokens come from the published package** `@bitbaum/design-tokens`
  instead of a git tag, so Solon, OrangeCat and Loki share one source. (#139)

## 2026-09-02

### Changed

- **Prisma replaced by Drizzle** — the fleet has one ORM. Migration history
  begins at a baseline proven byte-identical to the tables Prisma created.
  (#136)
- **One package manager (pnpm)** across the fleet. (#137)
- **Moved to the bitbaum organization**, and `verify` made honest again.
  (#135)

## 2026-08-31

### Fixed

- **The footer promised pages only the navigation could keep.** Footer and
  navigation now render one list. (#122)

### Changed

- A formatter (Prettier) with `format:check` in `verify`; TypeScript 6; CI and
  the deploy follow the box to Node 24. (#123, #133, #134)

## 2026-08-25

### Added

- **Feedback from any page.** The Loki feedback widget loads site-wide, so a
  reader can report what is wrong from where they saw it. (#114)

## 2026-08-15

Earlier history, in one entry. The spine of the product shipped in this week:

- **Six ways to decide, one way to prove it.** Single choice, consent,
  approval, dots, score and ranked choice, each with its own signed ballot
  encoding; five governance profiles replace one hardcoded structure; the
  humans-only categories cannot be reassigned by any profile. (#92)
- **From reader to member to vote.** `/join` binds a key to an identity,
  `/propose` files a proposal, `/proposals` lists them with their next step;
  every page offers at least one action. A second organization's vote no
  longer appears on the first organization's dashboard. (#90)
- **Treasury honesty.** The treasury report says whether every source
  resolved instead of answering yes about nothing; the site stopped claiming
  transaction records it never stored. Still watch-only. (#88)
- **The Townsism thesis** Solon is an organ of, published at `/why` and in
  `docs/TOWNSISM.md`. (#87)
- **One visual language** across OrangeCat, Loki and Solon, from a shared
  token package; orange calls to action fixed to meet contrast. (#77–#93)
