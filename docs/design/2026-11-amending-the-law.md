# Amending the law: proposals anyone can make, against the exact text

2026-11-06. The engine behind `ROADMAP.md` → "Law you can act on". The owner's
words: people must be able to "easily review every single word … propose
changes and vote on that, or bring it to the referendum", and it has to be
"properly designed and properly engineered". This file is the design; the
code is `src/lib/law/amend/` and `src/lib/db/amendments-schema.ts`.

## What it is, and what it is not

An **amendment** is a proposed change to the law of one authority, written
against the exact text Solon holds, supported by people who put their name
(or their key) to it, and carried toward the route by which that authority
actually changes its law.

It is **not law**, and Solon never says it is. Support on Solon is evidence:
an official petition needs the signatures the authority's own rules require,
from the people they name. Every page that shows a count says so beside it,
and shows the official bar next to it.

## Prior art, and what is taken from each

| Practice | What Solon takes |
| --- | --- |
| **Akoma Ntoso / LegalDocML** (OASIS, the XML standard parliaments use for bills and amendments) | An amendment is a list of **textual modifications**, each one of a small set of operations — substitute, insert, repeal — aimed at one provision, never a free-text wish. Solon stores the same three operations as JSON, so mapping to Akoma Ntoso `<mod>` later is mechanical. |
| **Git** | Every change records the **base it was written against** (version id + sha256 of each provision it touches). When the base moves, the amendment is not silently re-applied: it is flagged as written against older text and shown both, like a merge conflict. Forks are first-class and keep their lineage. |
| **Legislative drafting** (amendment sheets, the Swiss "synoptic table") | The redline is **computed** from the base and the proposed text, word by word, never typed by hand; base and proposal can be read side by side. |
| **Signed petitions / Bitcoin** | Support binds to a **content hash** of one immutable revision. Editing makes a new revision; nobody's support moves to words they did not see. A supporter may sign with their own Bitcoin key (BIP-137), so anyone can recount without trusting Solon. |
| **Append-only ledgers** | Every act — a revision filed, a support given or withdrawn — is an event in a **hash-chained log**: each event carries the hash of the one before it, so a removed or altered event breaks the chain for anyone who checks. The chain head is what gets anchored (OpenTimestamps) when `ROADMAP.md#proof-anchor` ships. |

## The model

```
law_amendments            one proposed change, stable over its revisions
  └─ law_amendment_revisions   immutable; the changes, the base, the hash
       └─ law_amendment_supports  append-only: support / withdraw rows
law_amendment_events      the hash-chained log of all of the above
```

- **Amendment**: the authority, the act, a title, who started it, and — when it
  is a fork — the revision it forked from. Never updated after insert.
- **Revision** `n` of an amendment: the language, the act version it was
  written against, the list of **changes**, the rationale, the author and
  their proof (ACCOUNT, or BIP-137 with signature), and `content_hash`. Never
  updated. Only the amendment's author may file revision `n+1`; anyone may fork.
- **Change** (one of):
  - `replace` — `path`, `baseHash` (sha256 of the provision's text as written
    against), `heading?`, `text`
  - `insert` — `after` (a path, or null for the start), `heading`, `text`
  - `repeal` — `path`, `baseHash`
  At most one change per path per revision; an insert's `after` must exist in
  the base. Text is plain text, as the provisions are.
- **Content hash** = sha256 of the canonical JSON (`src/lib/domain/canonical.ts`,
  the same contract proposals use) of
  `{ act, authority, baseVersion, changes, lang, rationale, title }`. The
  signed message for BIP-137 names the amendment, the revision number and this
  hash; its first line differs from every other Solon message so a signature
  cannot be replayed as a vote.
- **Support**: `(revision, supporter, kind: support|withdraw, proof,
  signature?)`. Rows are only ever inserted. A supporter's standing on a
  revision is their latest row. A supporter is an account (`actor:<id>`) or a
  Bitcoin address (`btc:<address>`); the two are counted separately and the
  page says which is which.
- **Event**: `(seq, prev_hash, hash, type, amendment, payload, recorded_at)`.
  `hash = sha256(prev_hash + canonical(payload + type + amendment + seq))`.
  Appending takes a transaction-scoped advisory lock so two writers cannot
  both claim the same predecessor.

## Status is derived, never stored

A status column is a second copy of a fact. The amendment's state is computed
from its revisions, its supports and the law as Solon holds it now:

- **current** — every provision it touches still has the text it was written
  against in the version in force;
- **outdated** — the law changed under it: a touched provision's text differs,
  or is gone, or the base version is no longer in force. The page shows the
  old base, the new text and the proposal, and offers "Write it again on the
  current text" (a new revision — or a fork, for anyone else);
- **withdrawn** — its author filed a withdrawal event.

## The official route

`src/lib/config/law/routes.ts`: per authority, the ways its law is changed
from outside the legislature, each with who may sign, how many, in what
window, before whom, and **the provision that says so**, with the day it was
read. A route with no source is not shipped. The amendment page shows the
route's bar beside Solon's count and never adds them up.

## Interfaces

- `GET /api/v1/law/amendments?authority=&act=` — list, with derived status and counts
- `GET /api/v1/law/amendments/{id}` — the amendment, every revision, the
  redline of the latest, support counts per proof
- `POST /api/v1/law/amendments` — file one (revision 1), or a fork
- `POST /api/v1/law/amendments/{id}/revisions` — the author files the next
- `POST /api/v1/law/amendments/{id}/support` — support or withdraw
- `GET /api/v1/law/amendments/log?after=` — the event chain, for anyone to verify

Writes go through `resolveActor` (`src/lib/auth/actor.ts`): a signature in the
body, or the signed-in account on a same-origin request.

## Known limits, stated so they are not mistaken for features

- **One person, two names.** A person who supports once with their account and
  once with a key is counted twice: Solon cannot tell the two are one person
  unless the key is bound to the account. Counts show accounts and keys apart
  for this reason. Binding a key to an account (as membership already does with
  `registrationMessage`) is the fix, and is next.
- **No residency.** Solon does not know who is a voter where. Support is
  support from anyone; the official route says who may actually sign.
- **Abuse limits.** An author may file at most 20 revisions an hour
  (`FILINGS_PER_HOUR`), and a support that changes nothing — supporting twice,
  withdrawing what was never given — is refused rather than written. Anything
  stronger (per-address limits for keys, proof of work) waits until there is
  abuse to measure.
- **Plain text.** Provisions are plain text, so changes are too; tables and
  formatting inside a provision are not modelled.

## Order of work

1. The engine (this file's model, the domain functions, the routes, tests).
2. The screens: "Propose a change" on every provision; the amendment page
   (redline, side by side, support, the route); open amendments per place and
   per act.
3. New Hampshire and Grafton as the first place where the loop is whole: the
   RSAs, Grafton's ordinances, and the warrant-article route.
