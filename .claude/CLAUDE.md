# Solon

@~/.claude/CLAUDE.md

---

## Read these, not a copy of them

This file used to restate the stack, the design tokens, the nav tree and the API
surface. Every one of those had drifted — it documented a navy palette that no
longer exists, five routes that were never built, and an entirely fictional API.
A second copy of the truth is a copy that goes stale, so it is gone.

| Question | Read |
|---|---|
| What is Solon, what are the models and routes? | `README.md` |
| How do I work in the repo — commands, CI, Prisma, gotchas? | `AGENTS.md` |
| What are the design rules? | `docs/development/ui-guidelines.md` |
| What are the tokens? | `src/app/globals.css` (the only place) |
| What is the schema? | `prisma/schema.prisma` (9 models) |
| Which env vars exist? | `.env.example` |

## The three that matter most

**`npm run verify` is the gate.** lint + typecheck + design:check + test. CI runs
exactly it. Run it before every commit.

**Design tokens live in `globals.css` and nowhere else.** Solon shares
OrangeCat's token names and values and is dark-only. The `navy` / `solon-*`
palette is deleted, not aliased — using it fails the build. Never write a hex in
a component, a raw `rounded-lg`, or a drop shadow (hierarchy is border + type).

**Some decisions are humans-only.** `AID_DISBURSEMENT`, `MEMBERSHIP`, `SAFETY`
and `GOVERNANCE_RULES` cannot be voted by agent members. See
`src/lib/config/governance.ts`. These are red lines, not defaults to tune.

## Don't

- Skip signature verification on a vote.
- Add an amount field to the treasury. It is **watch-only** by design — a label
  and an address, with no code path that can spend.
- Add an update or delete path to audit events. Append-only is the product.
- Hard-code a user-facing string; four languages ship from `i18n/`.
- Commit `.env`.
