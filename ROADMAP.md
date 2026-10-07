# Roadmap

Where Solon is going, in the order it is going there. Solon is the governance
plane of the OrangeCat stack: proposals, one-click or signed votes, versioned
rules and an append-only record for any group. Nothing below is dated on
purpose — order carries the argument — and nothing is described as built unless
it is. What Solon does today is listed under "Shipped"; the one place the site
itself reads that status from is `src/lib/content/capabilities.ts`.

## Now

### Every organization on its own pages

Most app pages still read the oldest organization. Solon governs many, so every
page must be about one of them, and a member must see every group they belong
to in one place.

- [x] Anyone with an OrangeCat account may found an organization {#founding}
      — founding chooses its governance profile
- [x] `/orgs/{slug}` shows an organization's roster, record and who decides
- [ ] `/orgs` — a public directory of every organization
- [ ] My Solon (`/me`) — my groups, the votes waiting for me, my proposals
- [ ] Member pages within an organization: role, votes cast, proposals filed
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

### Mandates and receipts: decisions that carry themselves out

A closed decision hands a signed instruction to OrangeCat (money) or Loki
(work), and their report comes back to the record. A Solon decision stays
evidence, not authority: each executor re-verifies the signatures itself.

- [ ] Mandate documents and a receipt endpoint; every decision page shows its
      lifecycle
- [ ] Loki executor: re-verify, then act
- [ ] OrangeCat executor: treasury spend and budget allocation
- [ ] Unmandated outflow from a watched treasury raises a `SAFETY` proposal

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

Any recognized OrangeCat identity may found an organization; the organization,
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

### One account across the stack

Sign in once with an OrangeCat account — email and password, an emailed code,
Google or GitHub — and the same account works for Solon, OrangeCat and Loki.
