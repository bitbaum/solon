# The law of every country: the plan and the system that follows it

2026-11-10. The owner's direction: every country's constitution and national
law in Solon, Russia and Ukraine among the first; subdivisions later. Laws
are public by definition, so a law that one site will not serve is read from
another copy, with its source and the day it was read. There is one plan,
Solon follows it, and anyone can see where it stands. Nothing is done twice.

## 1. Principles

1. **The words of a law are public; the copy is cited.** Solon reads the
   publisher's own text where it can, and any other faithful copy where it
   cannot: Wikisource, a court's or ministry's PDF, a legal database, the
   Internet Archive. Every version records who keeps the copy, its address,
   the day it was read and the hash of the bytes. A copy is shown as one: "the
   words as ru.wikisource.org keeps them, not the publisher's own copy"
   (`ACT_TEXT_STATUSES`: `copy`).
2. **The original language, then the reader's.** Solon stores the law in the
   language it is enacted in, and translates for the reader with its own
   labelled machine translation (`src/lib/law/translate.ts`). It never stores
   a third party's translation: those are often under copyright (Constitute's
   texts are CC BY-NC, some Hein or Oxford University Press, outside the
   licence policy).
3. **Each country's own copyright law, stated.** A country's text is stored
   only once the plan records the provision of its own law that puts official
   texts outside copyright, read from a source opened on a stated day (Russia:
   Civil Code Art. 1259(6); Ukraine: Law No. 2811-IX Art. 8(1)(3)), and the
   licence policy lists the matching entry. A missing basis is a next step,
   not a guess.
4. **An outdated copy is refused.** Where the index records the year of the
   last amendment, a copy that names no year since is an older edition and is
   not stored (`refuseCopy`). Ukraine's Wikisource copy (amendments to 2004)
   was refused this way; the Constitutional Court's PDF (2019 amendments) was
   taken.
5. **One reader per kind of source, not per country.** A country is added by
   data: a choice in the plan and a line for its copyright. New code is
   written for a new *kind* of source (an official portal's API, a register
   format), and then serves every country that publishes that way.
6. **No double work.** One act per law per authority. A copy attaches to the
   constitution a register already lists; a country whose constitution Solon
   holds from its publisher is never read from a copy. Countries keep one
   authority key each, generated for the whole world list.

## 2. The plan as data

`data/law/plan.json` (schema `src/lib/law/plan/schema.ts`), one entry per
country (ISO 3166-1), 238 today:

- `authority`: its key in `LAW_AUTHORITIES`. Every country of the world list
  has one: listed ones keep theirs; any other is its alpha-2 code, or alpha-3
  where a canton holds the two letters (`fra`, `geo`, `bel`).
- `copyright`: the provision, its source and day, the licence entry.
- `languages`: official languages, from Wikidata.
- `constitution.inForce`: the constitution in force by Constitute's index
  (title, year enacted, year of last amendment): what Solon should hold.
- `constitution.candidates`: copies Wikidata knows (official addresses,
  Wikisource pages), each with its item, language and year.
- `constitution.chosen`: the source to read, chosen by the rule or by a
  person (with a reason).
- `national`: the readers that list and load the national law, and where it
  can be read as far as anyone has looked.

`pnpm run law:plan seed` reads Constitute and Wikidata again. What the
sources say is replaced; what a person decided is kept. Its rule chooses a
Wikisource page only when it is unambiguous: an official language, an item
not ended or replaced, the year enacted (or an item Wikidata gives an official
address, so a draft sharing the label is never chosen), and exactly one such
item. Everything else waits for a person.

## 3. Knowing where we are

Progress is never written by hand. `pnpm run law:plan status` counts, per
country, from the database: the constitution (none, listed, text) and the
national acts (none, listed, text, with counts), and derives the next step:

- find a copy of the constitution in force / choose among the candidates;
- record the copyright provision;
- load the constitution from the chosen source;
- build or run the national register;
- build or run the national texts' reader;
- keep current.

## 4. Order of work

1. **Constitutions of every country** (this change starts it). Russia and
   Ukraine are held. Then, for each country the rule resolves (26 today),
   record the copyright provision and load; for the rest, choose a copy by
   hand from the candidates, Constitute's index naming the edition in force.
   Done when `status` shows a text for every country Constitute lists.
2. **National registers**, a country at a time, ordered by need (places with
   no democratic route to change their law first, then population), each from
   its official portal where reachable, else a faithful public copy. Russia's
   is built (`pravo-gov-ru`, 8,011 acts listed); Ukraine's next (the
   Verkhovna Rada's open data).
3. **National texts**, through the same readers or a copy source for the
   texts (Russia: the portal disallows its files to robots, so a database that
   publishes the consolidated texts openly).
4. **Subdivisions**, the same way, after the national layer. One subject of
   Russia is already listed (North Ossetia–Alania); the reader takes the
   others as one line each.

Each step is a pull request that moves countries in `status`, with the
roadmap item it closes.

## 5. Risks

- **A copy's edition.** The year check catches an old edition only where the
  index records an amendment year and the copy names its years. A copy also
  goes stale; reading it again (`--again`) stores a new version when it
  changed.
- **Wikidata is a finding aid, not a source of truth.** It lists historic and
  draft documents beside the one in force; the rule and the year check are the
  guard, and a person decides the rest.
- **Rate limits.** Wikimedia throttles busy addresses; the reader waits as
  long as a 429 asks and paces requests.
- **Reachability differs by network.** A host this development machine cannot
  reach (the Verkhovna Rada's sites, web.archive.org) may answer Solon's
  server, and the other way round. The plan records what was tried and from
  where.
