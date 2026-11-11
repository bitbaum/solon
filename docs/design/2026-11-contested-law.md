# Contested law: one place, two sets of law, side by side

_Design, 2026-11-10. Status: P1 is built (marked **[built]**); the rest is the plan.
What makes it a working product (proposals, safety, hand-over) is
`2026-11-from-comparison-to-change.md`.
Builds on `2026-09-places-and-jurisdictions.md` §7 (disputed places as assertions
between authorities), `2026-11-freedom-framework.md` (rules, practice, outcome;
rubrics; no labels) and `2026-11-global-law-and-exit.md` (exit, comparison,
propose a change). Nothing here is claimed built unless it says so._

## 1. What the owner asked for

From the conversation of 2026-11-10, in substance:

- In a place like South Ossetia, the law that governs in practice is the
  Republic's own, while Georgia's law also claims to govern the territory.
  People should be able to compare the two: what the law would be under the
  other authority, and what the trade-offs are.
- The same holds for every disputed territory: the owner named those disputed
  by Russia and Ukraine, and Israel, Gaza, Judea and Samaria (the West Bank)
  and the settlements.
- Think it through as a system, and in terms of how it could help resolve a
  conflict: there should be competition between the rule sets; people compare,
  the results are shown, and everything is evident.

## 2. The idea, in one paragraph

A disputed place is the sharpest case of what Solon is for. Two authorities
each say their law applies to the same land and the same people. Usually that
dispute is argued in flags, maps and history, which nobody on the ground can
act on. Solon turns it into something a resident can read: **question by
question, what each authority's own text says**, quoted, sourced and dated;
then, where it is measured, **what happens in practice and what results for
people** on each side. It does not say which authority is right. It makes the
offers comparable, so the choice (and any settlement) can be argued about the
substance: my citizenship, my property, my service, my right to leave.

## 3. Why this can help, as a system

Solon cannot settle a sovereignty dispute and does not try. What it can change
is **what the dispute is about, and who can see it**.

1. **Rule sets compete for people.** Tiebout's account of people choosing among
   local governments and Hirschman's exit and voice (the basis of the freedom
   framework, §3 there) describe authorities that must offer something to keep
   people. A disputed place is two authorities making competing offers to the
   same people, but the offers are buried in two legal systems, two languages
   and two publishers. Putting them side by side is what turns rivalry over
   territory into competition over terms. `/compare` did this for cantonal
   tax: once the numbers sat next to each other, the comparison argued itself.
2. **Concrete trade-offs replace symbols.** "Whose land is it" has no answer
   both sides accept. "Under each law, can I hold two passports, can I be made
   to serve, can I leave, is my title deed recognised, which language may my
   child be taught in" has answers in the texts, and a person can weigh them.
3. **Common knowledge.** Each side's population typically knows its own law
   and hears the other's described by its own side. One page, the same for
   everyone and in every language Solon speaks, with the original text beside
   each translation, is something both can point to. It is neutral because it
   is quotation, not because Solon chose words carefully.
4. **Results are evident.** The freedom framework's three layers apply to each
   side separately: what the text says (de jure), what happens (de facto), what
   results (outcome: population, income, emigration, the figures each side's
   own statistics office publishes). A reader sees whether an offer is honoured,
   not only what it says. Coded features (rubrics) let a reader rank the offers
   on their own weights; Solon publishes the measures and never the verdict.
5. **From comparison to proposal.** A settlement is a third rule set. Solon
   already lets anyone propose a change to a provision, gather support and
   carry it to the authority that decides (`2026-11-global-law-and-exit.md`
   step 3). Here a proposal can be **terms for the place**: per question, which
   rule should apply, with a redline against both sides' texts. Support is
   counted **per electorate** (residents of the place, citizens of each claimant,
   displaced people who left), shown separately and never summed, so a draft
   that can carry both sides is visible as such. Solon claims no authority:
   the count is evidence of support, handed to whoever negotiates.
6. **Exit stays the floor.** Whatever the dispute's outcome, a reader can see
   what leaving costs under each law (the exit rubrics already built: giving up
   citizenship, tax on leaving). That is the one comparison a person can act on
   alone, today.

What it does not do: it does not rank authorities, take a position on borders,
estimate anything that was not published, or move money (place pages are
information; money in or from a sanctioned area is OrangeCat's sanctions check,
places design §7.3).

## 4. The model

### 4.1 Three shapes of dispute

| Shape | Who | Example the owner named or Solon holds | What applies to whom |
|---|---|---|---|
| **A. A self-governing place a UN member claims** | the place's own authority governs; the claimant's law claims it | South Ossetia (Georgia), Abkhazia (Georgia), Transnistria (Moldova), Northern Cyprus (Cyprus), Somaliland (Somalia), Kosovo (Serbia): `src/lib/config/world.ts`, `claimedBy` | one place, two territorial laws |
| **B. Land one UN member administers and another claims** | two packs' laws over one area | the areas disputed by Russia and Ukraine | one area, two territorial laws; the place is a subdivision in both packs |
| **C. Layered regimes** | more than one authority applies law inside one area, by area class or by person | the West Bank (Judea and Samaria) and its settlements; Gaza | laws apply by zone **and** by who a person is (citizenship, residence); a side is "this law, for these people, in this zone" |

Shape A is what `world.ts` already states, and is P1. Shape B needs the area
model (`area_assertions`: `claims`, `administers`, `proposes`, places design
§4.4), which exists in the schema and has no disputed rows yet. Shape C adds one
thing to a side: **its scope**, territorial or personal (who it applies to).
Which law applies to whom in C is itself contested and is exactly what the page
must show sourced, side by side, without choosing; nothing about it is written
here until those sources are read.

### 4.2 A contest **[built for shape A]**

`src/lib/config/places/contested.ts`, validated at load:

- **Topics**: the questions every contest is asked, the same for all, so pages
  line up and a reader learns one layout (one shape per kind). Each has a label
  and a question in every language Solon speaks. Today: the territory each text
  claims; citizenship and holding another; losing citizenship; moving and
  leaving; the duty to defend or serve.
- **Sides**: who, in what role (`governs` or `claims`, mirroring `world.ts`),
  and the law authority whose register holds its law when Solon has one.
- **Provisions**: for a topic and a side, the article's label, the act in Solon's
  register when it is there (so the quote opens the held text), the words quoted
  in their own language with a translation, and the evidence (page, day read,
  words it must still hold). No summary in Solon's voice is stored as the law.
- **Gaps**: for a topic and a side with nothing read, what would fill it. A
  side with no quote shows the gap, never a blank that reads as "no right".

The page is `/places/contested/<slug>`, and `/places/contested` lists every
place `world.ts` marks as claimed, each saying how many questions are compared.
Every place page of a claimed place says who claims it and links to the
comparison (this also restores the "claimed by" line the South Ossetia pack
page lost when `/places/south-ossetia` began redirecting to the pack, #503).

### 4.3 Integrity

Everything the freedom framework enforces applies:

- Every quote's page is re-fetched by `pnpm run statistics:verify`, weekly, and
  fails when its words are gone (the contests are fed to the same checker).
- Original text is shown beside the translation, marked with its language.
- A page that a program cannot read (matsne.gov.ge refuses automated readers)
  is cited as `unchecked` beside the copy that was read, named as a copy.
- Solon's own words pass the neutral-copy test. A quote may use the words of
  its source; the page attributes it.
- Both sides have the same shape on the page. Order is fixed by role
  (`governs` first, then each claimant), never by preference.
- Rubric codings (P2) need a second reader before they show as settled.

## 5. P1 as built, 2026-11-10: South Ossetia and Georgia, constitutions

Read on 2026-11-10:

- The Constitution of the Republic of South Ossetia, as its Parliament publishes
  it (`parliamentrso.org/node/3567`, held in Solon's register as `rso`).
- The Constitution of Georgia in the Constitute Project's English translation
  (`constituteproject.org/constitution/Georgia_2018`). The authentic Georgian
  text is on matsne.gov.ge, which returned an "Access Denied" page to Solon's
  reader that day, and the Internet Archive was not reachable from where the
  work was done. The translation is cited as a translation; reading the
  authentic text is P2.

Compared, both sides quoted: the territory each claims (SO Art. 3; GE Art. 1,
Art. 7), who may propose a law (SO Art. 69; GE Art. 45), citizenship and
holding another (SO Art. 16; GE Art. 32), losing it (the same articles), moving
and leaving (SO Art. 24; GE Art. 14), the duty to defend (SO Art. 42; GE
Art. 70). Taxes: South Ossetia's Tax Code, Part Two (Arts. 166, 228, 286, read
from the Word file its Parliament links), against PwC's summary of Georgia's
rates, cited as a summary and not the law. Money: South Ossetia's law on the
2023 budget's execution (Art. 1 and Appendix 1), held as a budget document and
shown through the budget pages' own components (`2026-11-budgets.md`): each
side's budget is found by its place, so Georgia's appears the day Solon holds it.

What it already shows a reader, from the texts alone: both constitutions forbid
taking citizenship away; South Ossetia's allows dual citizenship in the
constitution itself, Georgia's leaves holding another citizenship to an organic
law; both state a right to leave; both make defence a citizen's duty and leave
service to statute. Each claims the territory: South Ossetia's names its five
units; Georgia's names the former Autonomous Region of South Ossetia as part of
the state and defers its territorial arrangement until "the complete
restoration of the jurisdiction of Georgia over the entire territory".

## 6. Build order

1. **P1 [built]**: shape A, the topics, South Ossetia against Georgia from the
   two constitutions, the pages, the links, the weekly check.
2. **P2: the statutes and the codings.** Georgia's register in Solon: matsne
   through a dated archive copy read from the box (the reader already falls back
   to the Internet Archive, `src/lib/law/publishers/http.ts`), or an agreed
   feed from the Legislative Herald. Then the statutes each constitution defers
   to (citizenship, military service) on both sides, and the five existing
   rubrics coded for both, with a second reader. The claimant's statutes that
   name the territory specifically (what it says about documents, property and
   entry issued or done there) are their own topic, **what each law says about
   the other's acts**, because that is what a resident's papers depend on.
3. **P3: the other shape-A places.** Abkhazia, Transnistria, Northern Cyprus,
   Somaliland, Kosovo: config and readers, no new code. The index already lists
   them with nothing compared yet, which is the to-do list in public.
4. **P4: shape B.** Disputed `claims` and `administers` rows from sourced
   imports; Ukraine's and Russia's registers; a contest whose sides are two
   packs' authorities over one area. The map draws the area hatched, with the
   legend in relation language (places design §7.2).
5. **P5: shape C.** A side's scope (zone, and to whom it applies); the area
   classes as areas; each layer's texts. Built only from sources read, and
   reviewed by two people before it is shown, because the stakes are highest.
6. **P6: results and proposals.** Outcome series per side (each side's
   statistics office, international series that report the place separately)
   on the contest page with the sanity checks the statistics pages use; then
   settlement drafts as proposals with support counted per electorate (§3.5).

## 7. Risks

- **Being used as propaganda by either side.** Mitigation: quotation only,
  original beside translation, fixed order, the same topics for both, a gap
  shown as a gap, neutral-copy test on Solon's words.
- **A wrong translation changes the meaning.** Show the original; name who
  translated; prefer the authority's own translation where it publishes one.
- **Stale text.** The weekly check finds a changed page; a quote states the day
  it was read and, where Solon holds the act, opens the held version.
- **Selection.** Which articles are compared is itself a choice. The topics are
  fixed for every contest and listed in config, and anyone can propose a topic
  the way they propose any change.
