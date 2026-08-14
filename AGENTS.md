# AGENTS.md — Solon

Governance rail for the OrangeCat stack: proposals, Bitcoin-signed votes,
versioned policies, append-only audit. The treasury is **watch-only** — Solon
stores addresses to observe and never holds keys or funds.

Read `README.md` for what the product is. This file is how to work in the repo.

## Stack

- **Framework**: Next.js 14.2 (App Router, `output: 'standalone'` for the Hetzner deploy)
- **Language**: TypeScript 5.5 (strict)
- **Database**: PostgreSQL via Prisma 5.17
- **Auth**: NextAuth v5 (beta) — sign in with OrangeCat (OAuth)
- **Styling**: Tailwind CSS 3.4, tokens in `src/app/globals.css`
- **Bitcoin**: `@noble/*`, `bs58check` (message signing / signature verification)
- **Tests**: Vitest (unit + integration), Playwright e2e, Puppeteer smoke (`tests/`)

## Everyday commands

```bash
npm run dev          # next dev (localhost:3000)
npm run build        # next build (standalone) — run `prisma:generate` first (no postinstall)
npm run verify       # lint + typecheck + design:check + test — run before every commit
```

`npm run verify` is the single source of truth for "is this change clean?" CI
calls it verbatim. Green `verify` locally ⇒ green CI.

## Prisma / database

- Schema SSOT: `prisma/schema.prisma` (9 models). Types flow from it via `@prisma/client`.
- **`prisma generate` is NOT automatic** — no postinstall hook. Run `npm run prisma:generate`
  before `typecheck` or `build` so the client types exist. CI does this explicitly.
- **`db push` against a real database is manual.** `npm run prisma:push` is run by hand.
  Do not add a push step to the workflow.
- Migration history begins at `prisma/migrations/0_init` (versioned baseline).

## CI

`.github/workflows/ci.yml` runs two jobs on every push/PR to `main`:

| Job | What it does |
|---|---|
| `verify` | `npm ci` → `prisma generate` → `npm run verify` → `npm run build` |
| `integration` | `prisma migrate deploy` on a **fresh** Postgres, then the vote-spine integration spec |

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
