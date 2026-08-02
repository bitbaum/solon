# AGENTS.md — Solon

Bitcoin-native governance platform (transparent treasury + cryptographic democracy).

## Stack

- **Framework**: Next.js 14 (App Router, `output: 'standalone'` for the Hetzner deploy)
- **Language**: TypeScript 5.5 (strict)
- **Database**: PostgreSQL via Prisma 5
- **Styling**: Tailwind CSS 3
- **Bitcoin**: `@noble/*`, `bs58check` (message signing / signature verification)
- **Tests**: Playwright e2e + Puppeteer smoke scripts (`tests/`)

## Everyday commands

```bash
npm run dev          # next dev (localhost:3000)
npm run build        # next build (standalone) — run `prisma:generate` first (no postinstall)
npm run lint         # next lint (eslint, next/core-web-vitals)
npm run typecheck    # tsc --noEmit
npm run verify       # lint + typecheck — the CI floor, run before every commit
```

`npm run verify` is the single source of truth for "is this change clean?" CI calls it
verbatim. Green `verify` locally ⇒ green CI.

## Prisma / database

- Schema SSOT: `prisma/schema.prisma`. Types flow from it via `@prisma/client`.
- **`prisma generate` is NOT automatic** — no postinstall hook. Run `npm run prisma:generate`
  before `typecheck` or `build` so the client types exist. CI does this explicitly.
- **`db push` / migrations are MANUAL and out of CI's scope.** `npm run prisma:push`
  (`prisma db push`) is run by hand against a live database. CI never touches a real DB —
  do not add a migration/push step to the workflow.
- Migration history begins at `prisma/migrations/0_init` (versioned baseline).

## CI floor

`.github/workflows/ci.yml` runs `npm ci` → `prisma generate` → `npm run verify`
(lint + typecheck) on every push/PR to `main`. `next build` is not yet gated in CI (see below).

## Notes for agents

- Keep design tokens in the Tailwind/CSS SSOT; theme is Bitcoin-orange + navy.
- Never commit secrets. `.env` holds `DATABASE_URL`, `BTCPAY_*`, `BITCOIN_*`, Clerk keys.
- Amounts are stored in satoshis as BigInt — never floats.
