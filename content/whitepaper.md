---
title: Solon whitepaper
summary: How a group decides on Solon, how every decision can be recounted by anyone, and where the design goes next.
date: 2026-09-30
version: 0.1
---

## Abstract

Solon is a governance system for groups of people and the AI agents that work with them. A group records who its members are, what they propose, how they vote and what they hold. Every decision is published as a self-contained document that anyone can recount without trusting the operator. Rules are frozen when a vote opens, the record is append-only, some categories of decision are reserved for humans, and Solon never holds a group's money or keys. A decision is evidence, not authority: whatever carries it out re-verifies it first.

This paper describes what is running today at [solon.orangecat.ch](https://solon.orangecat.ch) and marks clearly what is designed but not built.

## The problem

Groups decide constantly: associations, co-ops, companies, villages, online communities. The usual tools split the act of deciding across a chat, a poll, a spreadsheet and somebody's memory. Three things get lost:

- **Who was entitled to decide.** A poll counts whoever clicked; nobody snapshotted the membership.
- **Under which rule.** The threshold is remembered after the fact, often by the side that won.
- **Whether the count is right.** The only proof is the word of whoever ran the poll.

AI agents make this sharper. Once agents spend money and take actions for a group, "who decided this, and was it theirs to decide" has to be answerable by a machine and by a sceptical human, from the record alone.

## The model

**Organization.** A group with a roster, a governance profile and a record. Anyone with an OrangeCat account can found one; the founder takes the first seat in the same transaction, so the seat can never be claimed by anyone else. Everything after founding goes through votes.

**Member.** A seat on the roster, held by a person or by an AI agent, with a voting weight (1 by default). A person signs in with OrangeCat (OpenID Connect; the stable subject is the OrangeCat actor id, never an email). A member may also register a Bitcoin address to sign with.

**Category.** Every proposal has one of seven categories. The category fixes who may vote and the bar a vote must clear:

| Category | Who votes | Quorum | Threshold |
|---|---|---|---|
| How money is shared (`ALLOCATION_POLICY`) | all members | 50% | simple majority |
| Spending money (`TREASURY_SPEND`) | all members | 50% | simple majority |
| Day-to-day running (`OPERATIONS`) | all members | 30% | simple majority |
| Help for a person (`AID_DISBURSEMENT`) | humans only | 50% | simple majority |
| Who is a member (`MEMBERSHIP`) | humans only | 50% | two thirds |
| Safety (`SAFETY`) | humans only | 50% | two thirds |
| The rules (`GOVERNANCE_RULES`) | humans only | 60% | two thirds |

**Governance profile.** Who within the electorate decides each category: one person, every member, or elected delegates holding a mandate for a term, plus templates for associations, co-operatives, collectives and company boards. A profile never widens the electorate: a humans-only category stays humans-only whoever holds a mandate. When a delegate's term lapses, their categories return to the members until someone is elected again, so an organization cannot stall. Changing the profile is itself a `GOVERNANCE_RULES` decision.

## The life of a decision

1. **Proposal.** A member files a proposal: category, title, body, optionally a counting method and options, and optionally a typed effect. It is saved as a draft and written to the record.
2. **Opening.** Anyone may open a draft; opening only starts the clock. At that moment the session snapshots its rules: the electorate, who within it decides (all members or mandate holders), the threshold, the quorum, the method, the options and the eligible weight. The window is seven days. A later change to the rules cannot reach back into an open or closed session.
3. **Ballots.** One ballot per seat. A member can replace their ballot until the session closes; the last one counts. Each ballot records how it was proven (below).
4. **Closing.** Quorum is tested first, on the weight that cast any ballot against the eligible weight. Below quorum the session is `EXPIRED`: no decision. Above it, a yes/no-type method measures its threshold over the weight that took a side (abstentions count for quorum, not for the result): simple majority is for > against; supermajority is for ≥ ⅔ of for + against. Consent is rejected by a single objection. Ranking methods have no against-side: once quorum is met, the top option wins.
5. **Effects.** An approved decision applies its internal effects in the same transaction that closes it: activating a new policy version, granting or ending a mandate, switching the governance profile.
6. **The decision document.** The closed session is published at `/api/v1/decisions/{sessionId}`: the proposal, the frozen rules, the electorate snapshot, every ballot with its proof, the aggregate and the outcome.

Six counting methods are available: yes/no, consent, approval, dot allocation, score and ranked (Borda, with the Condorcet winner marked when it differs). [Voting methods](/governance/methods) explains when each fits.

## Recounting without trust

**Proof levels.** Every proposal and ballot carries `proof`:

- `ACCOUNT`: a signed-in member pressed the button. The record proves that Solon recorded this ballot for this seat. It rests on the operator's word, and the document says so.
- `BIP137`: the member signed the canonical text of their ballot with their own Bitcoin key (Sparrow, Electrum, Bitcoin Core `signmessage`). Anyone can verify the signature against the member's registered address without trusting Solon.

The message a member signs is built by the same canonicalisation the server verifies against, so "sign exactly this" is a guarantee. One click is the default because a seat should not cost a self-custody wallet; stronger proof is opt-in.

**Append-only record.** Every governance event (organization created, member added, proposal filed, session opened, vote cast, session closed, policy activated, mandate changed, profile changed) is a row that no code path updates or deletes, readable per organization at `/api/orgs/{slug}/audit`.

**Humans-only red lines.** Help for a person, membership, safety and the rules are decided by humans only. This is a platform guarantee, not an organization setting.

## Evidence, not authority

Solon does not carry out decisions on other systems by command. It publishes them. The system that acts re-verifies the decision document against its own pinned keys before acting: signatures, electorate and tally. OrangeCat already does this for the allocation policy that bounds what its agent may spend. An executor that is handed a forged or mis-counted decision refuses it, whatever Solon's server says.

The same principle shapes the treasury. Solon registers a group's Bitcoin addresses watch-only and looks up balances live on a public explorer when the page is opened. It stores no ledger it could invent and holds no key it could lose. Adding a wallet is itself a decision.

## What is built, and what is next

| | Status |
|---|---|
| Organizations, rosters, profiles, founding seat | built |
| Proposals, sessions, six methods, frozen rules | built |
| One-click ballots (`ACCOUNT`) and Bitcoin-signed ballots (`BIP137`) | built |
| Decision documents, append-only record, public API | built |
| Effects: policy versions, mandates, profile changes | built |
| Watch-only Bitcoin treasury | built |
| Admitting and suspending members by vote, applied automatically | designed |
| Passkeys (device-signed ballots, no wallet) and Nostr signing | designed |
| A versioned charter per organization, amended by its own rules | designed |
| Mandates and receipts for external executors (OrangeCat, Loki) | designed |
| Bank accounts as a checked ledger; keyholder multisig without custody | designed |
| Deliberation threads, amendments, advisory votes, AI clerks and auditors | designed |

The [roadmap](/roadmap) tracks the order; the [changelog](/changelog) records what shipped.

## Open by default

Everything on the record is readable without an account, as pages and as JSON. The [API](/integration) documents the routes. The code is open source. The questions most people ask first are answered in [Questions and answers](/faq).
