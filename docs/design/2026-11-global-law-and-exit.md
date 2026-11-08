# The law of every place, actionable, and exit as a primitive

2026-11-06. The owner's direction, from a conversation about Wyoming,
decentralization and public ledgers, checked against the repository and
production on the same day. `ROADMAP.md` carries the work items ("Law you can
act on", "One globe", "Beyond Switzerland", "Exit", "A record anyone can prove
complete"); this file carries the reasons and the order.

## What the owner asked for

- Solon is meant to cover the law of every place, so that anyone anywhere can
  read the law that applies to them and act on it. Today's law lives in PDFs
  and changing it runs through representatives and lobbyists; Solon should make
  every word reviewable, let anyone propose a change, gather support and carry
  it toward a vote or a ballot.
- Exit is the constraint that makes pluralism work: a group may choose any
  rules — heavy redistribution or almost none — as long as people can leave and
  start or join another. Forking a group and its rules should be cheap.
- The record should be verifiable the way Bitcoin's is: public, append-only,
  checkable by anyone without trusting the keeper, for rules as well as money.
- The site's story leaned on the Glarus Landsgemeinde alone. It is one root,
  not the whole: the public ledger, open-source rules, polycentric law and exit
  belong beside it.
- Design is paramount: a globe that is beautiful and global, starting with
  Switzerland, Liechtenstein and, in the United States, Wyoming.

## What was true on 2026-11-06

- **The law was loaded; nobody could find it.** Production held text for
  28,766 of 28,777 acts in force (`/api/v1/law/coverage`, read 2026-11-01): the
  Confederation, all 26 cantons, the intercantonal agreements, Liechtenstein,
  Luxembourg and 22 communes. `ROADMAP.md` still said "the production load is
  not done", the coverage page said "the text of the law is not held yet", and
  `/law` was in neither the header nor the footer. The owner had asked for the
  laws several times and reasonably concluded they were missing.
- **Communes are the real gap**: about 2,100 Swiss communes, four of
  Liechtenstein's eleven. Each collection is a publisher with its own format
  (`docs/research/2026-11-communal-law-publishing.md`).
- **The law sync runs by hand** (`.github/workflows/law-sync.yml`). Its last
  full run (2026-11-01) failed three steps (Lilex, new cantonal acts, communes)
  on a handful of acts each; everything else applied.
- **The map is already a globe.** `@bitbaum/geo-kit/map` renders an orthographic
  globe; `/places` zooms it to Switzerland and colours communes by income tax.
  It is drawn small and flat-grey, and shows nothing outside Switzerland and
  Liechtenstein.
- **Nothing in Solon forks.** An organization's rules are a profile chosen at
  founding; the versioned charter that would make them data is under "Next".

## Order, and why

1. **Make what exists visible and tell the story truthfully** (this PR). Law in
   the main menu; the roadmap and coverage page saying what production holds;
   the home page leading with the open law; the ideas page with the ledger,
   open source and polycentric law beside Glarus. Cheap, and it changes what a
   visitor understands Solon to be.
2. **The globe.** One renderer (`@bitbaum/geo-kit`; a missing capability is
   added to the package, per the fleet's "extract before the second copy"):
   Earth → country → canton or state → commune or county, coloured by how
   much law Solon holds there, each place linking to its law. On the home
   page and on `/places`.
3. **Law you can act on.** "Propose a change" on any provision: an editable
   copy, a redline against the publisher's text, filed as a Solon proposal
   carrying the hash of what it amends; support counted like any vote. Beside
   it the place's **official route** as sourced data — who can put a change
   before the legislature or the voters, with how many signatures in how long.
   Solon never claims a proposal is law: it is evidence of support, handed to
   the authority that decides.
4. **Wyoming.** The first place outside Europe: its statutes and rules, its 23
   counties on the globe, its initiative and referendum rules. It forces the
   data model to drop its Swiss assumptions, which is the real deliverable;
   every later country should be configuration plus an adapter.
5. **History and diffs** for every act, from what the sync already re-reads.
6. **Exit.** The charter as data, then fork: a new organization from a copy
   of another's rules, its origin recorded, no permission needed; nested
   groups with rules of their own; a member leaving with their record.
   Alongside it, a record anyone can prove complete: audit events hash-chained,
   the head anchored to Bitcoin with OpenTimestamps.

## What this does not change

- Solon takes no side on which rules are best, and its copy says so. "Minimal
  rules" or "AI-friendly" is a template a group may choose, never the default.
  The neutral-copy test keeps Solon's own words from taking sides.
- Solon claims no sovereignty and holds no money: the treasury stays
  watch-only, decisions stay evidence, executors re-verify.
- Every fact on the site has a source, and every count is read from the data,
  not typed into copy.
- **Sources.** Law is read from its publisher's official site first. When that
  site refuses an automated reader (403, 429, 503 or a bot check), the text is
  read from a dated public copy instead, the Internet Archive's newest capture
  (`src/lib/law/publishers/http.ts`); the act keeps the publisher's address, the
  version records the copy's address, and the act page names it as the archive's
  copy of that day, never as the publisher's own. Solon does not disguise its
  reader or solve challenges.

## Ideas worth keeping in view

- **What applies here.** Pick a point on the globe and see every layer of law
  in force there at once — federal, canton or state, commune — each with
  "propose a change". It joins the globe and the law into one gesture and is
  the most concrete form of "anyone anywhere can act on the law".
- **Compare rule sets the way `/compare` compares tax.** Once rules are data,
  two groups' charters, or two communes' regulations on the same subject, can
  be set side by side, which is what makes exit an informed choice.
- **Government spending beside the law that authorizes it.** Utah and Wyoming
  publish transaction-level spending; Swiss communes publish budgets. Read
  beside the statutes, it extends "open books" from Solon's own groups to
  governments.
