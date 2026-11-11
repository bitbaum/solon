# A world of jurisdictions: every place, recognised or not

2026-11-10. The owner's direction: better country pages for every country and
every unrecognised territory; a map that can show the unrecognised places and
hide the recognised ones; Liberland, and jurisdictions like it, seasteading
among them, everywhere in Solon. Neutral: Solon says what each place does,
never whether its claim is right.

## Kinds, by what a place does

`src/lib/config/world/kinds.ts` gives every entry of the world list one kind:

| Kind | What it says | Source |
|---|---|---|
| `state` | A member of the United Nations, with its day of admission | un.org's list (193) |
| `observer` | A UN observer state (Palestine, the Holy See) | un.org |
| `self_governing` | Governs itself and is not a UN member | the world list (Taiwan, Kosovo, Abkhazia, South Ossetia, Transnistria, Northern Cyprus, Somaliland) |
| `territory` | Not a UN member; where Wikidata lists it under a state, that state | ISO 3166-1, Wikidata |
| `proclaimed` | Proclaimed as a state by its founders | the rule below |
| `special` | A jurisdiction with law of its own inside a state | named in `extras.ts` (Próspera) |
| `project` | A project for a new jurisdiction | named in `extras.ts` (the Seasteading Institute, Freedom Ship, Blueseed) |

**The proclaimed rule** is the only judgment, and it is the same for every
place: Wikidata classes it as a micronation (Q188443), it is not dissolved,
and it has an article in at least 30 Wikipedias
(`PROCLAIMED_MIN_WIKIPEDIAS`). On 2026-11-10 that is Sealand, Liberland,
Molossia, Filettino, Užupis, Lundy, Seborga, the Conch Republic and Ladonia.
Notability, not merit: a place that grows past the bar appears at the next
read, and one Wikidata marks dissolved leaves.

A project's coordinates are its office, not a place it governs, so a project
gets no point on the map.

## Profiles

`pnpm run world:profiles` writes two files:

- `data/world/profiles.json`: for every place, its facts from Wikidata (CC0)
  with the day they were read: names, Wikidata's description, capital,
  population and its year, area (the preferred figure, else the smallest, so a
  claimed territory larger than the governed one is never shown as its area),
  official languages, currency, form of government, heads of state and
  government, founding or proclamation, website, a point, the state it lies
  in; and the UN's members with their day of admission.
- `src/lib/config/world/extras.json`: the small part the map needs in the
  browser: the UN members, the places beyond the ISO list and their points.

A place page reads the profile on the server and shows one card on every
country, territory, proclaimed state and special jurisdiction: its kind in a
sentence, its facts, and the way into its constitution and its law, with
where the facts come from. A state shows the day it joined the UN rather
than Wikidata's founding year (Russia's would read 1263); a place beyond the
UN shows when it was founded or proclaimed. Facts change: the file is read
again and merged by pull request; the page says the day it was read.

Places beyond the ISO list that make law (proclaimed, special) have a law
authority of their own, keyed by their slug, and a place in the plan for the
law of every country (`docs/design/2026-11-law-of-every-country.md`), so
their law is read the same way. Liberland's constitution is read from its
own repository (`liberland/constitution` on GitHub).

## Photographs

Every place's page opens on its photograph, and a link to it shared anywhere
shows that photograph with its name (`/api/og/place`). One mechanism for every
place, a country or a commune:

- `pnpm run places:photos` finds a place on Wikidata by its world entry or by
  any identifier whose scheme names a Wikidata property
  (`wikidataProperty` in `identifier-schemes.ts`: ISO 3166-1 and -2, FSO
  municipality numbers, US state and county FIPS codes). `--all` reads every
  place Wikidata holds under those schemes, so a place reaches its page with
  its photograph already chosen; `--from-db` reads the places the database
  holds. It writes `data/world/photos.json`, one entry per line: the
  photograph by Wikidata item, and an index from `scheme:value` to the item.
- A scheme no other source keeps reaches its photograph through a crosswalk
  (`src/lib/config/places/crosswalks.ts`): a Swiss canton's FSO number is read
  as its ISO 3166-2 code.
- The choice, best first (`src/lib/places/photo-rules.ts`): the full
  photograph the place's Wikivoyage banner was cut from; its image (P18), then
  its aerial or night view, when that is a landscape photograph at least 1600
  pixels wide and not a map or a flag; a panorama or the banner itself, shown
  as a strip. Only free licences (public domain, CC0, CC BY, CC BY-SA, the
  Free Art License), shown unchanged, the author and licence in the photo's
  corner and on `/credits`.
- A person can replace any choice in one line
  (`src/lib/config/world/photo-choices.ts`: the file, why, and where to anchor
  it): the Earth from Apollo 17 for the world, Switzerland's Matterhorn,
  Liechtenstein's Vaduz Castle, Georgia's Gergeti Trinity Church, a West Bank
  landscape for Palestine.
- Solon serves the photographs itself (`/api/place-photo/<width>/<file>`,
  `src/lib/places/photo-store.ts`): each Commons thumbnail is read once, one
  request at a time with Solon's own user agent, and kept in
  `place_photo_bytes`, so a reader's browser never asks Wikimedia, a page never
  waits on it twice and a deploy never empties the store. Only files
  `photos.json` names are served. After each deploy the places-data workflow
  reads the world list's photographs (`places:photos:warm`); a subdivision's is
  read the first time it is opened.

## The page

One page shape for every place, with or without a photograph:

- **The hero**: where the place sits and the way to share it; what kind of
  place it is, its name and the sentence that says so; a country's capital,
  population and area; the one main action, its constitution, else its law.
- **Two columns below**: what a reader came to do (the law that applies, its
  budget, the places inside it, tax, what a resident can do, the record) and,
  beside it, the place at a glance: the facts the hero does not carry, how its
  law is changed, where the facts come from. On a phone the glance comes first,
  in two columns.
- **The places inside it** are tiles, the same tile as the world's countries,
  when most of them have a photograph; a list otherwise, and always a list
  past 120.
- **The world index** opens on the Earth and groups every place by what it
  does, the UN's members first.
- **Below the law, three sections a reader acts on**, each shown only where
  Solon holds it, never filled in:
  - *Measured* (`src/lib/config/places/profile-figures.ts`): a few figures,
    chosen in config. What the state takes and spends (OECD where the country
    reports to it; the World Bank's government consumption, under its own
    label, elsewhere), how it is governed (four of the World Bank's governance
    indicators), how safe it is (homicides). Each shows the latest value and
    year, where it stands among the countries reporting that year (left out
    below 20 of them; the ends said as "highest" and "lowest"), its last 15
    years as a sparkline, and its series and source. Chartkit's meter and
    sparkline; nothing drawn by hand.
  - *How its law is changed*: the official routes of every authority from the
    place up (commune, canton, country), the same card an act's page shows.
  - *What changed lately*: the acts of those authorities whose current text
    took effect in the past twelve months by the publisher's own date (a copy
    dated the day Solon read it says nothing about when the law changed),
    newest first, with how many there were.

## The map

`/places` gains a switch: **All places** or **Beyond the UN**. Beyond the UN
shades the places that govern themselves, marks with a dot the places the
outlines do not draw (proclaimed states, special jurisdictions, Abkhazia,
South Ossetia, Transnistria), and lists every one of them by kind, each
linking to its page. The list is also the way in on a phone, where a dot is
too small to tap.

## Next

- Each proclaimed state's and special jurisdiction's own law, through the
  plan (Liberland's laws are in `liberland/laws`).
- Seasteads at sea, as data, once one governs anything: a point, a kind and
  the law it publishes.
- Statistics and budgets on the profile, where Solon holds them.
