# Solon

An MVP for traceable Bitcoin treasury records and Bitcoin signed-message vote verification.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000.svg)](https://nextjs.org/)

## Current scope

Solon currently provides:

- Organization treasury reads backed by PostgreSQL, with integer-satoshi transaction records and optional address balance lookup through mempool.space.
- Standard Bitcoin signed-message verification that binds a vote to its session, choice, and registered member address.
- Active-session/member eligibility checks, stored weighted tallies, and one member record per session through a unique database constraint.
- A transparency-evidence endpoint that returns raw ledger and governance counts without inventing a score.
- Guided, explicitly illustrative marketing/demo pages and database-offline dashboard fallbacks.

The MVP does **not** yet provide authentication/authorization, treasury mutations, wallet-assisted signing, proposal administration, a procurement marketplace UI/API, multi-signature spending, on-chain decision anchoring, anonymous voting, hosted SDKs, or a complete audit workspace. The UI and documentation label these boundaries rather than simulating successful product activity. Vote requests have field and actual-body byte bounds plus a bounded process-local abuse brake; production still requires a shared rate limiter at the edge or in a durable store.

## Architecture and SSOTs

- `prisma/schema.prisma` is the database schema and generated Prisma-type source.
- `src/lib/site-config.ts` is the implemented page-route and shared-navigation catalog.
- `src/app/globals.css` is the visual-token source.
- `scripts/verify-routes.mjs` compares filesystem pages with the route catalog and rejects unregistered static internal links.

The Prisma models cover organizations, members, Bitcoin transactions, decisions, voting sessions, votes, service requests/bids, and budget allocations. Service procurement models are schema groundwork only; no usable marketplace journey is shipped.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router, standalone output |
| Language | TypeScript 5.5 strict mode |
| Database | PostgreSQL + Prisma 5 |
| Styling | Tailwind CSS 3 |
| Bitcoin | `@noble/*`, `bs58check`, mempool.space reads |
| Testing | Playwright E2E + Puppeteer smoke scripts |

## Route map

**Marketing/demo pages:** `/`, `/features`, `/security`, `/integration`, `/about`, `/governance/voting`, `/treasury/bitcoin`

**Dashboard:** `/dashboard`, `/dashboard/treasury`, `/dashboard/voting`

**Implemented APIs:**

- `GET /api/bitcoin/wallet/[orgId]` — treasury address, balance/source, and recent transaction records.
- `GET /api/solon/transparency?orgId=…` — read the organization identity, net total of signed recorded amounts, and source record counts.
- `GET /api/voting/[sessionId]/cryptographic-vote` — retrieve a weighted tally.
- `POST /api/voting/[sessionId]/cryptographic-vote` — verify and store `{ choice, address, signature }`.

See [`docs/route-and-journey-audit.md`](docs/route-and-journey-audit.md) for persona journeys, responsive coverage, and detailed limitations.

## Local development

```bash
npm ci
npm run prisma:generate

# Configure DATABASE_URL in .env, then provision the schema manually.
npm run prisma:push

npm run dev
```

The app opens at `http://localhost:3000`; the guided dashboard starts at `/dashboard`. When PostgreSQL cannot be reached, treasury and voting dashboard pages show prominent sample-mode messages. API handlers do not convert missing database state into a sample success.

## Verification

```bash
# CI floor: lint, strict typecheck, and deterministic route integrity
npm run verify

# Browser routes and journeys (install Playwright browsers first when needed)
npm run test:e2e

# Production bundle
npm run build
```

The verify gate also runs domain/API-contract unit tests on the Node 20-compatible
TypeScript test runner. The browser suite includes 375px and 390px mobile
coverage when those projects are selected, checks all ten page routes, follows
the primary voting journey, verifies internal-link reachability, and detects
horizontal overflow/clipped controls. Weighted vote tallies are serialized as
exact decimal strings rather than binary floating-point numbers.

## Project structure

```text
solon/
  prisma/schema.prisma            # Database SSOT
  scripts/verify-routes.mjs       # Route/catalog regression gate
  src/app/                        # App Router pages and API handlers
  src/components/                 # Shared marketing, dashboard, and UI components
  src/lib/bitcoin/                # Signed-message and Bitcoin helpers
  src/lib/solon/                  # Governance/transparency domain operations
  src/lib/site-config.ts          # Page route/navigation SSOT
  tests/e2e/                      # Route and journey browser tests
```

## Roadmap

High-value next work:

- Authentication, organization administration, and explicit role authorization.
- Wallet-assisted signing and end-to-end vote submission in the UI.
- Proposal creation, discussion, closure, and historical audit views.
- Multi-signature treasury proposal/signing workflows.
- Procurement workspace and APIs over the existing request/bid schema.
- Production observability, rate limiting, backups, and deployment hardening.

## License

MIT. See [LICENSE](LICENSE).
