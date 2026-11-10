# Budgets: what governments raise and what they spend it on

_Design, 2026-11-10. Status: P1 is built (marked **[built]**); the rest is the plan.
Follows `2026-11-contested-law.md` (where a budget first appeared, as South
Ossetia's ledger) and `2026-11-from-comparison-to-change.md` (why a resident
needs the money beside the law). Rests on the Places facts pipeline
(`2026-09-places-and-jurisdictions.md` §4.6, §8.3) and the freedom framework's
rule that every number says what it covers (`2026-11-freedom-framework.md` §8)._

## 1. What the owner asked for

From the conversation of 2026-11-10, in substance:

- Budgets are a product of Solon in their own right: track the budgets of
  countries and other entities, for transparency. The more governance Solon
  holds, the better, and budgets are central to it.
- Not a page made for South Ossetia: every page and every analysis must work
  for any place, from one model. Modular, reusable, scalable; one source of
  truth, separated concerns, no copied code.
- Robust analysis: what the money is used for, in detail. Government is large,
  but its budget can be made far simpler to read than it is.
- People must be able to propose changes, under any regime.

## 2. The product in one paragraph

For any place Solon holds a budget for: what came in and from where, what it
was spent on down to the group (old-age pensions within social protection,
hospitals within health), whether it balanced, and how all of it moved over
the years; who pays for it when part of it is received from elsewhere; every
figure linked to the law or the statistics office it was read from; and a way
to propose a change. Every budget sits on the same two international
classifications, so any two can be compared, a state budget read from a law
in roubles beside a general government read from Eurostat in shares of GDP.

## 3. The model **[built]**

```
config (SSOT)                         domain (pure)                 pages
src/lib/config/budgets/               src/lib/budgets/              src/components/budgets/
  cofog.ts      COFOG, 80 codes  ──┐   taxonomy.ts  tree, checks     budget-page, -index,
  revenue.ts    ESA 2010 revenue ──┤   scopes.ts    metric keys      -breakdown, -history,
  scopes.ts     gg, state        ──┤   model.ts     Budget           -self-reliance,
  eurostat.ts   requests, geos   ──┼─▶ documents.ts law → Budget     -sources, -link-card,
  metrics.ts    generated        ──┤   read.ts      facts → Budget   figure-tiles
  documents/    budget laws      ──┘   analysis.ts  breakdown, …
                                       page.ts      sections, rows
```

- **Two taxonomies, one per side.** What money is spent on: the United Nations'
  Classification of the Functions of Government (COFOG), its ten divisions and
  their groups, with Eurostat's labels. Where it comes from: the European System
  of Accounts (ESA 2010) revenue items, whose divisions add up to total revenue
  in the accounts' own identity. Each is a checked tree (one root, known parents,
  no cycle) in config.
- **Scope is part of the key.** Every figure says which government it covers:
  `gg` (general government: every level, consolidated) or `state` (the budget a
  legislature adopts for the central government). Metric keys are
  `budget.<scope>.<side>.<code>`; the comparison of a state budget with a
  general government is the most common wrong comparison, and the key makes it
  impossible to make by accident.
- **One `Budget` shape, two ways in.**
  - *Imported series* become facts through the Places pipeline: the
    `eurostat_json` adapter (a JSON-stat reader that knows no country and no
    budget), one source per country generated from `EUROSTAT_GOV_COUNTRIES`,
    licence gate, snapshots, idempotent runs, plausibility bands, the monthly
    scheduler. `read.ts` turns a holder's facts into budgets.
  - *Budget laws* are documents in config: the publisher's own lines, in its
    words and amounts, each placed on a category (or said to fit none), the
    totals the law states and the pages read. `documents.ts` refuses a document
    whose lines do not reach its stated totals.
- **Generated, never listed twice.** The taxonomies generate the metrics, the
  metrics' requests generate each country's source; adding a category adds its
  metric, its request, its bar on every page and, for a division, its own
  chart, map and ranking on `/statistics`.
- **Holders are place references** (`{ iso_3166_1, CH }`, `{ wikidata, Q23427 }`),
  as Places identifies everything; `holders.ts` is the one mapping to the world
  list's page slugs.
- **Analysis is pure arithmetic** (`analysis.ts`): a breakdown at any level with
  what the parts leave over (allowing for the publisher's rounding), whether a
  publisher gives a total and no breakdown, self-reliance (own revenue against
  money received, and what spending the same without it would take, labelled as
  arithmetic and not a forecast), history, and `pickBudget` (the one rule for
  which year a page shows: the newest that says what was spent).

## 4. What is loaded **[built]**

- **Eurostat, 30 countries** (the EU's 27, Iceland, Norway, Switzerland), every
  year from 1995: spending by COFOG division and group, revenue by ESA item,
  the balance, all in per cent of GDP (comparable without exchange rates). Reuse
  is authorised with acknowledgement (Eurostat's copyright notice, read
  2026-11-10; `LicenseRef-eurostat-reuse`). In production the sources run on the
  11th of each month; the first load is `pnpm run places:fetch eurostat-gov-<cc>`.
- **South Ossetia, 2023**, from its Parliament: revenue line by line from the
  law on the budget's execution (Appendix 1), spending by section from the
  spreadsheet that page links as Appendix 3, which is headed as an appendix to
  the 2023 budget law: allocations as amended, kept as a budget of its own basis
  (`enacted`), not mixed with the outturn. 81% of revenue was aid from the
  Russian Federation.

## 4a. One currency for the reader **[built]**

Every amount is shown in the currency the reader chooses (CHF by default; EUR,
USD, GBP, RUB, GEL offered, `?in=`), converted at the budget year's average
rate, and the page says from what and whose rate. A budget read from Eurostat
is held in million euro (Eurostat's own conversion, `MIO_EUR`) beside its share
of GDP; one read from a law in its own currency. Rates are data
(`data/money/rates.json`, `pnpm run money:rates`): Eurostat's annual averages of
the euro reference rates for 151 currencies, and, for the rouble after 2021
(Eurostat stops there), the Bank of Russia's official euro rate averaged over
each year. A year with no rate is not converted at another year's rate: the
amount stays in its own currency and the page says why. The conversion code
(`src/lib/money/`) imports nothing from Solon, so it can become the fleet's
package for money (OrangeCat converts live Bitcoin prices, a different job
that can sit beside it); that needs a repository of its own.

## 5. Adding a place

- **A country Eurostat covers**: nothing; it is already generated.
- **Another statistics office's series** (the IMF's GFS, the OECD's COFOG
  tables): an adapter for its format and a requests entry per dataset in
  `config/budgets`, its codes mapped onto the same taxonomies.
- **A budget law**: a file under `config/budgets/documents/`, its lines as
  printed, each placed on a category with the placement explained in words;
  the checks hold it to the law's totals, and the weekly source check
  (`statistics:verify`) re-reads the pages it cites.

## 6. Proposals

Every budget page ends in "propose a change to this budget", a proposal
draft carrying the page's address, and links to the function's chart across
countries. Next: a proposal that names categories and amounts, so its effect
on the balance is computed against the budget it changes, and, where a
budget law is in the register, an amendment to the law's own lines through the
amendment engine (`2026-11-amending-the-law.md`).

## 7. Build order

1. **[built]** Taxonomies, scopes, generated metrics, the Eurostat adapter and
   sources, budget documents, the domain, `/budgets` and `/budgets/<place>`,
   the budget card on a country's place page, the contested places' budget
   section through the same components.
2. **Sub-national and other entities**: cantons and communes (their own
   accounts, often published as open data), and Solon organizations, whose
   budgets are proposals they vote on (`ROADMAP.md#commons`). The holder is
   already a place reference; an organization needs a holder scheme of its own.
3. **Money as well as shares** **[built]**: amounts beside the shares of GDP, in
   the reader's currency (§4a).
4. **More publishers**: the IMF's Government Finance Statistics for the
   countries Eurostat does not cover, read for its licence first.
5. **Proposals with arithmetic** (§6), and a comparison page: two or more
   places side by side, function by function, as shares of spending.
6. **Budget laws read by program**: the publisher's spreadsheets imported as
   documents, so a new year needs no hand.

## 8. Honest limits

- A share of GDP says how big a function is against the economy, not how well
  the money is spent; the page shows the series and leaves the judgement to
  the reader.
- Eurostat publishes figures to one decimal of a per cent; parts may miss the
  whole by that, and a remainder within it is not shown as money unaccounted
  for.
- Where a publisher gives a division and no breakdown (Switzerland's health
  groups are all zero), the page says so instead of showing zeros as spending.
- Placing a budget law's lines on the international classifications is a
  reading, and the page says whose.
