/**
 * Every place's profile, written to data/world/profiles.json:
 *
 *   pnpm run world:profiles
 *
 * - The United Nations' member states and their day of admission, from
 *   un.org's list (each entry carries its ISO code in its flag's class).
 * - For every place of the world list and every extra (src/lib/config/world/extras.ts):
 *   its Wikidata facts (CC0): names, capital, population and its year, area,
 *   official languages, currency, form of government, heads of state and
 *   government, the day it was founded or proclaimed, its website, a point to
 *   mark it by, and the country it lies in.
 * - The proclaimed states the rule in extras.ts picks.
 *
 * Facts change; the file records the day they were read, and the page says so.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { WORLD } from "@/lib/config/world";
import { EXTRA_PLACES } from "@/lib/config/world/kinds";
import {
  NAMED_EXTRAS,
  PROCLAIMED_MIN_WIKIPEDIAS,
  SELF_GOVERNING_ITEMS,
} from "@/lib/config/world/extras";
import { sparql } from "@/lib/wikidata/query";

const UA = "SolonLawReader/1.0 (https://solon.orangecat.ch; world profiles)";
const LANGS = ["en", "de", "fr", "it", "ru"] as const;
const OUT = join(process.cwd(), "data", "world", "profiles.json");
const EXTRAS_OUT = join(process.cwd(), "src", "lib", "config", "world", "extras.json");

type Row = Record<string, string | undefined>;

const q = (uri: string | undefined) => uri?.replace(/^.*\//, "");

async function unMembers(): Promise<Record<string, string>> {
  const response = await fetch("https://www.un.org/en/about-us/member-states", {
    headers: { "user-agent": `Mozilla/5.0 (compatible; ${UA})` },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`un.org: HTTP ${response.status}`);
  const html = await response.text();
  const out: Record<string, string> = {};
  for (const m of html.matchAll(
    /flags flags-([a-z]{2})\b[\s\S]*?Date of Admission: (\d\d)-(\d\d)-(\d{4})/g,
  )) {
    out[m[1]!.toUpperCase()] = `${m[4]}-${m[3]}-${m[2]}`;
  }
  if (Object.keys(out).length < 190) {
    throw new Error(`un.org: only ${Object.keys(out).length} members read`);
  }
  return out;
}

async function main() {
  const read = new Date().toISOString().slice(0, 10);
  const un = await unMembers();
  console.error(`UN: ${Object.keys(un).length} members`);

  // Items: ISO places by their code; the self-governing places without one; the extras; the proclaimed.
  const isoRows = await sparql(`
    SELECT ?iso ?c ?links WHERE {
      ?c wdt:P297 ?iso ; wikibase:sitelinks ?links .
      FILTER NOT EXISTS { ?c wdt:P576 ?end }
    }`);
  const byIso = new Map<string, { item: string; links: number }>();
  for (const r of isoRows) {
    const prev = byIso.get(r.iso!);
    const links = Number(r.links);
    if (!prev || links > prev.links) byIso.set(r.iso!, { item: q(r.c)!, links });
  }
  const proclaimed = await sparql(`
    SELECT DISTINCT ?i ?links WHERE {
      ?i wdt:P31/wdt:P279* wd:Q188443 ; wikibase:sitelinks ?links .
      FILTER NOT EXISTS { ?i wdt:P576 ?end }
      FILTER(?links >= ${PROCLAIMED_MIN_WIKIPEDIAS})
    } ORDER BY DESC(?links)`);

  const entries: { slug: string; item: string; kind: string | null; code: string | null }[] = [];
  // The world list includes the extras read last time; they are found again by their own rule below.
  const extraSlugs = new Set(EXTRA_PLACES.map((p) => p.slug));
  for (const w of WORLD.filter((r) => !extraSlugs.has(r.slug))) {
    const item = w.code
      ? byIso.get(w.code)?.item
      : (SELF_GOVERNING_ITEMS[w.slug] ?? q(w.ref?.value));
    if (item) entries.push({ slug: w.slug, item, kind: null, code: w.code ?? null });
    else console.error(`no Wikidata item for ${w.slug}`);
  }
  for (const x of NAMED_EXTRAS)
    entries.push({ slug: x.slug, item: x.wikidata, kind: x.kind, code: null });
  const taken = new Set(entries.map((e) => e.item));
  const proclaimedItems = proclaimed.map((r) => q(r.i)!).filter((i) => !taken.has(i));

  // Facts, in chunks the query service answers within its limit.
  const items = [...entries.map((e) => e.item), ...proclaimedItems];
  const facts = new Map<string, Row[]>();
  for (let i = 0; i < items.length; i += 40) {
    const chunk = items
      .slice(i, i + 40)
      .map((x) => `wd:${x}`)
      .join(" ");
    const rows = await sparql(`
      SELECT ?i ?prop ?value ?valueLang ?extra WHERE {
        VALUES ?i { ${chunk} }
        {
          ?i rdfs:label ?value . BIND("label" AS ?prop) BIND(LANG(?value) AS ?valueLang)
          FILTER(LANG(?value) IN (${LANGS.map((l) => `"${l}"`).join(",")}))
        } UNION {
          ?i schema:description ?value . BIND("description" AS ?prop) BIND(LANG(?value) AS ?valueLang)
          FILTER(LANG(?value) IN (${LANGS.map((l) => `"${l}"`).join(",")}))
        } UNION {
          VALUES (?p ?prop) { (wdt:P36 "capital") (wdt:P122 "government") (wdt:P35 "headOfState") (wdt:P6 "headOfGovernment") }
          ?i ?p ?o . ?o rdfs:label ?value . BIND(LANG(?value) AS ?valueLang)
          FILTER(LANG(?value) IN (${LANGS.map((l) => `"${l}"`).join(",")}))
          BIND(STR(?o) AS ?extra)
        } UNION {
          ?i p:P1082 ?st . ?st wikibase:rank wikibase:PreferredRank ; ps:P1082 ?value .
          OPTIONAL { ?st pq:P585 ?when } BIND("population" AS ?prop) BIND(STR(?when) AS ?extra)
        } UNION {
          ?i p:P1082 ?st . ?st wikibase:rank wikibase:NormalRank ; ps:P1082 ?value .
          FILTER NOT EXISTS { ?i p:P1082/wikibase:rank wikibase:PreferredRank }
          OPTIONAL { ?st pq:P585 ?when } BIND("population" AS ?prop) BIND(STR(?when) AS ?extra)
        } UNION {
          ?i p:P2046 ?ast . ?ast wikibase:rank ?arank ; psv:P2046 ?node .
          ?node wikibase:quantityAmount ?value ; wikibase:quantityUnit ?unit .
          FILTER(?unit = wd:Q712226 && ?arank != wikibase:DeprecatedRank)
          BIND("areaKm2" AS ?prop) BIND(STR(?arank) AS ?extra)
        } UNION {
          ?i wdt:P37 ?l . ?l wdt:P218 ?value . BIND("language" AS ?prop)
        } UNION {
          ?i wdt:P38 ?cur . ?cur wdt:P498 ?value . BIND("currency" AS ?prop)
        } UNION {
          ?i wdt:P571 ?value . BIND("inception" AS ?prop)
        } UNION {
          ?i wdt:P856 ?value . BIND("website" AS ?prop)
        } UNION {
          ?i wdt:P625 ?value . BIND("point" AS ?prop)
        } UNION {
          ?i wdt:P17 ?country . ?country wdt:P297 ?value . BIND("country" AS ?prop)
        } UNION {
          ?i wikibase:sitelinks ?value . BIND("links" AS ?prop)
        }
      }`);
    for (const r of rows) facts.set(q(r.i)!, [...(facts.get(q(r.i)!) ?? []), r]);
    console.error(`facts ${Math.min(i + 40, items.length)}/${items.length}`);
  }

  const profileOf = (item: string) => {
    const rows = facts.get(item) ?? [];
    const named = (prop: string) => {
      const byItem = new Map<string, Record<string, string>>();
      for (const r of rows.filter((x) => x.prop === prop)) {
        const key = r.extra ?? "";
        byItem.set(key, { ...(byItem.get(key) ?? {}), [r.valueLang!]: r.value! });
      }
      return [...byItem.values()];
    };
    const one = (prop: string) => rows.find((r) => r.prop === prop)?.value;
    const all = (prop: string) =>
      [...new Set(rows.filter((r) => r.prop === prop).map((r) => r.value!))].sort();
    const texts = (prop: string) =>
      Object.fromEntries(rows.filter((r) => r.prop === prop).map((r) => [r.valueLang!, r.value!]));
    const pops = rows
      .filter((r) => r.prop === "population")
      .map((r) => ({ value: Number(r.value), year: r.extra ? Number(r.extra.slice(0, 4)) : null }))
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    const point = one("point")?.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
    // The preferred figure where Wikidata ranks one; else the smallest, so a claimed territory
    // larger than the one governed (Taiwan's, 11.4 million km²) is never shown as its area.
    const areas = rows.filter((r) => r.prop === "areaKm2");
    const preferred = areas.filter((r) => r.extra?.endsWith("PreferredRank"));
    const area = (preferred.length ? preferred : areas)
      .map((r) => Number(r.value))
      .sort((x, y) => x - y)[0];
    return {
      wikidata: item,
      names: texts("label"),
      description: texts("description"),
      capital: named("capital"),
      government: named("government"),
      headOfState: named("headOfState"),
      headOfGovernment: named("headOfGovernment"),
      population: pops[0] && Number.isFinite(pops[0].value) ? pops[0] : null,
      areaKm2: area !== undefined && Number.isFinite(area) ? Math.round(area * 100) / 100 : null,
      languages: all("language"),
      currencies: all("currency"),
      inception: one("inception")?.slice(0, 10) ?? null,
      website: one("website") ?? null,
      point: point ? [Number(point[1]), Number(point[2])] : null,
      country: all("country")[0] ?? null,
      wikipedias: Number(one("links") ?? 0),
    };
  };

  const places: Record<string, unknown> = {};
  for (const e of entries) places[e.slug] = { ...profileOf(e.item), kind: e.kind };
  const slugOf = (names: Record<string, string>, item: string) =>
    (names.en ?? item)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  for (const item of proclaimedItems) {
    const p = profileOf(item);
    places[slugOf(p.names, item)] = { ...p, kind: "proclaimed" };
  }
  writeFileSync(
    OUT,
    `${JSON.stringify(
      {
        read,
        sources: {
          un: "https://www.un.org/en/about-us/member-states",
          wikidata: "https://query.wikidata.org/ (CC0)",
        },
        proclaimedRule: `Wikidata micronation (Q188443), not dissolved, in at least ${PROCLAIMED_MIN_WIKIPEDIAS} Wikipedias`,
        un,
        places,
      },
      null,
      2,
    )}\n`,
  );
  // The places beyond the ISO list, small enough for the map in the browser: who, what kind, where.
  const extras = Object.entries(
    places as Record<string, ReturnType<typeof profileOf> & { kind: string | null }>,
  )
    .filter(([, p]) => p.kind)
    .map(([slug, p]) => ({
      slug,
      wikidata: p.wikidata,
      kind: p.kind,
      names: p.names,
      // A project's coordinates are an office, not a place it governs: it gets no point.
      point: p.kind === "project" ? null : p.point,
      country: p.country,
    }));
  // A point for each place that governs itself without UN membership, for the map to mark the
  // ones its outlines do not draw (Abkhazia, South Ossetia, Transnistria).
  const points = Object.fromEntries(
    Object.keys(SELF_GOVERNING_ITEMS).flatMap((slug) => {
      const point = (places[slug] as { point: [number, number] | null } | undefined)?.point;
      return point ? [[slug, point]] : [];
    }),
  );
  writeFileSync(
    EXTRAS_OUT,
    `${JSON.stringify({ read, un: Object.keys(un).sort(), points, extras }, null, 2)}\n`,
  );
  console.log(`${Object.keys(places).length} places; ${proclaimedItems.length} proclaimed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
