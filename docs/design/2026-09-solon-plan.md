# Solon — plan of record

_Written 2026-09-25 from George's brief. Companion to
`2026-09-solon-constitution-engine.md` (the governance engine). This file is the
product: who it is for, what they read, how they move through it, in which
language, and the order it gets built in._

## 1. The problem, from first principles

Every group that shares something — money, land, a building, a mission — has to
decide things together. Three things go wrong, in every era:

1. **Nobody can see how decisions are made.** The rules live in someone's head or
   a PDF nobody reads; the books are a spreadsheet one person controls.
2. **Somebody quietly captures the process.** Who is asked, how votes are
   counted, and what happens afterwards drift toward whoever runs the meeting.
3. **Doing it properly is too much work.** Minutes, notices, quorums, counting,
   records — so groups skip it, and then the first two happen.

Solon's answer: make the rules readable, the counting fair and checkable, the
record permanent — and make all of that take less effort than doing it badly.

It is technology, and it is civics. Both halves get equal care.

## 2. Who reads Solon, and what each needs

| Reader | Arrives wanting to know | Reads first |
|---|---|---|
| **Someone who runs a group** (a treasurer, a founder, a village councillor) | Can this run our decisions, and can I trust it? | The home page, their use case, `/hire` |
| **A member** | What is up for decision, and how do I vote? | Their group's page, one click to vote |
| **The curious citizen** | What is this idea — governing yourselves, in the open? | `/governance` and its essays |
| **The technical verifier** | Is any of this true? Show me the data, the proofs, the code. | `/technical` |
| **An agent** (the Cat, Loki, an outside tool) | The API and the decision documents | `/technical/api` |

### Progressive disclosure — three depths, never mixed

1. **Plain** — every page opens here. Short sentences, no unexplained terms. A
   regular person should never meet a word like "BIP-137" without having asked.
2. **Deeper** — on the same page, folded: "How this works". Mechanisms explained
   in ordinary words, with the trade-offs.
3. **Technical** — its own section, `/technical`, linked from each "Deeper" block.
   Specifications, data model, message formats, threat model, API. Uncompromising:
   exact, sourced, and honest about what is not built yet.

A term used on a plain page is defined once in the **glossary** (one SSOT file)
and shown inline with `<Term>`; the glossary page renders the same list.

## 3. Information architecture

Header (the budget test allows four links): **Use cases · Governance · Platform ·
Decisions**, then the language switcher, sign-in (or your menu), and **Hire Solon**.

| Section | Pages |
|---|---|
| **Use cases** `/for` | companies · villages and towns · associations and co-ops · communities · **network states** |
| **Governance** `/governance` | the art and science (existing lessons) · **ideas** (Solon of Athens, the Landsgemeinde, Ostrom, exit and voice, Condorcet and Arrow, panarchy, network states) · **a new era** (why self-governance is newly possible) |
| **Platform** `/platform` | how Solon, OrangeCat and Loki work together · security · `/technical` (reference) |
| **Decisions** | the public record: organizations, proposals, votes |
| Account | **My Solon** `/me` — my groups, votes waiting for me, my proposals · profile |

Footer and mobile menu render the whole map from `site-config.ts` (existing SSOT,
tested).

## 4. The app: from one hard-wired organization to many

Today most app pages read `primaryOrg()` — the oldest organization. The target is
organization-first:

- `/orgs` — every organization (public directory).
- `/orgs/[slug]` — an organization's hub: overview, decisions, members, money,
  record, rules.
- `/orgs/[slug]/members/[id]` — a member's profile in that group: role, votes
  cast, proposals filed, how they vote (one click or signed).
- `/me` — **My Solon**: every group I belong to, what is waiting for my vote, what
  I proposed.
- `/me/profile` — name, preferred language, optional signing key.

Sign-in stays OrangeCat-only — one account across the stack, no second password
(standing rule: no auth friction). Old routes redirect into the first organization
so no link breaks.

## 5. Languages

English, German, French, Italian, Russian — `next-intl` (the fleet's blessed
choice, see fleet `STACK.md`), following evig's layout:

- `messages/<locale>.json`, one namespace per page or component.
- English unprefixed (`/`), others prefixed (`/de`, `/fr`, `/it`, `/ru`).
  No guessing from the browser; the switcher and the URL decide.
- A parity test fails if any locale misses a key English has.
- German follows Swiss spelling (no ß) — Solon's first audience is Swiss.
- Translations are drafted by Claude and marked for native review; a page not yet
  translated says so in the reader's language rather than silently showing English.

## 6. How Solon works with OrangeCat and Loki — the plain story

One account, three jobs:

- **Solon decides.** Proposals, votes, the rules, the record.
- **OrangeCat holds and moves the money.** Wallets, payments, funding — and it only
  moves money a decision allowed.
- **Loki does the work.** AI agents and people who carry a decision out, with every
  step reported back to the record.

Deeper: mandates and receipts (engine doc §2.2). Technical: the decision document,
the webhook contract, re-verification by each executor.

## 7. Content plan (each page states its reader and its one job)

| Page | Reader | Its one job |
|---|---|---|
| `/for/companies` | founder, board member | show board and shareholder decisions with a record nobody can quietly edit |
| `/for/towns` | councillor, active resident | an assembly anyone can join, a budget anyone can read |
| `/for/associations` | club or co-op board | the general meeting, done properly, with half the work |
| `/for/communities` | organiser of an online group | fair rules and an open record from day one |
| `/for/network-states` | founder of a startup society | the governance infrastructure a network state needs, from first member to recognition |
| `/governance/ideas` | the curious citizen | the ideas Solon stands on, told as stories, each with its source |
| `/governance/new-era` | the curious citizen | why governing yourselves is newly possible — and what it still cannot do |
| `/platform` | someone deciding to adopt | the three products as one system, in plain words |
| `/technical/*` | the verifier | specifications, exact and sourced |

## 8. Engineering rules for all of this

- **One source of truth per fact**: `site-config.ts` (routes), `photos.ts`
  (images + licences), `glossary.ts` (terms), `use-cases.ts` (the audiences),
  `i18n/routing.ts` (locales), `messages/*.json` (every sentence).
- **Separation**: content in messages and content modules; layout in
  `components/site`; domain logic in `lib/domain`; nothing mixes.
- **Guards**: the render checks (CI), the locale parity test, the design gate,
  the site-map tests. A new rule arrives with its guard.
- **Honesty**: nothing described as built unless it is. The network-state and
  new-era pages describe possibilities as possibilities.

## 9. Build order

Each phase ships on its own, verified live.

- **A. Languages foundation** — next-intl, five locales, switcher, parity test;
  shell, home, `/hire`, `/security`, `/credits` translated.
- **B. Governance knowledge** — `/governance/ideas`, `/governance/new-era`,
  glossary + `<Term>`, depth components.
- **C. Use cases** — `/for/*`, including network states.
- **D. Platform** — `/platform`, `/technical` reference.
- **E. The app** — new header, account menu, `/me`, organization directory and
  hub, member profiles; `primaryOrg()` retired.
- **F. The engine** — charter, admission by vote, mandates and receipts (engine doc).

## 10. Open for George

1. German: Swiss spelling (ss, no ß) as the default? (Assumed yes.)
2. Who reviews translations natively — and until then, is a "machine-drafted"
   note on translated pages wanted?
3. Network states: Solon as neutral infrastructure for any such community, not an
   advocate of any one — the stance these pages take unless you say otherwise.
