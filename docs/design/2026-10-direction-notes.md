# Where Solon and Causius are going: notes from 2026-10-22

_Notes, 2026-10-22, taken from George's brief the same day. Status: direction,
not design. Nothing here is built unless it says so. The designs it points to
are `2026-09-places-and-jurisdictions.md` (what exists and what can be
founded), `2026-09-solon-constitution-engine.md` (how a group decides) and
`2026-10-law-as-data.md` (the law itself). The order of work is in
`ROADMAP.md`; this file is the reasoning, so that the reasoning is not lost
when the checklist is._

## 1. What each product is

| Product | One line | Where it lives |
|---|---|---|
| **Solon** | The way a group governs itself: it legislates, decides, hires, and keeps the record. Law is data here. | this repository |
| **Causius** | The lawyer: an agent that does legal work on a sealed case file. It does not hold law; it reads it. | `bitbaum/causius` |
| **OrangeCat** | Money and entities that can hold it; carries out what Solon decides. | `bitbaum/orangecat` |
| **Loki** | Work: carries out what Solon decides that needs building or running. | `bitbaum/loki` |

Solon is not a lawyer. Causius is the lawyer, and it reads the law from Solon.
Until Solon holds it, Causius reads the official publishers directly (Fedlex,
gesetze.li, each canton's collection through LexFind), which is also how it
will later check what Solon holds.

## 2. The ideas, one by one

**Governance is not only the state's.** A company, an association, a network
state, a charter city and a town all govern. Solon should treat them as the same
kind of thing at different sizes: a group with rules, decisions and a record.
`jurisdictions` with `origin = state | founded | proposed` already says so
(Places §4.1); the missing piece is one list of the kinds of group and what each
must declare (see `ROADMAP.md`, "One list of the kinds of group").

**Founding a place is permissionless.** Switzerland, the canton of Zürich and
the city of Zürich are jurisdictions that exist. Witikon, a quarter of the
city, is not a tax authority, and need not be one to act as one: anyone can
found it as a place with a common fund. People give; the group decides; the
money is spent in the open, the way a commune's budget is. The point is not the
money. It is that a group that has a budget finds out it can govern itself, and
that it can see what Zollikon or Küsnacht do with theirs and do better or
differently. This is Places §0, which names Witikon. What is missing is the
fund (it lives in OrangeCat, which carries out decisions) and the budget as
something the group votes.

**Execution is contracts, not a state apparatus.** A town can hire a private
company to manage it, which hires companies for waste, security, sanitation.
Each is a contract with success measures; the group pays for results and can
replace a contractor that fails. That makes "government" a set of mandates the
governed can revoke. In Solon's terms: a decision that creates a **mandate**
(who, to do what, paid how, judged by which measures, until when), with
**receipts** coming back to the record. `ROADMAP.md` has "Mandates and
receipts"; the contract, its measures and its replacement by vote are not in it
yet and are now.

**Scale is the argument.** Los Angeles is one city; New York's five boroughs
are each larger than most American cities, and they are not cities. When a
unit grows past the point where its people can see what it does with their
money, its decisions stop being theirs. Smaller units that can be compared with
each other (FOCJ: functional, overlapping, competing jurisdictions, Frey and
Eichenberger) are the remedy, and Places exists to make the comparison possible.

**The aim.** Make it easy and pleasant for people to cooperate voluntarily
without being ruled by anyone who has not been chosen and cannot be replaced.
Technology that makes humanity harder to govern against its will. Built in
public, open source, so that anyone can start their own Solon or their own
Causius; that is what makes it hard to stop.

## 3. The law lives in Solon

The law of every authority is data, versioned, with the official text as
source. Not summaries, not rewrites: the text as published, who enacted it, from
when to when it was in force, where it applies. Causius reads it from there.

The target is stated once: **every law and every regulation on the books of
every authority in Switzerland and Liechtenstein**, federal, cantonal and
communal. Tax legislation was added first (Places §6: the tax model is a
declarative model with its sources); that is a model of one law, not the law.
The measured size, the sources, the licences and the order of work are in
`2026-10-law-as-data.md`. It is the first thing to finish.

## 4. Causius, in three levels

1. **An agent.** Works today. It researches, records deadlines, drafts, and
   proposes; it never sends or files. It is legal information, not advice, and
   never represents anyone before an authority.
2. **A pseudonymous legal assistant.** A person, under a pseudonym, who reviews
   and advises where the law allows an assistant to. Built as a helper tier.
3. **A licensed attorney**, who may also be pseudonymous. The public sees a
   signed attestation that a reviewer checked their admission against the
   official register, and nothing else unless they choose. This is selective
   disclosure. It is **not** yet a zero-knowledge proof: that needs credentials a
   bar issues itself, and none does. The record must not say otherwise.

Causius does not replace lawyers where the law reserves a step to them
(representation before a court, notarial acts). It replaces the part of legal
work that is reading, finding, comparing and drafting, and it should be honest
about the boundary every time.

## 5. Where each idea sits

| Idea | State today | Where it goes |
|---|---|---|
| Places: official and founded jurisdictions | built (communes, tax model, founding an organization) | Places design |
| Liechtenstein as a place | built 2026-10-22: communes, regions, postcodes | Places design §8.2 |
| One list of the kinds of group | not built | `ROADMAP.md` |
| A founded place with a common fund | not built (the fund is OrangeCat's) | `ROADMAP.md` |
| Budget voted by the group | not built | `ROADMAP.md` |
| Mandates with success measures, replaceable by vote | not built; mandates and receipts are planned | `ROADMAP.md` |
| Law as data, Switzerland and Liechtenstein | not built; Causius reads publishers directly | `2026-10-law-as-data.md` |
| Causius reads law from Solon | not built | Causius `ROADMAP.md` |
| Three levels of legal help | level 1 works, level 2 and 3 are built as helpers and attestations | Causius `ROADMAP.md` |
| A bar-issued credential, a true zero-knowledge proof | not built, depends on a bar | Causius `ROADMAP.md` |

## 6. Open questions that are George's

1. **Money of a founded place.** Solon's treasury is watch-only by design: no
   code path can spend. A common fund therefore lives in OrangeCat (an entity
   that can hold a wallet) and Solon's decision is evidence that an executor
   re-verifies before it moves anything. Confirm that this is the shape.
2. **What a contractor is judged by.** A mandate's success measures: who
   defines them, who measures them, who may dispute a measurement. These are
   rules of a group, so they are charter data, not code.
3. **Communal law.** About 2,100 municipalities each have regulations, mostly
   not in any shared collection. Include them in "every law" and take each
   commune's own publication, one source at a time, or stop at the cantons.
4. **Licence of LexFind's compilation.** The acts are official texts and not
   protected (URG Art. 5, in Switzerland and in Liechtenstein). Its index and
   its text extraction are a service; read its terms before importing from it
   in bulk, or take each canton's own publication instead.
5. **Wording in public.** Posts name structures and incentives, not parties or
   persons. Say if that should change.
