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

- [x] The register of what exists for the Confederation, the 26 cantons and the intercantonal agreements: 33,441 acts (22,047 in force) with title and number, read from LexFind's list, and a coverage page counted from the data. No text yet {#law-register}
- [x] The register for Liechtenstein: the 3,407 acts of the Government's Systematic Register, named by LR number with the Landesgesetzblatt issue that published each {#law-register-li}
- [ ] Each act's own page at the authority that publishes it, for the Swiss acts (built and tested; the production load is not done), and the communes in the register {#law-register-links}
- [ ] Federal text from Fedlex, every act in force, checked against the publisher every day. The reader and the store are built and tested; the production load and the daily check are not done {#law-federal}
- [ ] Liechtenstein text from gesetze.li. The reader is built and tested on the real pages, and dates each version by the day it was read, because Lilex does not state when one took effect; the production load is not done {#law-li}
- [ ] Cantonal text. A first pass reads each act's document, cut into articles, dated by the day it was read; a reader per canton that takes the canton's own text and its stated date, Zürich first, is not done. The production load is not done {#law-cantons}
- [ ] Earlier versions of every act, and what changed between them {#law-history}
- [ ] Municipal regulations, commune by commune {#law-communes}
- [ ] A public API, and Causius reading the law from here with the publisher as its fallback {#law-api}

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
humans-only rules apply, and its office is defined by the group's own rules.

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

## Next

### The charter: rules as data, amended by the rules

Today an organization's rules are a profile chosen at founding, read from
configuration. The charter makes them a versioned document the group amends
through its own `GOVERNANCE_RULES` votes — who votes on what, by what method,
with what threshold and quorum.

- [ ] A versioned `charters` table; the shipped profiles become templates
- [ ] A proposal that amends the charter, applied when the vote closes
- [ ] One source for thresholds: the ratification check watches the profiles too

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
and never widen it; the humans-only categories stay humans-only under every
structure.

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
