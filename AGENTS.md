# AGENTS.md — Solon

Governance rail for the OrangeCat stack: proposals, Bitcoin-signed votes,
versioned policies, append-only audit. The treasury is **watch-only** — Solon
stores addresses to observe and never holds keys or funds.

Read `README.md` for what the product is. This file is how to work in the repo.

## Stack

- **Framework**: Next.js 16.3 (App Router, `output: 'standalone'` for the Hetzner deploy)
- **Language**: TypeScript 5.5 (strict)
- **Database**: PostgreSQL via Drizzle ORM (`drizzle-orm/node-postgres` + `pg` Pool)
- **Auth**: NextAuth v5 (beta) — sign in with OrangeCat (OAuth)
- **Styling**: Tailwind CSS 3.4, tokens in `src/app/globals.css`
- **Bitcoin**: `@noble/*`, `bs58check` (message signing / signature verification)
- **Tests**: Vitest (unit + integration), Playwright e2e, Puppeteer smoke (`tests/`)

## Everyday commands

```bash
npm run dev          # next dev (localhost:3000)
npm run build        # next build (standalone) — no codegen step, Drizzle types come from the schema
npm run verify       # lint + typecheck + design:check + test — run before every commit
```

`npm run verify` is the single source of truth for "is this change clean?" CI
calls it verbatim. Green `verify` locally ⇒ green CI.

## Drizzle / database

- Schema SSOT: `src/lib/db/schema.ts` (9 models). Types flow from it via `$inferSelect`;
  enum vocabulary lives in `src/lib/db/enums.ts` (dependency-free, safe for client code).
- **There is no codegen.** Typecheck and build read the schema module directly.
- Migrations live in `drizzle/` (`npm run db:generate` after a schema change;
  `npm run db:migrate` applies them). **Running migrations against a real
  database is manual / deploy-time only** — do not add a push step to CI's verify job.
- Migration history begins at `drizzle/0000_init` (baseline matching the tables the
  retired Prisma migrations created — byte-identical names, proven by pg_dump diff)
  plus `drizzle/0001_seed_org1` (org #1 reference data). The production database
  predates this history and is baselined in the deploy ledger
  (`public._deploy_schema_history`), so these two files never run there.

## CI

`.github/workflows/ci.yml` runs two jobs on every push/PR to `main`:

| Job | What it does |
|---|---|
| `verify` | `npm ci` → `npm run verify` → `npm run build` |
| `integration` | `drizzle-kit migrate` on a **fresh** Postgres, then the vote-spine integration spec |

The integration job is why migrations must replay cleanly from the baseline: it
builds the database from scratch every run.

Green PRs merge and deploy themselves — `scripts/ci/auto-merge-sweep.sh` holds
the policy, and merging to `main` deploys via FleetCrown's `selfhost-deploy.yml`.

## Design

- Tokens live in `src/app/globals.css` **only**; `tailwind.config.js` maps
  utilities onto them and never holds a literal value.
- Solon shares OrangeCat's token names and values, and is **dark-only**.
  The legacy `navy` / `solon-*` palette is deleted — using it fails the build.
- `npm run design:check` (part of `verify`) enforces this. See
  `docs/development/ui-guidelines.md`.

## Notes for agents

- **Never commit secrets.** `.env.example` lists every variable the app reads;
  copy it to `.env` and fill it in.
- All user-facing copy lives in `i18n/{en,de,fr,it}.json` — four languages ship,
  so never hard-code a string in a component.
- Domain logic belongs in `src/lib/domain/` and stays free of HTTP and UI.
- Some decision categories are **humans-only** (`AID_DISBURSEMENT`, `MEMBERSHIP`,
  `SAFETY`, `GOVERNANCE_RULES`). See `src/lib/config/governance.ts`; these are
  red lines, not defaults to tune.
