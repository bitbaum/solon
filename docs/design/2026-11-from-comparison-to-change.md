# From comparison to change: Solon where the law is contested

_Design, 2026-11-10. Status: a plan, with what is built marked **[built]**.
Follows `2026-11-contested-law.md` (the comparison page) and rests on
`2026-11-amending-the-law.md` (proposals against the exact text),
`2026-11-freedom-framework.md` (rules, practice, results; no labels) and
`2026-11-global-law-and-exit.md` (exit, the record). It does not repeat them._

## 1. What the owner asked for

From the conversation of 2026-11-10, in substance:

- Take South Ossetia. Compare three things: the laws and regulations in force
  now; what they would be under Georgia, whose trade and tax law the owner
  considers good; and what they could be. Without politics or speculation.
- What could be has to be honest about money. If most of the budget comes as
  subsidy from Russia, a South Ossetia without that subsidy could not keep the
  same law; it would need other revenue, other taxes or other rules.
- People must be able to propose those changes themselves.
- The aim is that people start using Solon, and that this brings democracy:
  they argue, in public and with evidence, "we want this change of the law",
  instead of relying only on the existing processes. A government that wants
  to be authoritarian would have to ban it. The same holds in Russia.
- Zoom out over all the code and all the ideas, and turn them into a product
  that actually works.

## 2. What the sources already say (read 2026-11-10)

Every figure here is on `/places/contested/south-ossetia`, quoted and linked.

| | South Ossetia (its own law) | Georgia |
|---|---|---|
| Tax on a person's income | 12% (Tax Code, Part Two, Art. 228) | 20% flat (PwC summary) |
| Tax on a company's profit | 20% (Art. 286) | 15% flat, owed only when profit is distributed (PwC summary) |
| Value-added tax | 10% (Art. 166 para. 3) | 18% (PwC summary) |
| Who may propose a law | President, deputies, Government, the high courts, the Prosecutor General, the electoral commission; **not citizens** (Constitution, Art. 69) | Government, any member of Parliament, factions, committees, the two autonomous republics' bodies, and **25,000 voters** (Constitution, Art. 45) |
| The 2023 budget | revenue 9.108 bn roubles, spending 9.234 bn; **81.1% of revenue was financial aid from the Russian Federation**; own revenue covered **18.5%** of spending (law on the 2023 budget's execution, Art. 1 and Appendix 1) | not read yet |

Two things follow, and both are exactly the kind of thing the page exists to
show:

1. **The simple story is wrong in both directions.** South Ossetia's headline
   rates are *lower* than Georgia's on income and on sales, higher on profit.
   What sustains low rates is the transfer, not the economy. Georgia's are
   higher, and its profit tax rewards keeping money in the business.
2. **The trade-off is arithmetic, and a resident can do it.** To spend the
   same from its own revenue alone, South Ossetia's own revenue would have had
   to be about 5.4 times what it was in 2023, or spending would have had to
   fall by about 81%, or some mix. That is not a forecast: what an economy
   raises depends on its rules, which is the whole point of proposing better
   ones. But it is the honest starting line, read from the authority's own law.

## 3. The three columns, defined so that nothing is speculation

| Column | What it is | What it is not |
|---|---|---|
| **Now** | the law in force where the place is governed, as its publisher prints it, with the budget law's own figures | a description in Solon's words |
| **The other side** | the claimant's law as it stands for its own territory, quoted the same way | a prediction of what the claimant would enact for the place: Georgia's constitution itself defers the territorial arrangement "until the complete restoration of jurisdiction" (Art. 7), so nobody can read that law today |
| **Could be** | proposals people file against the exact text of either side's law, each with a redline, its supporters counted per electorate, and, for anything touching money, its static arithmetic against the budget (`2026-11-budgets.md`) | Solon's recommendation; Solon never writes one |

The third column is what turns a comparison into a market for rules: anyone
can publish an offer ("the profit tax as in Georgia, the income tax as now,
and this is what it does to own revenue at 2023 figures"), anyone can support
it, and the support is visible next to the offer it backs.

## 4. The loop, as a system

Solon works when one loop runs end to end for a place: **read, compare,
propose, support, hand over, record, measure**. Most of it exists. The work
is to close the gaps for one place at a time, starting with South Ossetia,
where one end of the loop (a single deputy can introduce a bill) is short.

| Step | What exists | The gap for South Ossetia | Next |
|---|---|---|---|
| **Read** | The register reads the Parliament and the President (`src/lib/law/text/so-text.ts`); the Constitution is held article by article. | The codes (tax, civil, procedure) are published as Word files the page links ("Текст кодекса скачать тут"); Solon holds only that page, so their articles cannot be proposed against. Georgia's law is not held: matsne.gov.ge refuses automated readers. | Read linked `.doc`/`.docx` files into articles (LibreOffice on the box, as the PDF path uses OCR); Georgia through dated archive copies read from the box. |
| **Compare** | `/places/contested/<slug>` **[built]**: six questions, both sides quoted, the budget ledger and its arithmetic. Rubrics for compulsion and exit (`src/lib/config/statistics/rubrics.ts`). | Rubrics not coded for either side; one year of budget. | Code the five rubrics for both sides with a second reader; every budget-execution law the Parliament publishes, so the ledger is a series. |
| **Propose** | The amendment engine (`src/lib/law/amend/`): replace, insert, repeal against hashed provisions, a computed redline, forks; the contest page links "propose a change to this article" for every held provision **[built]**. | Nothing to propose against in the codes until Read is fixed. A proposal does not yet carry its arithmetic. | A tax proposal states its rate change; the page computes its static effect on own revenue from the ledger and the tax's own line in the budget, labelled static. |
| **Support** | One click with an account, or a BIP-137 signature; accounts and keys counted apart; a hash-chained public log. | See §5: the log names the account behind every act. Nobody's electorate is known. | Counted-not-listed support and per-proposal pseudonyms (§5); declared electorates counted apart (§6). |
| **Hand over** | Official routes as sourced data (`src/lib/config/law/routes.ts`); South Ossetia's route is now there **[built]**: a bill reaches Parliament through any one deputy (Art. 69). | No list of deputies; no hand-over. | The deputies as people with public roles (the Parliament's own "Депутатский корпус" page, sourced); "ask a deputy to introduce this": a package with the redline, the count per electorate and the log hash, sent to the deputies who choose to receive them; a deputy's answer recorded on the proposal. |
| **Record** | Append-only events, hash chain, verifiable by anyone. | Not anchored. | `ROADMAP.md#proof-anchor` (OpenTimestamps), so "this many people asked for this, by this day" cannot be rewritten by anyone, Solon included. |
| **Measure** | Statistics with sources, sanity checks and AI explanations restricted to the page's facts. | Results per side are one budget. | Each side's statistics office's own series beside the texts; the Places atlas showing contested places hatched. |

## 5. Where Solon is not wanted: the people come first

The owner expects Solon to be banned where governments do not want this. The
first consequence is not technical: **a person who supports a proposal in such
a place takes a risk Solon must not increase.** The plumbing today was built
for Switzerland, and one finding matters:

- The public amendment log (`/api/v1/law/amendments/log`) carries
  `author: "actor:<uuid>"` on every filing, and supports carry the supporter's
  reference the same way. A stable identifier across every act a person takes
  is a gift to anyone who later learns, by compulsion or breach, which account
  is whose.

What the design requires before Solon is promoted anywhere it is unwelcome:

1. **Count without listing.** A place's configuration can say that support is
   published as counts only. The log keeps a commitment per support (a salted
   hash the supporter can use to prove their own row) instead of the account.
2. **A new pseudonym per proposal.** A key derived per proposal, so two
   supports by one person cannot be linked by anyone but them.
3. **No account needed, no email asked.** Support by a key made in the
   browser; the account stays optional.
4. **Nothing kept that could identify a reader.** In the app's own code,
   addresses are read only to rate-limit the assistants
   (`allowAssistantRequest`); what the web server in front of it logs is
   outside this repository and has to be checked and set to keep nothing that
   identifies a reader. No third-party scripts, and a page that says exactly
   what is kept.
5. **Reachable when blocked.** The law and the record are public data: static
   mirrors (a signed export the fleet can host anywhere), an onion address, and
   a Telegram bot through `@bitbaum/chatkit`, since that is where people in
   both South Ossetia and Russia already read.
6. **The local law, stated.** Every place shows what its own law says about
   petitions, assemblies and collecting signatures, sourced, so a person knows
   the risk of each step. Solon never encourages breaking it.
7. **No money.** Sanctions lists are checked before any OrangeCat flow (places
   design §7.3); Solon itself holds none.

A ban is also a fact. Where it happens, it is recorded like any other, with
its source, on the place's page.

## 6. Why a count can matter: credibility by electorate

A number of supporters persuades only if a reader can see whose support it
is. Solon cannot verify residency or citizenship without identity documents,
and in these places it must not collect them. So the count is **split, never
summed**:

- **declared**: the supporter says which electorates they belong to (resident,
  citizen of one side, citizen of the other, displaced);
- **vouched**: declared, and vouched for by others who themselves declared
  the same (a web of trust; how much a voucher can vouch is limited);
- **attested**: a local organisation the place's page names signs a blind
  token that says "one resident", without learning which proposal it is used
  on.

A proposal's page shows each tier for each electorate. "4,000 residents
declared, 600 vouched" means something a deputy can weigh; "4,600" does not.

## 7. How this brings democracy without claiming any authority

Solon does not replace an election, a parliament or a referendum, and it says
so on every count. What it changes:

- **Common knowledge.** Everyone can see the same law, the same budget, the
  same proposals and the same counts, and can check them. Many systems hold
  together because each person does not know how many others want the same
  change.
- **A shorter path from wanting to proposing.** A resident can write the
  change they want against the exact article in the time it takes to complain
  about it.
- **Something a legislator can act on.** In South Ossetia one deputy can
  introduce a bill. A ready redline with a visible count behind it costs that
  deputy nothing to pick up and is hard to explain away.
- **Competition between offers.** When several proposals answer the same
  question, the counts show which one people back, on both sides of a line.

The same machinery works in Russia, in Georgia, or in Switzerland. Each place
needs its register read and its official route sourced; nothing in the code
names a country.

## 8. Build order

Each item is one pull request, in this order, because each makes the next
useful:

1. **[built]** The comparison with the budget ledger, six questions, South
   Ossetia's official route, "propose a change" on every held provision.
2. **Codes as articles**: the Parliament's linked Word files read into
   provisions, so the Tax Code can be amended article by article.
3. **Safe support**: count-only publication per place, per-proposal keys,
   commitments in the log, the "what we keep" page (§5.1–5.4). Before any
   outreach.
4. **The money of a proposal**: a tax-rate change computed statically against
   the ledger; every budget-execution law as a series.
5. **Deputies and the hand-over**: the deputies from the Parliament's page,
   the package, the recorded answer.
6. **Electorates**: declared and vouched counts (§6); attestation later, with
   a named partner.
7. **Georgia's register** through archive copies; the rubrics coded for both.
8. **Reach**: the Telegram bot, the static mirror, Russian first on every page
   of a Russian-speaking place.
9. **Russia** and the other claimed places: registers and routes, no new code.

## 9. How we will know it works

Counted from the data, shown on `/places/contested/south-ossetia`:
articles held per side; questions compared; proposals filed against each
side's law; supporters per electorate and tier; proposals handed to a deputy;
deputies' answers; and, the one that matters, acts that changed after a
proposal asked for the change, each linked to both.

## 10. Risks

- **Harm to supporters.** The largest risk; §5 comes before outreach.
- **Astroturf and manipulation**, by states or campaigns. Counts by tier, keys
  per proposal, rate limits, and the record anyone can check; a sudden surge is
  shown as one.
- **Being seen as taking a side.** Everything is quotation and arithmetic;
  the neutral-copy test covers Solon's words; both sides have the same shape.
- **False precision.** The arithmetic is static and says so; a proposal's
  effect on people is the author's claim, labelled as theirs.
