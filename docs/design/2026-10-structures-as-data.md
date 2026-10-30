# Structures as data: compare a foundation, a fund and a company, and act on it

_Created 2026-10-30. Status: proposed. Builds on `2026-10-law-as-data.md` (the
law Solon holds) and `2026-09-places-and-jurisdictions.md` (places, facts,
instruments). Causius's workflow `#wf-vehicle` is the reader that drafts from
it._

## 0. The brief

A family, or the people who advise it, choosing between a Liechtenstein fund, a
Liechtenstein foundation, a Luxembourg vehicle, an Irish one, an Emirati one or
a plain holding company today compares them case by case, through whichever
adviser they asked first. The question put to the Liechtenstein fund industry
on 2026-10-20 was whether there is demand for a systematic, data-driven side
by side: **tax effect, cost, deadlines and control rights**. Solon can answer
it with data, because it already holds the law of Switzerland and
Liechtenstein as provisions with their sources.

Three things, in this order:

1. **A register of structures.** Each legal form a jurisdiction offers for
   holding wealth, with the facts that decide between them, each fact citing
   the provision it comes from.
2. **A comparison** that reads the register: the same rows for every
   structure, a missing fact shown as missing, no score.
3. **Actions.** Every structure says what to do next and who may do it: the
   register to form it, the licensed providers who must be involved, the
   filings and their deadlines.

## 1. Principles

- **The law is the source.** A fact about a structure (who may form it, what
  it costs to form, what tax it pays, what it must file and when, who controls
  it) cites a provision Solon holds, by act and article, with that
  provision's hash. A fact with no provision behind it is not shown.
  Practice that no provision states (how long the regulator takes, what
  providers charge) is labelled as such and cites its own source, or is left
  out.
- **No advice, no score.** Solon states what the law says for each structure.
  Which suits a family is a judgement that a licensed trustee, lawyer or tax
  adviser makes. Causius drafts the comparison and hands it to one (its
  `#helpers`). The line between information and advice is set by law; it is
  not ours to relax.
- **One shape per kind.** Every structure has the same rows, in the same
  order, whatever its jurisdiction. A row that does not apply says so.
- **Mechanism in code, the world in data.** No engine file names a
  jurisdiction or a legal form. Forms, their facts and their actions are
  config and imported data, as countries are in Places.

## 2. What exists to build on

| Piece | Where | State |
|---|---|---|
| The law of CH and LI as provisions, with source and hash | Solon `legal_acts`, `legal_provisions` | Federal, cantonal and Liechtenstein acts in force, with text (`/law/coverage`) |
| Asking the law, grounded in provisions | Solon `/law/ask`, used by Causius | Built |
| Facts with sources, per place and period | Solon Places `facts` | Built |
| Ways to act at an authority's own page | Solon Places `instruments` | Built for tax steps (2026-10-30) |
| The vehicle workflow and licensed helpers | Causius `#wf-vehicle`, `#helpers` | Workflow planned; helper directory built |
| Luxembourg and Ireland's law | Causius `#more-law` | Planned; the readers belong in Solon (law-as-data §4) |

## 3. Data model

A **structure kind** is a legal form in one jurisdiction: Liechtenstein's
foundation, its establishment (Anstalt), a fund under its fund acts, a Swiss
company limited by shares, and so on. Kinds are config, like levels: a key,
the jurisdiction (a Places path), names in the reader's languages, and the
act that creates the form (a `legal_acts` id, or its number in the
jurisdiction's collection).

A **structure fact** is one number, period or yes-or-no about a kind, for a
period, citing one or more provisions:

| Row (metric) | Kind of value | Example of what the row holds, not a figure |
|---|---|---|
| Who may form it | text from config, citing the provision | founders, a licensed provider required or not |
| Minimum capital | amount, currency | the act's minimum |
| Formation fees | amount | the register's tariff |
| Annual tax on the structure | a tax model, as Places' | profit tax, capital tax, a flat minimum |
| Tax on distributions | rate | withholding on what it pays out |
| Supervisor | a place or an authority | the financial market authority, or none |
| Filings and deadlines | instruments with a deadline | annual accounts, beneficial-owner register |
| Control rights | rows of who decides what | founder's reserved rights, protector, investors' votes |
| Public register | yes or no, with what it shows | what a stranger can learn |

These are Places metrics and instruments with a new subject: today a fact
belongs to a place, and here it belongs to a structure kind in a place. The
change is one nullable column, `structure_kind`, on `facts` and `instruments`
(a migration), so the importer, the invariants and the coverage page serve
both. Tax rows reuse `@bitbaum/tax-model`: a structure's annual tax is a model
whose base is its profit or its capital, evaluated in the reader's browser
on the reader's figures, as income tax is.

## 4. Sources, in order

| Jurisdiction | Law in Solon | To add |
|---|---|---|
| Switzerland | Federal and cantonal acts in force | Kinds and facts only |
| Liechtenstein | Acts in force from Lilex | Kinds and facts; the FMA's public registers of licensed providers, as instruments (access and terms to confirm) |
| Luxembourg | None | A reader for Legilux (law-as-data §4: Causius planned it; it belongs in Solon) |
| Ireland | None | A reader for the Irish Statute Book |
| United Arab Emirates | None | The federal legislation portal, and the DIFC's and ADGM's own laws, which apply inside those free zones (formats and terms to confirm before anything is built) |

Each new jurisdiction is a law reader first (law-as-data L1/L2), then its
kinds, then its facts. No fact is entered for a jurisdiction whose law Solon
cannot cite.

## 5. Actions

Every structure kind carries instruments, as places do:

- **Form it**: the register's own page, and where the law reserves the
  formation for a licensed provider, the official register of those
  providers. Solon never forms anything.
- **Keep it**: each filing the law requires, with its deadline and the
  provision that sets it.
- **Ask about it**: `/law/ask` scoped to the kind's acts; and Causius, which
  drafts the comparison as a matter and offers the licensed helpers admitted
  in that jurisdiction.

## 6. Order of work

| Step | What | Done when |
|---|---|---|
| **S0. Liechtenstein and Switzerland** | `structure_kind` on facts and instruments; kinds for the LI foundation, Anstalt and fund forms and a Swiss company; their facts from acts Solon holds; the comparison page | Every row of every kind cites a provision, or says it is missing |
| **S1. Actions** | Formation and filing instruments; the LI providers' register; Causius `#wf-vehicle` reads S0 | A reader can go from the comparison to the register or a licensed provider in one step |
| **S2. Luxembourg** | Legilux reader in Solon, then kinds and facts | As S0, for Luxembourg |
| **S3. Ireland** | Irish Statute Book reader, then kinds and facts | As S0, for Ireland |
| **S4. United Arab Emirates** | Federal and free-zone readers, then kinds and facts | As S0, for the UAE |

## 7. Places whose status is disputed

Places already records claims and recognition as statements with their
sources, and takes no side (design §7.1; neutral copy, `neutral-terms.ts`).
The law of a place whose status is disputed is held the same way: as what
that place's own authorities publish, with who recognises them and who does
not, shown beside it and never instead of it. Whether a reader may act under
it, and whether sanctions apply to dealing with its authorities, is part of
what the page says. No such place is added before its publisher's access and
terms are confirmed and the Register adopts the policy for it.

## 8. Open questions

1. Licence and terms of each new publisher, before any bulk import (the
   law-as-data rule).
2. Whether the FMA's and the other supervisors' registers allow automated
   reading.
3. Where the line between "what the law says" and advice falls for a
   comparison page, per jurisdiction. To be settled with a licensed lawyer
   before S0 ships.
