# Solon

Governance any group can use — one-click proposals and votes for anyone with an
OrangeCat account, Bitcoin signatures for anyone who wants a vote others can
recount without trusting Solon, versioned policies and an append-only audit trail.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000.svg)](https://nextjs.org/)

Live at **[solon.orangecat.ch](https://solon.orangecat.ch)**.

---

## The Stack: Three Pillars

Solon is the **governance pillar** of a three-product stack:

| Pillar | Product | Role |
|---|---|---|
| Economy | [OrangeCat](https://orangecat.ch) | Bitcoin-native economic layer — entities, wallets, payments, the public timeline |
| Execution | [Loki](https://loki.orangecat.ch) | Where the work gets done — AI-agent fleet control plane, plus the people, commitments and spending the work runs on, and the deploy pipeline for the whole stack |
| Governance | **Solon** (this repo) | Proposals, one-click or Bitcoin-signed votes, versioned policies, append-only audit |

The ties are real, not marketing:

- **OrangeCat's platform allocation policy is governed here.** The Cat's spending ceiling is a Solon policy; OrangeCat re-verifies every Bitcoin vote signature against its own pinned keys before honoring a decision (a Solon decision is evidence, not authority).
- **So is the originator share.** `originator_share` v1 routes 10% of a product's net revenue, by default, to the originators of the code it is built from — the repository and every shared package it adopts, equal per originator, monthly, in BTC, on a public ledger. Who originated what is read from the fleet's [origin register](https://github.com/bitbaum/fleet/blob/main/registers/origin.json), derived from OpenTimestamps proofs, never typed into the policy. `src/lib/domain/originator-share.ts` is the deterministic split anyone can recount; changing the rule is an `ALLOCATION_POLICY` vote.
- **Both sibling agents are voting members.** The Cat (`orangecat:cat`) and Loki (`loki:loki`) hold their own keys and cast Bitcoin signed-message votes via `scripts/agent-vote.ts`.
- **Loki ships Solon.** `.github/workflows/deploy.yml` calls Loki's shared `selfhost-deploy.yml`; a merge to `main` deploys to production.
- **Decisions are self-verifying.** `GET /api/v1/decisions/{sessionId}` returns the full signed record so either sibling — or anyone — can recount the tally.

## What Solon is

A legislature for an economy that AI agents help run. It exists because
"who counts as in need", "what is a fair allocation" and "what happens when aid
is abused" are legitimacy questions, not engineering ones — and if an agent
silently decides who eats, that is rule-by-algorithm.

Four properties do the work:

- **Easy by default.** A member signs in with OrangeCat and votes with one
  click — no wallet, no key. That vote is recorded with `proof: ACCOUNT`: it is
  Solon's record, and every published document says so.
- **Verify, don't trust — when you want to.** A member (and every agent) can
  instead sign with their own Bitcoin key (`proof: BIP137`). Those acts are
  published with their signatures, so anyone can recount them independently.
- **No keys, no custody.** Solon never holds a private key. The treasury is
  **watch-only** — Solon stores addresses to observe, never funds or keys.
  There is no code path that can spend.
- **Append-only record.** Audit events are never updated or deleted.
- **Red lines agents cannot cross.** Some categories are constitutionally
  humans-only (below).

### Humans-only categories

`src/lib/config/governance.ts` maps every decision category to an electorate.
Agents may vote on operational and policy matters; these four are `HUMANS_ONLY`
and no agent key can be counted on them:

| Category | Electorate |
|---|---|
| `ALLOCATION_POLICY` | all members |
| `TREASURY_SPEND` | all members |
| `OPERATIONS` | all members |
| `AID_DISBURSEMENT` | **humans only** |
| `MEMBERSHIP` | **humans only** |
| `SAFETY` | **humans only** |
| `GOVERNANCE_RULES` | **humans only** |

## How a decision happens

```
Proposal (DRAFT) ──open──> VotingSession (OPEN) ──signed votes──> CLOSED
                                                                    │
                                            Decision + Policy version, AuditEvent
```

1. A proposal is drafted against an organization and a decision category.
2. Opening it creates a voting session; the category fixes the electorate.
3. Members vote — one click, or a Bitcoin signed message. One ballot per member
   per session, enforced by a unique constraint on `[sessionId, memberId]`;
   voting again before close replaces the earlier ballot.
4. Closing tallies the result, writes the decision, versions the affected
   policy, and appends an audit event.

## Data model

`src/lib/db/schema.ts` is the SSOT — **9 models** (Drizzle), with types, validation
and API contracts derived from it.

```
Organization ── has many ──> Member (HUMAN | AGENT; OrangeCat identity and/or own Bitcoin key)
     │                          │
     ├── Proposal ──> VotingSession ──> Vote (signed, unique per session)
     ├── Policy            (versioned; what a decision actually changes)
     ├── TreasurySource    (watch-only address — label + address, nothing else)
     ├── AuditEvent        (append-only)
     └── AgentApiKey       (how a sibling agent authenticates)
```

Domain logic lives in `src/lib/domain/` (`proposals`, `voting`, `tally`,
`decision`, `treasury`, `membership`, `organization`, `org`, `canonical`) and
stays free of HTTP and UI concerns.
Bitcoin message signing and verification is `src/lib/bitcoin/message.ts`.

**Identity is one seat per organization.** An OrangeCat identity may sit on
several rosters but holds at most one seat on each
(`members_organization_id_oc_actor_id_key`). **Founding is permissionless.**
Any recognized OrangeCat identity may found an organization (a Bitcoin key is
optional), and the organization, the founder's seat and both audit
events land in one transaction (`src/lib/domain/organization.ts`). An
organization is recorded as governing a Loki project (`claimed_project`) only
when Loki signed a grant for the founder's own identity (`src/lib/loki-grant.ts`)
— never because the names happen to match.

## API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/orgs` | Every organization, and the Loki project each governs by consent |
| `POST` | `/api/orgs` | Found an organization (OrangeCat session; Bitcoin signature optional) |
| `GET` | `/api/orgs/{slug}` | Organization and its members |
| `GET` | `/api/orgs/{slug}/audit` | Append-only audit trail |
| `GET` | `/api/orgs/{slug}/policies/{key}` | Current policy version |
| `GET` | `/api/orgs/{slug}/proposals` | Proposals for an organization |
| `GET` | `/api/orgs/{slug}/treasury` | Watch-only treasury sources |
| `POST` | `/api/proposals` | Create a proposal |
| `POST` | `/api/proposals/{id}/open` | Open voting |
| `GET` | `/api/sessions/{id}` | Session state and tally |
| `POST` | `/api/sessions/{id}/votes` | Cast or change a vote (signed-in member, or Bitcoin signature) |
| `POST` | `/api/sessions/{id}/close` | Close and record the decision |
| `GET` | `/api/v1/decisions/{sessionId}` | **Self-verifying** signed record |
| `GET` | `/api/health` | Liveness |

## Pages

**Public:** `/`, `/features`, `/security`, `/integration`, `/about`,
`/ecosystem` (the live governed state), `/join`, `/propose`, `/proposals`,
`/governance/voting`, `/governance/audit`, `/treasury/bitcoin`,
`/orgs/{slug}` (an organization's roster and record), `/orgs/new` (found one)

**Governance, explained** — the teaching section. Every tally on these pages is
produced by the same `aggregate()` that counts a real session, so a change to
how Solon counts changes the lesson rather than leaving it stale:

| Page | What it demonstrates |
|---|---|
| `/governance` | The four questions every organization answers; Condorcet's paradox drawn |
| `/governance/methods` | One room, five ways of counting, two different winners (interactive) |
| `/governance/thresholds` | Quorum and threshold as two knobs over one vote (interactive) |
| `/governance/who-decides` | Every category's electorate, threshold and quorum; the humans-only red lines |
| `/governance/profiles` | The five shipped profiles compared rule by rule |

The worked examples live in `src/lib/governance/worked-example.ts` and supply
*ballots only* — never a result. `src/lib/__tests__/worked-example.test.ts`
pins the conclusions the pages state, so a published lesson cannot quietly
become false.

**Authenticated:** `/dashboard`, `/dashboard/treasury`, `/dashboard/voting`,
`/account`

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.3 (App Router, `output: 'standalone'`) |
| Language | TypeScript 6.0 (strict) |
| Database | PostgreSQL + Drizzle ORM |
| Auth | NextAuth v5 (beta) |
| Styling | Tailwind CSS 4 — tokens from `@fleet/design-tokens` |
| Bitcoin | `@noble/*` + `bs58check` (signing / verification) |
| Tests | Vitest (unit + integration), Playwright e2e, Puppeteer smoke |
| i18n | English, German, French, Italian |

Design system: see [`docs/development/ui-guidelines.md`](docs/development/ui-guidelines.md).
Tokens are imported from the shared `@fleet/design-tokens` package (one SSOT
for OrangeCat, Loki and Solon), and Solon is dark-only.

## Quick start

```bash
git clone https://github.com/bitbaum/solon.git
cd solon
pnpm install

cp .env.example .env          # set DATABASE_URL
pnpm run db:migrate            # applies drizzle/ migrations (baseline + seed)

pnpm run dev                   # http://localhost:3000
```

Add a member or cast an agent vote:

```bash
pnpm exec tsx scripts/add-member.ts
pnpm exec tsx scripts/agent-vote.ts
```

## Verifying a change

`pnpm run verify` is the single gate, and CI runs exactly it:

```bash
pnpm run verify   # format:check && lint && typecheck && design:check && test
```

```bash
pnpm run test:e2e         # Playwright (needs a running app)
pnpm run test:puppeteer   # smoke against BASE_URL
```

Merging to `main` deploys to production automatically. Green PRs merge
themselves — the exact policy lives once in the fleet-wide sweep in `bitbaum/fleet` (`.github/workflows/auto-merge-sweep.yml`), which this repo calls.

## License

MIT. See [LICENSE](LICENSE).

---

*Governance should be verifiable, not trusted.*
