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
- [ ] Municipal regulations, commune by commune (one adapter per collection, a shared loader). Loaded: the City of Zürich, the eleven communes of Zug, the three of Glarus and ten of Liechtenstein's eleven. Triesenberg, the eleventh, answers Solon's reader with a bot check (2026-11-07), so its regulations are read from the Internet Archive's newest copies, each act page saying it is the archive's copy and of which day; its first load waits for a run on Solon's server, which can reach the archive. Any publisher that refuses Solon's reader is read the same way. The other Swiss communes, about 2,100, are not; the most populous go first {#law-communes}
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
- [ ] The globe zooming down past a country to its cantons or states, then its communes or counties, and the same globe on `/places` and `/law` {#globe-deep}
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
- [ ] Wyoming and its 23 counties on the globe {#law-wy-places}
- [x] Wyoming's official route: the citizen initiative, with its thresholds and its limits, from Article 3, Section 52 of its Constitution {#law-wy-route}
- [ ] Wyoming's referendum, the route for undoing an act the legislature passed (the same section) {#law-wy-referendum}
- [ ] New Hampshire's statutes (the RSAs), Grafton's ordinances and the warrant-article route a town's voters can take (RSA 39:3). The General Court's site refuses Solon's readers: its firewall answers "Web Page Blocked" (2026-11-06). The way through is the publisher's permission, or a load from a network it allows; not an unofficial copy {#law-nh}
- [ ] The places' and the law's data model without Swiss assumptions: a new country is configuration and an adapter, not a change to the schema {#law-world-model}
- [x] Estonia's national law in force, read from Riigi Teataja (the State Gazette): the register from its public search, each act's text from the gazette's own XML with the day it took effect, read again every week {#law-ee}
- [x] Estonia's counties and municipalities as places, by their EHAK codes (Statistics Estonia and the Land Board, EHAK2026v1) {#places-ee}
- [ ] Estonia's municipalities' own regulations, which the same register lists {#law-ee-local}
- [x] Estonia's income tax in Places: 22% above a basic allowance of EUR 8,400 (Tulumaksuseadus § 4 and § 23), no municipal rate {#places-ee-tax}

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
