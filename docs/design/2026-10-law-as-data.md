# Law as data: every law on the books, in Solon

_Design, 2026-10-22. Status: proposal. Nothing here is built unless it says so.
Companion to `2026-09-places-and-jurisdictions.md` (which this builds on: its
`jurisdictions`, `sources`, importer framework and licence policy are reused,
not repeated) and to `2026-10-direction-notes.md` (why). Written because the
first thing Solon has to finish is the law itself._

## 0. The brief

**Every law and every regulation in force in every authority of Switzerland and
Liechtenstein**: the Confederation, the 26 cantons, Liechtenstein, and in the end
the municipalities. Stored as data: the text as the publisher published it, who
enacted it, from when to when it was in force, where it applies, and a hash to
prove that Solon's copy is the publisher's. Served openly, so that Causius, any
other app and any person can read it, and so that a country is added by adding
a reader for its publisher.

Today none of this is in Solon. Solon holds one thing that is law-shaped: the
tax model (Places §6), a declarative model of how a place taxes income, with its
sources. That is a model of one body of law, not the law. Causius meanwhile reads
the publishers directly (`lib/law/` in `bitbaum/causius`), which is the fallback
this design keeps.

## 1. First principles

1. **The publisher's text is the law; Solon holds a verified copy.** Every
   version carries the publisher's URL and the sha256 of the bytes fetched.
   A job re-fetches a sample each day and compares. A copy that no longer
   matches is shown as stale, not corrected by us.
2. **No law is written here.** Not a summary, not a translation, not a
   "plain-words" version, stored as the act. Anything we write about a provision
   is a different object with another label (Causius's work, not this table's).
3. **Valid time, never deleted.** A version is in force from one date to
   another. A repealed act stays, with the date it ended. The question "what
   applied on 2026-03-01" has one answer.
4. **Language belongs to the version.** Switzerland's federal acts are authentic
   in German, French and Italian; some cantons are bilingual; Liechtenstein
   publishes in German. A version is one language. We do not translate.
5. **Where it applies is derived, not stored.** An act applies in the place
   that enacted it and in every place inside it. A cantonal act applies in
   the canton's communes; a federal act everywhere in the pack. The chain from
   Places (`chain.ts`) answers it.
6. **A source speaks for itself** (Places §8.3): what a publisher stopped
   stating is superseded; what another source said is left alone. Acts the source
   knew and no longer lists are reported, never ended; only the publisher saying
   so ends an act.
7. **Authentic text and consolidated text are different things.** Publishers
   distinguish the official publication from a consolidated reading
   (the SR, the cantonal collections). The data records which one each version
   is, and no reader states "this is binding" until that has been checked per
   publisher, in writing, in the source registry.
8. **Be a good neighbour.** An identifying user agent, a rate limit per
   publisher, snapshots so nothing is fetched twice, and a challenge page is
   never circumvented: the publisher's own proof-of-work or CAPTCHA means
   stop and fetch less, not more.

## 2. The size of it, measured

Counted on 2026-10-22 from LexFind's own statistics (`/api/fe/de/entities/extended`),
which indexes the federal and cantonal collections:

| Authority | Active texts | Including repealed |
|---|---:|---:|
| Confederation | 5,339 | 6,771 |
| 26 cantons, together | 16,389 | 26,334 |
| **Switzerland, federal and cantonal** | **21,728** | 33,105 |
| Liechtenstein | not counted yet | |
| Municipalities (about 2,100) | not in LexFind; not counted | |

The largest cantons by active texts are Basel-Stadt (973), Zürich (945), Vaud
(900), Geneva (865) and Basel-Landschaft (860). Fedlex's own register lists
13,257 consolidated acts through its SPARQL endpoint, including repealed and
other entries; **the difference from LexFind's 6,771 is not yet explained**, so
neither number is the target until it is.

An act is not one row. The Code of Obligations alone is a 2.7 MB HTML page.
Storing provisions as rows (§3) puts the corpus at hundreds of thousands to a few
million rows with history, and the raw snapshots at gigabytes of text, not
terabytes. These are estimates until the first real import measures them.

## 3. Data model

New tables beside `jurisdictions`, in the same schema file family. Registries (kinds,
identifier schemes) live in config like the Places ones, never as literals.

**`legal_acts`**: an act as a stable work, across its versions.
`id`, `jurisdiction_id → jurisdictions` (the enacting authority), `kind →` the act-kind
registry (`constitution`, `statute`, `ordinance`, `regulation`, `treaty`, `decree`;
the list is config), `valid_from`, `valid_to` (when the act as a whole is in
force), `recorded_at`.

**`legal_act_identifiers`**: `(act_id, scheme, value)`, schemes from config:
`ch_sr` (220), `ch_eli` (the Fedlex ELI), `zh_ls` (631.1), `be_bsg`, `li_lr` (101),
`li_lgbl`, `lexfind_tol`, each with its source. One act, many identifiers; lookups
are by `(scheme, value)`, never by name.

**`legal_act_names`**: `(act_id, lang, kind, text)` with kind `title`, `short`
or `abbreviation` (OR, CO, StG): an abbreviation is per language and per
authority, and this is where Causius's `read_law` "act" argument resolves.

**`legal_act_versions`**: one consolidated text in one language.
`id`, `act_id`, `lang`, `in_force_from`, `in_force_to`, `enacted_on`, `status`
(`authentic` or `consolidated`, principle 7), `source_id → sources` (url, sha256,
snapshot key, licence: the Places table, unchanged), `format` (`html`, `akn`,
`pdf_text`).

**`legal_provisions`**: the text by provision, so one article is one lookup.
`id`, `version_id`, `path` (`art_270_b`, `par_1090`), `heading`, `text`, `ord`,
`parent_path`. Indexed on `(version_id, path)`. Built from the snapshot; if the
parser changes, they are rebuilt from the same bytes.

Later: `legal_references (from_provision, to_act, to_path)` for cross-references,
and `legal_amendments (version_id, amended_by_act, on)` for what changed.

**Applies where** is not a table: it is the place chain over `legal_acts.jurisdiction_id`.

### L0 as built (2026-10-23)

Step L0 is built for the Confederation, the 26 cantons and the intercantonal
agreements. What differs from §3, and why:

- **Three tables, no text.** `legal_acts`, `legal_act_identifiers` and
  `legal_act_names` (migration 0015). Versions and provisions are L1.
- **Two identifier schemes, not one per numbering.** `systematic_number`
  (read together with the act's authority, which is what makes it unique) and
  `lexfind_id`. The per-publisher schemes (`ch_sr`, `zh_ls`, …) are not needed
  until a second source numbers the same act.
- **An authority key on the act**, with the place it speaks for resolved
  through Places' identifiers (`iso_3166_1` for the Confederation, `bfs_canton`
  for a canton). The intercantonal agreements have no single place.
- **In force is what the register says**, with no end date: LexFind states
  whether an act is in force, not since when.
- **Titles and numbers only.** LexFind's keywords are its own editorial work
  and are not imported until its terms are read; abbreviations will come from
  each publisher in L1–L3.
- **Read through LexFind's public JSON**: `entities/extended` gives each
  authority's stated total; `entities/{id}/systematics` is the tree, and its
  `tols_for_systematics[]` parameter returns the acts under the named nodes,
  60 nodes to a request. A read whose count differs from the stated total is
  refused, so a partial register can never be imported as acts that vanished.
- **Measured**: 33,441 acts, 22,047 in force (28 authorities), read in about
  two minutes; a rerun on the same bytes changes nothing and takes two seconds.
  This replaces the earlier 21,728 / 33,105, which left out the 317 / 333
  intercantonal acts and was read a day earlier.

Run it with `pnpm run law:register [--dry-run]`, or the *Law register load*
workflow on the box. The page is `/law/coverage`; the API is
`/api/v1/law/coverage` and `/api/v1/law/acts`.

### L1 as built (2026-10-23): federal text, German first

`legal_act_versions` and `legal_provisions` (migration 0016) hold the text. Run
by `pnpm run law:text fedlex` or the *Law text load* workflow on the box.

- **One SPARQL query lists every version in force on a day**: the Classified
  Compilation's `eli/cc` acts only (the Official Compilation's `eli/oc`
  entries share their systematic numbers), whose consolidation had begun and
  not ended by that day. It returns 5,331 acts for 2026-10-23 against 5,339
  the register says are in force, every one of them in the register. A repealed
  act's last consolidation has ended, which is what keeps it from being read as
  current (the old and the new data-protection act share the number 235.1).
- **A number two acts share is not guessed.** Where more than one `eli/cc` act
  carries the same systematic number the run reports it as ambiguous and
  stores neither.
- **Each version cites its retrieval**: Fedlex's page, the sha256 of the bytes
  and where they are kept. `GET /api/v1/law/provisions` returns the article
  with that URL and hash, as it stood on any date a held version covers.
- **A newer version closes the held one** the day before it takes over; nothing
  is deleted, so "what applied on 2024-06-01" is a lookup.
- **Articles are the provisions**, under Fedlex's own anchors (`art_270_b`).
  An act without articles (an exchange of notes, a decree) is one provision,
  `text`, holding the page as plain text. Preambles and annexes of acts that
  do have articles stay in the snapshot and are not provisions yet.
- **Resumable and polite**: an identifying user agent, a pause between files,
  a limit on versions stored per run that failures do not use up, and a run
  that stops anywhere continues where it left off.
- **Not yet**: the daily check that re-fetches a sample and compares hashes;
  French and Italian (the same command with `--lang`); earlier versions (L4).

### L2 as built, the register half (2026-10-23): Liechtenstein

Liechtenstein has no API and no listing Solon may read in a browser's way:
gesetze.li's listing pages sit behind a proof-of-work script, and the
"Gebietssystematik" table is filled by it. What the Government's legal service
does publish is the **Systematic Register** (Systematisches Register), a PDF
that lists every act in force at a reference day by LR number, with the
Landesgesetzblatt issue (year and number) that published it. It is linked from
`/konso/systematisches-register`; the register itself states that it has no
legal force, which is why it is used to learn *what exists* and the acts
themselves are the text.

- **Read in two requests**, six seconds apart: the listing page, then the PDF it
  names. A response that is the proof-of-work page, or a "PDF" that is not one,
  stops the run; it is never solved.
- **Parsed from the PDF's text**: an act opens a line with its LR number and ends,
  within a few lines, with dot leaders and its Landesgesetzblatt issue. Words
  broken at a line end are made whole, except before "und". A line that opens
  with a number and never reaches an issue is a heading. Acts from the Austrian
  era (ASW) have no issue and are kept by LR number alone.
- **Named by LR number** (`li_lr`), with the issue as `li_lgbl` (`2008/311`). The
  Lilex page of an act is `/konso/<year><number to three digits>000`, which L2's
  text step will use.
- **All listed acts are in force**: the register lists the acts in force at its
  reference day. The old versions inside it are history for L4.
- **Measured**: 3,407 acts (4 constitutional texts, 363 statutes, 698
  ordinances, 75 decrees, 2,225 treaties, 18 notices, 9 regulations, 16 not
  classified). The classification is by how a title opens (config, not code).

The importer was made source-agnostic for this: a register is a function from
its bytes to `ActRow`s, and the importer applies rows whatever their origin.

### L2 as built, the text half (2026-10-23): Liechtenstein from Lilex

`pnpm run law:text lilex` (or the *Law text load* workflow, source `lilex`) reads
each register act's page on gesetze.li, `/konso/html/<id>`, where the id is the
Landesgesetzblatt issue: year, number to three digits, `000`. Two acts need a
listed exception (the ABGB has no issue; the Civil Procedure Code is published in
two parts), and an issue like `60/1` is not guessed. Acts are read statutes
first, treaties last, three seconds apart.

- **Provisions** are the page's `div.art` blocks, under the anchor with its colon
  made an underscore (`art:2a` is `art_2a`, `par:1096` is `par_1096`); footnote
  marks are dropped. An act with no articles is one provision, `text`. Where a
  page repeats an anchor (the same article in more than one wording) the first
  is kept; the page is in the snapshot.
- **Lilex does not state when a consolidated version took effect.** The version
  is therefore dated by the day it was read, and says so: `date_basis` is
  `retrieved`, not `publisher` (migration 0017). This is *as at*, not *in force
  since*, and nothing may present it as the latter.
- **The proof-of-work page ends the run.** It is recognised, never parsed as law,
  never solved; the run reports `stoppedByChallenge` and the next run continues.

### Official links as built (2026-10-23)

`pnpm run law:register links` (or the *Law register load* workflow, source
`links`) keeps, for every in-force act of the Confederation, the cantons and the
intercantonal agreements, the address of its page at the authority that
publishes it, as the identifier `official_url`. LexFind's search results carry it
(`original_url`): a canton's page for a cantonal act, Fedlex's for a federal one.

- A search by systematic number, one digit at a time, lists every numbered act of
  an authority a hundred to a page; about 220 requests for all 28 authorities.
- A list under 95% of the count the register states for an authority is refused. A
  few acts are always missed, those whose systematic number has no digit (4 of Schwyz's
  430); the snapshot records how many per authority. A short list is safe for links,
  unlike the register's: they are only added or replaced, never removed for an act
  absent from a list.
- A changed link supersedes the old one; an act's link is the German page.
- Where the canton's page is a wrapper (Zürich's is) the document itself sits one
  step behind it. Reading the cantons' text is therefore a reader per publisher
  (L3), starting with Zürich; the link is already what a person needs to check
  an act against its publisher.

### Cantonal text as built (2026-10-23): the first pass, by document

`pnpm run law:text cantons [--authority zh]` reads each in-force cantonal and
intercantonal act's document, the canton's PDF as the register keeps it at
`/tol/<id>/de` (HTML where it is HTML), keeps it under its sha256, and cuts it
into articles. **This is the stated fallback, not the source of record**: the
design's rule is a reader per canton that takes the canton's own publication, with
the date it states; Zürich's act pages, for instance, are wrappers around a PDF on
another host, and carry the in-force date in their address. Until a canton's reader
exists, its acts are held this way, dated by the day they were read.

- **A PDF loses structure.** Margin notes run into the text and glue to the heading
  ("Kanton ZürichArt. 1"). The cutter takes the headings in the order the act numbers
  them (a reference to a later article met first is passed over) and titles an
  article with the margin note before its heading. On Zürich's constitution it finds
  139 of 141 articles, with a title on nearly all; a few titles are cut short. An act
  with no headings is one provision, `text`. The snapshot keeps the PDF, so a better
  cutter can be run over the same bytes later.
- **Room is checked first**: the run refuses to start with under 3 GB free where
  snapshots are kept, and reports the free space. A full load is several gigabytes.
- **Resumable and polite**: 1.2 seconds between documents; acts already held are
  not read again; the limit counts versions stored.
- **LexFind's terms are still unread** (open question 4 in the direction notes). The
  documents are the cantons' acts, not protected (URG Art. 5); the route to them is
  LexFind's, which is why it is named a fallback.

### Zürich's own text as built (2026-10-23): the first cantonal reader

`pnpm run law:text zhlex` (or the *Law text load* workflow, source `zhlex`) reads
each Zürich act from ZH-Lex, the canton's own collection, instead of the
first-pass document. The act's `official_url` (the register keeps it) is a
wrapper page; it links the PDF of the current version on another canton host,
and its address carries the dates: `erlass-<LS>-<enacted>-<in force>-<amendment>`.

- **The date is the canton's**: `date_basis: publisher`, the in-force day from the
  address. Only addresses on `www.zh.ch` (the page; `http://` is read as https) and
  `www.notes.zh.ch` (the file) are fetched, whatever a page links to. The file host
  answers with a one-line `window.location` redirect to the PDF; it is followed
  once, to a file under the same path on the same host.
- **It retires the first-pass reading of the same act.** A reading dated only by the
  day it was read would end the day before the canton's older date began: an empty
  range, never served, kept as the record of what was read. The same guard keeps any
  closed version from ending before it began.
- **Acts whose address states no in-force day** (an old PDF on `www2.zhlex.zh.ch`, 14
  in the first 54 read, or a page whose day is blank, `…-2016_04_11--100.html`) have no
  date to give a version. They keep the first-pass reading and are counted as `undated`.
- **History is on the page**: each act's page lists its earlier versions with the day
  they ceased to be in force, so Zürich can have its history (L4) by following those
  links; not done.
- Measured on the constitution: 139 provisions, in force since 2006-01-01.

### Municipal collections as built (2026-10-24): the City of Zürich

Where the law lives: all of it is in Solon's own database on our server. Causius
holds no law; it asks Solon and cites what comes back.

A commune's collection is read through one **adapter** (`src/lib/law/publishers`),
four things each: `list` the acts, `versions` of an act with the days the
publisher states, `document` of a version, and a polite `fetch`. The loader
(`load.ts`), the store, the reading pages and the search never change for a new
commune; it is one adapter in `PUBLISHERS` and one line in `LAW_AUTHORITIES`
(key `bfs<number>`, the place being the commune's BFS number).

- An act is named in its collection by `publisher_ref` (`<publisher>:<number>`),
  a new identifier scheme, and carries its page as `official_url`.
- A version is stored with the publisher's own first day (`dateBasis: publisher`).
  The latest version closes the open one; an earlier version, stored later, ends
  the day before the next begins and leaves the version in force alone
  (`storeVersion`'s `inForceTo`).
- A version that has not started yet waits: the version in force today is the
  one served, so a law passed for next year is never shown as the law today.
- Loads are resumable and polite: a version already held is skipped, the request
  rate is slow, the publisher's own hosts only. Current versions first;
  `--history` adds the earlier ones.

The City of Zürich (`zurich-city`): the Amtliche Sammlung at stadt-zuerich.ch/as,
about 790 acts, PDFs. Each act's page states, per version, the day it was
decided, the day it took effect and the day it ended, and lists its other
versions, back to the 1970s for the Gemeindeordnung. The tables are JSON in an
HTML attribute; that is read in one place (`zurich-city.ts`). The city's oldest
versions repeat and overlap first days; one is kept per day, the longest-running.

### Asking the law as built (2026-10-24)

`/law/ask` and `POST /api/law/ask` (design: the retrieval layer). Three steps,
each its own file in `src/lib/law/ask`:

1. **plan**: the conversation becomes a standalone question, the places it is
   about (the places named in the last message are always added, by
   `AUTHORITY_ALIASES`; the Confederation always), and 4 to 10 stems as the law
   would word them. The model translates ("fox" to Fuchs); a failed model call
   falls back to the person's own words.
2. **retrieve**: a few provisions per place, ranked, so a comparison between
   cantons has both sides. Search is a prefix OR over the versions in force
   (`termsQuery`), on the full-text index of migration 0018.
3. **answer**: the model sees the numbered provisions and no other law, cites
   each statement `[L1]`, and says what is missing when they do not settle it.

The chat is chatkit's. Public, rate-limited by address. Causius reads the same
engine as a tool, so there is one researcher, not two.

## 4. Sources, licences and how each is read

Licences: acts and official decisions are not protected by copyright in
Switzerland (Art. 5 URG) nor in Liechtenstein (Art. 5 of its own URG), and
Places already has the licence class `LicenseRef-ch-official-act`. Add its
Liechtenstein equivalent. **Facts about a compilation (index, extraction) are a
service with terms:** read each before a bulk import (`direction-notes` §6).

| Authority | Source | Verified 2026-10-22 | Format to import from |
|---|---|---|---|
| Confederation | Fedlex: SPARQL for versions and dates, file store for text | consolidated HTML per version, with article anchors | HTML now; Akoma Ntoso XML if the file store serves it (to check) |
| Cantons | Each canton's own collection; LexFind as the index of what exists and where | LexFind API lists every act with number, abbreviation and official link; text served as the canton's PDF | Canton's own HTML or XML where there is one (ZHLex, BELEX, SRL and others serve HTML); LexFind's PDF only where there is nothing else |
| Liechtenstein | gesetze.li (Lilex) | consolidated HTML, `art:n` / `par:n` anchors; a proof-of-work page after bursts | HTML, slowly |
| Municipalities | Each commune's publication | not measured | per source; hardest, last |

Reading PDF text loses structure (margin notes run into headings; hyphenation).
Causius's `lib/law/lexfind.ts` shows the cost: it works for citing one section
but is not a substitute for a publisher's structured text. That is why cantons
are taken by publisher, and LexFind is the registry.

## 5. Order of work

| Step | What | Done when |
|---|---|---|
| **L0. The register of what exists** | Import LexFind's index and the Liechtenstein register as `legal_acts`, names and identifiers, with the official link. **No text yet.** | `/law/coverage` counts acts per authority from the data; Causius can ask "does this act exist, what is its number" |
| **L1. Federal text** | Fedlex versions and provisions for every act in force; the daily sync; the verification job | every federal act in force has its text, hashes check, `read_law` can use Solon |
| **L2. Liechtenstein** | Lilex consolidated texts | same, for LI |
| **L3. Cantons, publisher by publisher** | Zürich first, then the largest, each canton its own adapter; LexFind PDF only as a stated fallback | coverage per canton is a number on the page |
| **L4. History** | Earlier versions, `legal_amendments`, "what changed since" | any date answers |
| **L5. Municipalities** | Commune by commune, source by source | coverage per commune |
| **L6. Causius reads it from Solon** | `read_law` asks Solon first, falls back to the publisher, and cites both the publisher link and Solon's hash | Causius's `lib/law` fetchers are the fallback only |

Each step is a change that ships by itself, with its coverage visible. Nothing is
described as covered that the coverage page does not count.

## 6. The API

Read-only, public, no key, as Places is.

- `GET /api/v1/law/acts?jurisdiction=&q=&identifier=`: find acts.
- `GET /api/v1/law/acts/{id}`: names, identifiers, versions with their dates and sources.
- `GET /api/v1/law/provisions?act=&path=&on=&lang=`: one provision as in force on a date, with `sourceUrl` and `contentSha256`.
- `GET /api/v1/law/coverage`: what is held, per authority and level.

Every answer carries where it came from. A client that does not trust Solon can
re-fetch the publisher's URL and compare the hash.

## 7. What this does not do

- It does not interpret. No case law, no commentary, no "what this means".
- It does not translate or summarise as law.
- It does not claim completeness beyond what the coverage page counts.
- It does not replace the publisher: a hash mismatch sends the reader to the
  publisher, and the publisher wins.

## 8. Guards

- No importer runs for a source whose licence is not on the list (Places §8.1).
- A fixture snapshot per adapter, dry-run in CI (Places §8.3).
- No literal act number, canton code or abbreviation in application code; they are registry rows.
- A test that every `legal_provisions` row's text appears in its snapshot.
- The coverage page is computed from the tables, never typed.

## 9. Risks

- **Publishers change format.** A parse that fails fails the run loudly; the old text stays.
- **PDF-only cantons.** Structure is lossy; the version is marked `pdf_text` and shown so.
- **Rate limits and challenges.** Liechtenstein's host already answers a burst with a proof-of-work page. Slow, polite, cached, and never worked around.
- **Scale of municipalities.** About 2,100 sources, each different. This is why they are last and why the stop-at-cantons option stays open (`direction-notes` §6).
- **Staleness.** A daily sync can lag a publisher; each version shows when it was last checked.
