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
| How do I work in the repo — commands, CI, Drizzle, gotchas? | `AGENTS.md` |
| What are the design rules? | `docs/development/ui-guidelines.md` |
| What are the tokens? | `@fleet/design-tokens` — one package, shared by all three products |
| What is the schema? | `src/lib/db/schema.ts` (9 models) |
| Which env vars exist? | `.env.example` |

## The three that matter most

**`pnpm run verify` is the gate.** format:check + lint + typecheck + design:check + test. CI runs
exactly it. Run it before every commit.

**Design tokens live in `@fleet/design-tokens`, not in this repo.** One package
is the SSOT for OrangeCat, Loki and Solon — it owns the tokens *and* the
self-hosted faces, so changing the display typeface for the whole stack is one
line in one file. `globals.css` holds no tokens and `tailwind.config.js` defines
no colours; both would fail `design:check` if they did. Solon is dark-only. The
`navy` / `solon-*` palette is deleted, not aliased. Never write a hex in a
component, a raw `rounded-lg`, or a drop shadow (hierarchy is border + type).

**Headlines are the sans, like OrangeCat's and Loki's** — `.headline` (sentence
case) or `.headline-caps` (a short uppercase statement), both in `globals.css`.
`design:check` fails on `font-display` (the shared serif) and on display-size
type without a headline style. Full-screen photo sections use `FullBleed`
(`src/components/site/`); every photograph comes from `src/lib/content/photos.ts`
with its licence, and `/credits` renders that list. **CSS is invisible to lint
and typecheck** — `tests/e2e/render.spec.ts` (run in CI's `integration` job)
checks styled buttons, a one-line header and no sideways scroll on phones. Look
at a page before shipping it.

**Some decisions are humans-only.** `AID_DISBURSEMENT`, `MEMBERSHIP`, `SAFETY`
and `GOVERNANCE_RULES` cannot be voted by agent members. See
`src/lib/config/governance.ts`. These are red lines, not defaults to tune.

## No dead ends

A gate records; it never blocks. Every rule that stops a person also shows
them the way forward, on the same screen — a default with its consequence
stated and one tap to change it, a "skip" that lands exactly where the old
path landed, a pre-filled proposal to change the rule itself. A link that
arrives with context (`?from=orangecat…`, `?title=…`) keeps that context
through sign-in and `/join` (`lib/domain/proposal-draft.ts`). CI that finds a
rules change with no decision behind it warns and links the ratification
proposal (`scripts/check-governance-ratified.ts`); it does not fail the job.
This is fleet-wide, not Solon's alone; its permanent home is bitbaum/fleet
`AGENTS.md`, and this paragraph points there once it is written.

## Don't

- Skip signature verification on a vote.
- Add an amount field to the treasury. It is **watch-only** by design — a label
  and an address, with no code path that can spend.
- Add an update or delete path to audit events. Append-only is the product.
- Assemble a sentence by concatenation. `"You have " + n + " votes"` cannot be
  translated without re-authoring it; `You have {n} votes` can. This is the one
  i18n habit that is expensive to undo later — plain inline English strings are
  fine and are a mechanical sweep whenever we need them. See `AGENTS.md`,
  "Language".
- Commit `.env`.
