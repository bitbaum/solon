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
