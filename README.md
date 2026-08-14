# Solon

Bitcoin-native governance for transparent treasury management and cryptographic democracy.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000.svg)](https://nextjs.org/)

---

## The Stack: Three Pillars

Solon is the **governance pillar** of a three-product stack, live at [solon.orangecat.ch](https://solon.orangecat.ch):

| Pillar | Product | Role |
|---|---|---|
| Economy | [OrangeCat](https://orangecat.ch) | Bitcoin-native economic layer — entities, wallets, payments, the public timeline |
| Engineering | [FleetCrown](https://fleetcrown.orangecat.ch) | AI-agent fleet control plane — dispatch, terminals, and the deploy pipeline for the whole stack |
| Governance | **Solon** (this repo) | Proposals, Bitcoin-signed votes, versioned policies, append-only audit |

The ties are real, not marketing:

- **OrangeCat's platform allocation policy is governed here.** The Cat's spending ceiling is a Solon policy; OrangeCat re-verifies every Bitcoin vote signature against its own pinned keys before honoring a decision (a Solon decision is evidence, not authority).
- **Both sibling agents are voting members.** The Cat (`orangecat:cat`) and Loki (`fleetcrown:loki`) hold their own keys and cast Bitcoin signed-message votes via `scripts/agent-vote.ts`. Humans-only categories (membership, safety, aid, governance rules) are red lines agents cannot vote on.
- **FleetCrown ships Solon.** `.github/workflows/deploy.yml` calls FleetCrown's shared `selfhost-deploy.yml`; a merge to `main` deploys to production.
- **Decisions are self-verifying.** `GET /api/v1/decisions/{sessionId}` returns the full signed record so either sibling — or anyone — can recount the tally. See `/ecosystem` on the live site for the current governed state.

## What Solon Does

- **Puts public finances on-chain.** Every treasury transaction is tracked against a multi-sig Bitcoin wallet. Amounts stored in satoshis as BigInt — no floating point, no rounding errors, no trust required.
- **Makes decisions auditable.** Laws and governance decisions are cryptographically signed, linked to voting sessions, and tracked against measurable KPIs.
- **Opens procurement to competition.** Service requests and bids live in the open. Vendor performance is scored, not assumed.
- **Replaces trust with math.** Votes are signed with Bitcoin keys, verified cryptographically, and enforced as one-member-one-vote per session.

## Architecture

Solon is built on four pillars. Each pillar maps to a domain in the codebase and a set of Prisma models that serve as the single source of truth.

### The Four Pillars

**1. Transparent Transaction System** — `prisma/schema.prisma: BitcoinTransaction, BudgetAllocation`

All organizational finances route through Bitcoin. Organizations carry an `xpub` field for multi-sig wallet derivation. Budget allocations reference transactions by ID, creating an auditable chain from proposal to spend.

**2. Law Transparency Framework** — `prisma/schema.prisma: Decision`

Decisions link to the voting session that produced them. Each carries a `kpiTracking` JSON field for effectiveness measurement after passage. No decision exists without a recorded vote.

**3. Open Service Marketplace** — `prisma/schema.prisma: ServiceRequest, ServiceBid`

Procurement is open by default. Service requests publish requirements; bids compete on merit. Vendor performance feeds back into future evaluations.

**4. Open Vote System** — `prisma/schema.prisma: VotingSession, Vote`

Votes are cryptographically signed (`signature` field on Vote). One vote per member per session, enforced by a unique constraint on `[sessionId, memberId]`. Sessions support multiple mechanisms: `SIMPLE_MAJORITY`, `SUPERMAJORITY`, `CONSENSUS`, `RANKED_CHOICE`.

### Schema as SSOT

The Prisma schema defines 10 models. Types, validation, and API contracts derive from it — nothing is defined twice.

```
Organization  ── has many ──> Member
     │                          │
     ├── BitcoinTransaction     ├── Vote (signed, unique per session)
     ├── BudgetAllocation       │
     ├── VotingSession ─────────┘
     ├── Decision (linked to VotingSession)
     ├── ServiceRequest
     └── ServiceBid
```

Key design decisions:
- Organizations define a `governanceModel` enum: `DEMOCRATIC | CONSENSUS | DELEGATED`
- Members carry `bitcoinAddress` and `votingWeight` (defaults to 1.0)
- All monetary amounts are `BigInt` satoshis — `amountSats` on transactions, `allocatedSats` / `spentSats` on budgets

### Transparency Engine

A computation layer scores every organization across five dimensions (0-100 each):

| Metric | What It Measures |
|---|---|
| Financial Transparency | On-chain transaction coverage vs. total spend |
| Decision Auditability | Percentage of decisions with linked voting sessions |
| Participation Rate | Active voters vs. eligible members |
| Corruption Risk | Inverse score — flags concentration of spending authority |
| Cost Efficiency | Bid competitiveness and budget adherence |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.5 (strict mode) |
| Styling | Tailwind CSS |
| Database | PostgreSQL + Prisma ORM |
| Bitcoin | BTCPay Server / Bitcoin Core (stubbed in MVP) |
| Testing | Playwright E2E + Puppeteer smoke tests |
| i18n | English, German, French, Italian |

## Route Map

**Marketing pages:** `/`, `/features`, `/security`, `/integration`, `/about`, `/governance/voting`

**Dashboard:** `/dashboard`, `/dashboard/voting`, `/treasury/bitcoin`

**API:**
- `GET /api/bitcoin/wallet/[orgId]` — wallet balance and transaction history
- `PUT /api/bitcoin/wallet/[orgId]` — update wallet configuration
- `POST /api/voting/[sessionId]/cryptographic-vote` — submit a signed vote
- `GET /api/voting/[sessionId]/cryptographic-vote` — retrieve vote tally

<details>
<summary><strong>Quick Start</strong></summary>

```bash
# Clone and install
git clone https://github.com/your-org/solon.git
cd solon
npm install

# Set up the database
cp .env.example .env
# Edit .env with your PostgreSQL connection string
npx prisma migrate dev

# Run development server
npm run dev
```

Open `http://localhost:3000`. The dashboard is at `/dashboard`.

**Run tests:**

```bash
# E2E tests
npx playwright test

# Smoke tests
npx puppeteer test
```

</details>

## Project Structure

```
solon/
  prisma/
    schema.prisma              # SSOT — 10 models, all types derived from here
  src/
    app/
      page.tsx                 # Landing page
      dashboard/
        page.tsx               # Organization dashboard
        voting/page.tsx        # Voting interface
      treasury/
        bitcoin/page.tsx       # Treasury view
      api/
        bitcoin/wallet/[orgId] # Wallet endpoints
        voting/[sessionId]/    # Voting endpoints
    components/
      bitcoin-treasury.tsx     # Balance display + transaction table
      voting-interface.tsx     # Live voting with real-time tally
      four-pillars.tsx         # Interactive pillar cards
      transparency-demo.tsx    # Live transparency scoring (4 tabs)
    lib/
      transparency-engine.ts   # Score computation (5 metrics, 0-100)
```

## Roadmap

**Now (MVP):** Pillars 1 and 4 scaffolded. Bitcoin integrations stubbed for local development. Transparency engine computes scores from seed data.

**Next:**
- Live BTCPay Server integration for real transaction tracking
- Cryptographic vote verification against Bitcoin key pairs
- Multi-sig wallet support via descriptor wallets
- Service marketplace with bid evaluation scoring

**Later:**
- Federated governance across organizations
- On-chain decision anchoring (OP_RETURN or Taproot)
- Mobile-first voting interface
- Delegation chains with revocation

## License

MIT. See [LICENSE](LICENSE).

---

*Governance should be verifiable, not trusted. Solon makes that possible.*
