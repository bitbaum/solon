# How Swiss communes publish their law (survey, 2026-11-01)

Why: Solon holds the law of the Confederation, the 26 cantons and (partly) Liechtenstein,
but of Switzerland's Gemeinden only the City of Zürich. This survey asks, canton by canton,
where communes publish their own acts, so that readers are built for platforms first and
for single towns second. Everything below was read on 2026-11-01 by research agents that
reported only what they opened; "not opened" marks the rest. It is a starting point, not a
register of facts: a claim here needs its URL opened again before an adapter relies on it.

## The size of it

The Federal Statistical Office's municipality directory (snapshot of 2026-11-01,
agvchapp.bfs.admin.ch, level 3) lists 2,110 communes in 26 cantons. Per-canton counts in the
survey notes differ from one source to the next (Wikipedia, cantonal pages, the BFS file), so
they are not repeated here; use the BFS file when a count matters.

## Findings

1. **No canton hosts its communes' law centrally**, with one exception: Basel-Stadt's
   Gesetzessammlung (gesetzessammlung.bs.ch, LexWork) also carries the acts of Basel, Riehen
   and Bettingen. LexFind, which Solon uses for the cantons, was not found to carry communal
   law in any canton (inferred from its documentation and help text; its search API was not
   queried).
2. **Basel-Landschaft** publishes every commune's Reglemente on one cantonal CMS
   (baselland.ch, one URL template, 86 communes). It answered the survey with a Cloudflare
   challenge, which was reported as blocked and not worked around. Access has to be asked of
   the Landeskanzlei.
3. **Two platforms span many communes**, each on separate domains:
   - **LexWork by Sitrox**, one subdomain per commune (name.tlex.ch), the product that also
     runs the cantonal collections. Each instance has a systematic collection, dated
     versions and a PDF per version. robots.txt blocks only the search endpoints. Instances
     found so far (a lower bound): Zug, Baar, Cham and the other Zug communes (11 of 11),
     Glarus, Glarus Nord and Glarus Süd (3 of 3), Stadt Luzern, Neuenkirch, Biel, Delémont,
     Stadt Solothurn, Winterthur, Kloten, Frauenfeld, Bischofszell, Sirnach, St. Gallen,
     Rapperswil-Jona, Uznach, Weesen. A JSON interface sits behind the Angular app; its
     routes were not found at the addresses tried, and whether it is open to read is not yet
     known. No customer list is published; Sitrox would have to supply one.
   - **i-web.ch Gemeinde CMS** (Innovative Web AG): communes on their own domains with the
     same /reglemente-style page and filter form (Stichwort, Gültig am, Nummer, Art), where
     the list is rendered by JavaScript. Estimated from homepages, not verified: about 50 of
     the 160 communes of Luzern, Uri, Schwyz, Obwalden, Nidwalden, Zug and Glarus, and
     communes in Fribourg (Bulle), Solothurn (Olten, Grenchen) and elsewhere. A vendor claim
     of more than 650 communes was seen in a search snippet only.
4. **Single-page lists that are easy to read**: Lausanne (193 acts, dated, with status),
   Ville de Genève (251 acts over about 26 pages), Bellinzona, Lugano, Thun (dated and
   versioned), Chur (dated), Altdorf, Schattdorf, Köniz, Neuchâtel, Olten, Grenchen. The
   rest of the 2,110 communes publish PDF lists on their own sites in many layouts.
5. **Obstacles** (reported, not worked around): the Basel-Landschaft challenge; vs.ch
   disallows its PDFs in robots.txt (Valais homologation decisions); the cantonal Ticino
   hosts (ti.ch) were unreachable; many commune hosts reset the connection from the
   research sandbox, which may be a network fault and not a bot check.
6. **Some cantons oblige communes to publish online** (Zürich by the Gemeindegesetz from
   2022, Fribourg by art. 42b RELCo), which makes a crawl legitimate, but neither names a
   central register.

## What to build, in this order

1. A LexWork (tlex) reader: one adapter, dated versions, around thirty communes at once and
   more once Sitrox says who its customers are.
2. An i-web reader, after tracing the JavaScript list endpoint of one commune.
3. Readers for the largest single lists (Lausanne, Genève, Bellinzona, Lugano, Chur, Thun,
   Bern's stadtrecht).
4. A polite generic finder for the long tail: locate a commune's Reglemente page, list the
   PDFs, read them with the existing PDF and OCR path, keep each act's source address.
5. Ask, in writing, the Basel-Landschaft Landeskanzlei for access, and Sitrox and Innovative
   Web AG for their customer lists and for permission to read.

## Not verified

The exact number of communes per canton; the i-web commune counts; whether the tlex JSON
interface is open; whether LexFind lists communal law (inferred only); every figure marked
"estimated" above.
