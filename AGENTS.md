# AGENTS.md — Solon

Governance rail for the OrangeCat stack: proposals, one-click or Bitcoin-signed votes,
versioned policies, append-only audit. The treasury is **watch-only** — Solon
stores addresses to observe and never holds keys or funds.

Read `README.md` for what the product is. This file is how to work in the repo.

## Stack

- **Framework**: Next.js 16.3 (App Router, `output: 'standalone'` for the Hetzner deploy)
- **Language**: TypeScript 6.0 (strict)
- **Database**: PostgreSQL via Drizzle ORM (`drizzle-orm/node-postgres` + `pg` Pool)
- **Auth**: NextAuth v5 (beta) — sign in with OrangeCat (OAuth)
- **Styling**: Tailwind CSS 4, tokens from `@fleet/design-tokens`
- **Bitcoin**: `@noble/*`, `bs58check` (message signing / signature verification)
- **Tests**: Vitest (unit + integration), Playwright e2e, Puppeteer smoke (`tests/`)

## Everyday commands

```bash
pnpm run dev          # next dev (localhost:3000)
pnpm run build        # next build (standalone) — no codegen step, Drizzle types come from the schema
pnpm run verify       # format:check + lint + typecheck + design:check + test — run before every commit
```

`pnpm run verify` is the single source of truth for "is this change clean?" CI
calls it verbatim. Green `verify` locally ⇒ green CI.

## Drizzle / database

- Schema SSOT: `src/lib/db/schema.ts` (9 models). Types flow from it via `$inferSelect`;
  enum vocabulary lives in `src/lib/db/enums.ts` (dependency-free, safe for client code).
- **There is no codegen.** Typecheck and build read the schema module directly.
- Migrations live in `drizzle/` (`pnpm run db:generate` after a schema change;
  `pnpm run db:migrate` applies them). **Running migrations against a real
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
| `verify` | `pnpm install --frozen-lockfile` → `pnpm run verify` → `pnpm run build` |
| `integration` | `drizzle-kit migrate` on a **fresh** Postgres, then the vote-spine integration spec |

The integration job is why migrations must replay cleanly from the baseline: it
builds the database from scratch every run.

Green PRs merge and deploy themselves — the fleet-wide sweep in `bitbaum/fleet` (`.github/workflows/auto-merge-sweep.yml`) holds the policy for every
repo in the fleet, and merging to `main` deploys via Loki's
`selfhost-deploy.yml`. This repo used to keep its own copy of that script; it
was deleted so a fix to the sweep reaches here without being re-ported.

## Design

- Tokens live in the shared `@fleet/design-tokens` package **only**;
  `tailwind.config.js` consumes its Tailwind preset and never holds a literal
  value, and `src/app/globals.css` carries Solon-specific rules, no tokens.
- Solon shares OrangeCat's token names and values, and is **dark-only**.
  The legacy `navy` / `solon-*` palette is deleted — using it fails the build.
- `pnpm run design:check` (part of `verify`) enforces this. See
  `docs/development/ui-guidelines.md`.

## What Solon governs

Solon is the **governance plane** of an entity. An entity is anything that can
hold a wallet and is better for holding one — a test rather than a list, so the
list is open in principle. The same entity sits on three planes: **OrangeCat**
is its economy (it can hold, receive and send value), **Solon** its governance
(its decisions can be put to a signed vote), **Loki** its execution (it can be
worked on, built and shipped).

Loki's plane was called "engineering" until 2026-09-20. The rename matters here
because the old word made two thirds of that product look misplaced: Loki also
holds the people an operator works with, what they owe and what they spend, and
no other product has a surface for those. What separates the three planes is
AUDIENCE — OrangeCat is public by design, Loki private by default, Solon shared
with its members — not subject matter.

Producer, and the only place the list of types lives:
`orangecat/src/config/entity-registry.ts`, where every type carries
`wallet: { holds, why }`. Do not restate that list here — three copies of it
lived in orangecat's own agent-read docs and all three had drifted. See
`bitbaum/fleet` `AGENTS.md` → Producers.

This is why "who may decide" is not Solon's to invent per surface: an entity
that can hold value is the thing a vote is about.

## Notes for agents

- **Never commit secrets.** `.env.example` lists every variable the app reads;
  copy it to `.env` and fill it in.
- User-facing copy on translated pages lives in `messages/<locale>.json`
  (see "Language" below) — never hard-code a sentence on a page that is in
  `TRANSLATED_ROUTES`.
- Domain logic belongs in `src/lib/domain/` and stays free of HTTP and UI.
- Some decision categories are **humans-only** (`AID_DISBURSEMENT`, `MEMBERSHIP`,
  `SAFETY`, `GOVERNANCE_RULES`). See `src/lib/config/governance.ts`; these are
  red lines, not defaults to tune.

## Language

**Five languages: English, German, French, Italian, Russian** — `next-intl`, the
fleet's choice for i18n (fleet `STACK.md`; evig, hirnli and four others use it).

- `src/i18n/routing.ts` is the one list of locales. English is the source and
  the default: unprefixed (`/hire`); the others are prefixed (`/de/hire`). The
  URL decides, never the browser.
- Every sentence lives in `messages/<locale>.json`. `src/i18n/types.d.ts` types
  `t()` keys against `en.json`, so a misspelt or missing key fails typecheck.
- `src/i18n/__tests__/parity.test.ts` fails if a language lacks a key English
  has, has one English lacks, drops a `{placeholder}`, or leaves a string empty.
- Pages move under `src/app/[locale]/`; API routes stay outside it. Link with
  `Link` / `useRouter` / `redirect` from `@/i18n/navigation`, never `next/link`,
  or a German reader clicks into English.
- A page not yet translated stays English and shows a notice in the reader's
  language. `TRANSLATED_ROUTES` in `site-config.ts` lists the ones that are.
- German uses Swiss spelling (ss, never ß).

**The one habit that matters:** never assemble a sentence by concatenation.
`"You have " + n + " votes"` cannot be translated; `You have {n} votes` can.

**Translate the product surface first, not the essays.** Nav, forms, the ballot,
the buttons — the words someone must read to cast a vote correctly. The
`/governance` teaching pages are precision prose about terms of art, and a
machine translation that renders sociocratic *consent* as *Zustimmung* rather
than *Konsent* teaches the opposite of what the page exists to teach. Terms of
art get one fixed translation per language, in the glossary, reviewed by a
native speaker before an essay ships in that language.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
