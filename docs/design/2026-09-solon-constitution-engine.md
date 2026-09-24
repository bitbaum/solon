# Solon: from a vote ledger to a constitution engine

_Design, 2026-09-24. Status: proposal. Nothing here is built unless it says so._
_The one-line vision stays in Solon's Loki project profile (the producer); this
file is the design behind it and does not restate it._

## 0. Where Solon actually is

Measured 2026-09-24 against the code and `solon.orangecat.ch`:

| Claim | Reality |
|---|---|
| "A legislature for an economy AI agents help run" | 1 org, **0 humans**, 2 agent members, 1 proposal (the Aug 7 smoke test) |
| "Everything after founding is voted" | Nothing admits a member, suspends one, changes a profile or adds a treasury source except an operator script or a migration |
| Decisions take effect | The **only** effect of an APPROVED vote is inserting a policy JSON version. `MEMBERSHIP`, `TREASURY_SPEND`, `SAFETY`, `GOVERNANCE_RULES` decisions change nothing |
| "One vote per member per session" | `voting.ts:237` upserts. The last ballot counts, and weight is not re-snapshotted |
| Organizations can be founded | They can. But 10 pages are wired to `primaryOrg()`, so a new org has no proposals, voting or dashboard UI |
| The constitution is governed | It lives in TypeScript (`config/governance.ts`, `governance-profiles.ts`). CI only *warns* on edits, and it watches the wrong one of the two files |
| Policies are voted | `originator_share` v1 and `claimed_project` arrived by migration, with no decision behind them |
| Humans-only red lines | Correct in code, but with no human seat a humans-only session can never open. Org #1 cannot amend its own rules |

**What is genuinely good and must survive:** signed proposals and votes (Bitcoin-only today; §2.4 opens that up);
rules snapshotted at open; six counting methods; an append-only audit; the
self-verifying decision document; and the principle — already practised by
OrangeCat — that **a Solon decision is evidence, not authority**: the executor
re-verifies signatures, electorate and tally against its own pinned keys before
it acts. That principle is the whole architecture below.

What is missing is not more governance theory. The site has plenty. Solon lacks
four things: **rules as data, decisions with effects, executors that enforce
them, and a way to take part that does not require owning Bitcoin.**

## 1. The shape: separation of powers across the three planes

The stack already has the organs of a polity. It has not wired them as one.

| Power | Plane | Holds | Today |
|---|---|---|---|
| **Legislative**: makes and amends rules | Solon | the charter, proposals, signed votes, decisions | votes are real, effects are not |
| **Executive**: carries decisions out | Loki | agents, the `actions` approval queue, Crew `human_tasks`, provisioning | `/api/solon/events` receives decisions and only logs them |
| **Treasury**: moves value | OrangeCat, or the group's own bank account | OrangeCat wallets (CHF or sats), or an ordinary bank account kept as a ledger; the Cat's spend caps | enforces exactly one Solon policy (`allocation_policy`) |
| **Judicial**: resolves disputes, checks execution | Solon | — | absent |

Each executor **re-verifies** before acting (OrangeCat's `decision-verify.ts`
pattern), and **reports back** a signed receipt. Solon never holds authority
over an executor, and an executor never acts without a verifiable mandate. That
is "transparently enforced" made concrete: for every decision anyone can see
*what was decided, who carried it out, and whether it happened*.

## 2. The five building blocks

### 2.1 The Charter: rules as data, amended by the rules

Every org has a **versioned Charter**. It is a document the org itself governs,
not a TypeScript constant:

- categories, and for each: electorate (all / humans-only / an office), method,
  threshold, quorum, window, enforcement mode (§2.3)
- **admission**: open / sponsored by N members / voted / invite-only
- **offices**: named roles (treasurer, clerk, keyholder), how they are filled,
  and their term limits
- **delegation**: allowed or not, per category
- **amendment rule**: entrenchment, i.e. changing the charter needs a higher bar
  than using it
- **exit**: what a leaving member keeps (their key, their record, a share?)

The five profiles (TOWN, ASSOCIATION, COOPERATIVE, COLLECTIVE, COMPANY) become
**charter templates** that an org starts from. A `GOVERNANCE_RULES` proposal's
content is a charter diff, and an approved one writes the next charter version.
The threshold/quorum rules exist only in the charter, so the current duplicate
(`CATEGORY_THRESHOLD` vs the per-profile values) disappears.

Solon itself keeps a small **platform floor** that no charter can remove. It is
the only thing that stays in code:

- signatures are verified;
- the audit trail is append-only;
- `AID_DISBURSEMENT`, `MEMBERSHIP` and `SAFETY` stay humans-only;
- exit is always possible.

This is the honest version of the current "red lines". The org owns its rules;
Solon owns only the guarantees that make the org's record trustworthy.

### 2.2 Motions: every decision has a typed effect

A proposal carries one or more **effects** from a registry. The registry follows
the pattern of OrangeCat's `entity-registry.ts`: one table, and each row
declares its category, schema, executor and reversibility.

| Effect | Category | Executor |
|---|---|---|
| `policy.set` | per policy | Solon (exists today) |
| `charter.amend` | GOVERNANCE_RULES | Solon |
| `member.admit` / `member.suspend` / `member.weight` | MEMBERSHIP | Solon |
| `office.appoint` / `office.recall` | per charter | Solon |
| `treasury.watch` | TREASURY | Solon |
| `treasury.spend` | TREASURY_SPEND | **OrangeCat** (wallet) or keyholders (multisig, §2.3) |
| `budget.allocate` | ALLOCATION_POLICY | OrangeCat (caps), Loki (AI budget) |
| `work.commission` | OPERATIONS | **Loki**: an `actions` row or a dispatch; Crew for human work |
| `aid.disburse` | AID_DISBURSEMENT | OrangeCat, humans-only |
| `dispute.rule` | per charter | Solon, then whatever effect the ruling orders |

Internal effects apply atomically in `closeSession`. External effects become a
**Mandate**: the decision document, plus the effect, plus the named executor,
delivered by the existing HMAC webhook. The executor answers with a **Receipt**
(`executed` / `refused: <reason>` / `failed`), and the receipt lands in the
audit trail. A decision page then shows its full lifecycle: proposed → voted →
mandated → executed.

With this in place, "everything after founding is voted" becomes a true sentence.

### 2.3 Enforcement modes: the community chooses how hard

The user's "if agreed" is the design. The charter picks one mode per category:

1. **Record.** The decision is published, and a human carries it out and
   attaches evidence. This is where most groups start.
2. **Officer.** The executor queues the mandate for an elected office-holder,
   e.g. in Loki's approval queue or OrangeCat's `cat_pending_actions`. A human
   clicks, but only on a mandate, and the click is receipted.
3. **Automatic.** The executor acts on a re-verified mandate. It stays bounded by
   caps the charter itself sets (as the Cat's ceiling is bounded today).
A treasury is **whatever money the group already has**. Usually that is a bank
account, and it enters Solon as a ledger: statements imported (Swiss banks
export camt.053), each outflow matched to the mandate that authorised it. An
OrangeCat wallet or an on-chain address is an option, not a precondition.

4. **Keyholder multisig: treasury without custody.** For groups that choose
   an on-chain treasury. A `treasury.spend`
   decision produces a PSBT. The elected keyholders sign it in their own
   wallets, and Solon never holds a key.

    Whatever the treasury is, combining a watched ledger with mandates gives the
    strongest transparency feature available: **any outflow that no mandate
    authorised is detected and raised automatically as a SAFETY motion.** On-chain
    this is live; for a bank account it happens at each statement import.
    Enforcement without custody is detection plus consequence, and it is public.

Further tools, each opt-in per charter:

- anchor the audit trail with OpenTimestamps (the fleet already has origin proofs);
- publish decisions to Nostr, for a record no host can silently rewrite;
- AI auditors (§2.5).

### 2.4 Participation without Bitcoin: assurance levels

**Solon's promise is a vote anyone can recount, not a vote signed with Bitcoin.**
Today the two are welded together. `members.bitcoin_address` is `NOT NULL`, and
every proposal and vote needs a BIP-137 signature pasted in from Sparrow or
Electrum. That makes owning a self-custody Bitcoin wallet the price of a seat.
Almost every group of people who need governance (an association, a house, a
club, a parent council) would be excluded on day one. Bitcoin should be one way
to sign, not the door.

The fix is to separate **who you are** (the seat) from **how you sign** (the
credential), and let the charter set the **minimum assurance per category**:

| Level | How a member signs | What a recount proves | Needs |
|---|---|---|---|
| **A: Account** (the default — decided 2026-09-24: "as easy to use as possible") | Signed in with OrangeCat, one click (later also an emailed one-time ballot link for invited members). Nothing is signed | That Solon recorded this ballot for this seat. It proves the operator's word, not the member's — and the record says so | an email address |
| **B: Passkey** | Face ID / fingerprint / device PIN (WebAuthn). The device signs the ballot hash as the challenge | That **the member's own device** signed exactly this ballot. Anyone holding the published public key can re-verify it; no operator trust | a phone or laptop made in the last ~5 years |
| **C: Own key** | Nostr (NIP-07 extension, one click) or Bitcoin message signing (today's path) | Same as B, with a key the member holds independently of any device vendor or Solon | a key the member manages |

**Ease wins by default; strength is opt-in.** Every act starts at level A, one
click, labelled `proof: ACCOUNT` on the record. Passkeys are the natural next
step up: they give ordinary people **cryptographic, recountable votes with no
blockchain, no wallet and no seed phrase**. A group that wants more raises its
own bar by vote, per category (the charter's minimum assurance, §2.1).

**Shipped (level A + C, 2026-09-24):** `members.bitcoin_address` is optional,
every proposal and vote carries `proof` (`ACCOUNT` | `BIP137`), every form leads
with one button and folds Bitcoin signing underneath, and the decision
document labels each act. Passkeys (B), Nostr and per-category minimums are
next.

The data model for B and beyond:

- `members.bitcoin_address` becomes one row in a `member_credentials` table
  (`scheme: account | webauthn | nostr | bip137`, public key, enrolled-at).
- Enrolling a credential is itself an audited `member.credential` event, so a
  key cannot appear silently.
- Every ballot records its `scheme`.
- The decision document carries whatever each scheme needs to re-verify it: for
  WebAuthn, the `authenticatorData` and `clientDataJSON`.
- The verifier (§3 `solon-verify`) handles all four schemes.

OrangeCat's `decision-verify.ts` handles BIP-137 only today, so it must move to
that package rather than grow a second implementation.

The Cat and Loki keep their Bitcoin keys. Nothing that works today is removed.

Admission follows the charter (§2.1), and one seat per identity is already
enforced. Sybil resistance comes from sponsorship or a vote, never from a KYC
gate or a hardware requirement. This is consistent with the no-auth-friction
standing rule: fix the exposure, do not add steps.

### 2.5 Deliberation, and AI agents in defined roles

A vote without a debate is a poll. Each proposal gets a discussion thread built
on **threadkit** (fleet package; OrangeCat already uses it; "permission is
participation", so members read and outsiders read-only per charter). It also
gets **amendments**, i.e. forks of a draft that are voted first.

AI agents take **offices with published mandates, never sovereignty**:

| Role | Does | Never |
|---|---|---|
| **Clerk** | turns a plain-language request into a typed motion; checks it against the charter and existing policies; drafts the minutes | files on its own authority |
| **Advocate pair** | writes the strongest case for and against each proposal, cited | votes |
| **Auditor** | watches treasury and receipts; files SAFETY motions on unmandated outflows or failed executions | acts on what it finds |
| **Delegate** | votes for a member under instructions the member published, revocable, only where the charter allows delegation, **never** in humans-only categories | is counted as a human |

Models come from `@bitbaum/ai-kit`'s free chain (never a paid Anthropic key).
The Cat and Loki are already members that vote in the categories open to agents.

## 3. Consolidation: one legislature, not two

OrangeCat carries a **second governance system**: `groups`, `group_proposals`,
`group_votes`, presets whose `vote_required` flag was never enforced, and a
`spend_funds` handler that stubs out to `pending_manual_execution`. Its own
comment says real deliberation is Solon's job. Two legislatures is Ground Truth
#2 violated, and the weaker one is the more-used one.

The target:

- An OrangeCat group **is** a Solon org (joined by actor id, like a Loki project
  is joined by grant).
- OrangeCat's group UI reads proposals from Solon and votes through Solon.
- OrangeCat's execution handlers (`associate_entity`, `create_project`,
  `spend_funds`, `create_contract`) become **the OrangeCat executor** of Solon
  mandates.

The native tables are migrated, then dropped.

The signing and verification code has also been ported three times (Solon,
`orangecat/src/services/solon/bitcoin-message.ts`,
`loki/src/lib/integrations/solon-message.ts`), with vectors pinned by hand. The
fix is one package, `@bitbaum/solon-verify`. It would verify a decision document
and a mandate, be used by all three and by anyone outside, and it doubles as the
"recount it yourself" CLI. It needs George's OK, since a package may mean a repo.

## 4. "Hire Solon": governance as a service for any group

Any group of people can adopt Solon. The product is **its software plus its
agents (clerk, auditor) plus human facilitators**. Human facilitation is
dispatched through Loki Crew as `human_tasks`, and it is paid through an
OrangeCat pay link.

**Wedge: the Swiss Verein.** Switzerland has on the order of 100k associations.
All of them must hold a Generalversammlung, keep a member list, pass a budget,
and minute their resolutions. Solon can:

- import existing **Statuten**, with the Clerk drafting a charter from them (a
  human must confirm every clause);
- run the GV, with signed votes and minutes (Protokoll) generated from the record;
- keep a watch-only treasury the Revisor can open.

Whether electronic votes satisfy a given association's Statuten and the ZGB
(Art. 66) needs a legal check before anyone is told it does. Adjacent wedges,
each a charter template: co-living houses, Stockwerkeigentümergemeinschaften,
cooperatives, open-source projects (the fleet itself, below), parent councils.

In public copy these are **pilots**, never "clients".

## 5. Dogfood: the fleet is governed by Solon first

Credibility comes from running on it. Rules that could be Solon policies read at
runtime:

- `allocation_policy` (live, but never yet changed by a vote)
- `originator_share` (seeded by migration; ratify it by vote)
- Loki's AI fair-share budget (`ai-budget/fair-share.ts`)
- the auto-merge policy for outside PRs (fleet#97)
- which repos may deploy on merge

Every one of these today is a constant someone edited. Each becomes a policy
with a decision behind it.

## 6. Federation and exit (the Townsism part)

- **Orgs as members:** `member_type: ORG`. A federation's vote from a member org
  is itself a decision of that org, verifiable end to end.
- **Exit as a feature:** a member leaves with their key and their signed record.
  An org can **export its entire history** (charter versions, decisions,
  signatures) and fork it onto another Solon instance, which re-verifies all of
  it. A community that cannot leave its governance host is not self-governing.
  Solon must be self-hostable to mean what it says.

## 7. Build order

Each step is shippable on its own and leaves the record more honest than before.

**Phase 0: make the current claims true (days)**
1. ✅ Decouple the seat from Bitcoin: one-click ACCOUNT acts (§2.4). This also
   unblocks org #1 — George can claim the founding human seat with one click
   at /join. Humans-only categories have been dead until a human seat exists.
2. ✅ Vote changes: a second ballot replaces the first until close, and the
   weight is re-read at the change. README fixed to match.
3. One source for thresholds. The ratification check watches
   `governance-profiles.ts` too.
4. Ratify `originator_share` v1 and `claimed_project` by vote, so no rule stands
   without a decision.
5. Copy: the homepage says "Bitcoin-Native Governance". Lead with verifiable
   governance for any group, and keep Bitcoin as one option among the signers.
6. Stale e2e headings; AGENTS/README i18n contradiction; react/react-dom mismatch.

**Phase 1: Charter + internal effects**
- `charters` table (versioned), with profiles as templates and a migration from
  the TS config.
- The effects registry, with internal executors for `charter.amend`,
  `member.admit/suspend`, `office.*`, `treasury.watch`.
- Per-org UI everywhere (retire `primaryOrg()` from pages).

**Phase 2: Mandates + receipts**
- Mandate documents and a receipt endpoint; decision lifecycle on every decision
  page.
- Loki executor: `decision.finalized` → re-verify → `actions` row (mode 2) or
  dispatch (mode 3).
- OrangeCat executor: `treasury.spend`, `budget.allocate`, more policy keys.
- Unmandated-outflow detection on watched treasuries → SAFETY motion.

**Phase 3: Usable membership and deliberation**
- Admission by vote (`member.admit`), so a signed-in visitor can ask to join
  and the members decide — the next biggest ease win after one-click voting.
- Emailed ballot links; passkey and Nostr signers; per-category minimum
  assurance in the charter.
- Bank-statement import (camt.053) as a treasury ledger.
- threadkit discussions and amendments.
- AI Clerk, then the Advocate pair.

**Phase 4: Consolidate and open up**
- OrangeCat groups become Solon orgs; native group governance retires.
- `@bitbaum/solon-verify`.
- Verein template + Protokoll; first pilot association.

**Phase 5: Federation and exit**
- ORG members, export/fork, OpenTimestamps anchoring, Nostr publication,
  multisig PSBT flow.

## 8. Decisions that are George's

1. ~~Default assurance level~~ — **decided 2026-09-24:** "make it as easy to
   use as possible". Account (A) is the default everywhere; stronger proof is
   opt-in per member now and per category once charters exist.
2. ~~Account-level votes at all~~ — **decided, same day:** yes, honestly
   labelled `proof: ACCOUNT` on every record.
3. **Is a mandate an approval?** Loki's iron rule is "no auto-approve, no
   bypass". Does a verified community decision count as the approval
   (enforcement mode 3), or does it always land as a draft for an officer
   (mode 2)?
4. **Retire OrangeCat's native group governance** in favour of Solon (§3)?
5. **`@bitbaum/solon-verify`.** New package, possibly a new repo; this file does
   not create one.
6. **First pilot.** A Swiss Verein, a co-living house, or the fleet itself only
   until Phase 2 lands?
7. **Name.** Deyville (`~/ideas/deyville-platform.md`) stays parked until a town
   runs on it. The design above does not depend on the name.
