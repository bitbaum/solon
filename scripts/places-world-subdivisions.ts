/**
 * Writes the places inside the world pack's countries: every subdivision
 * with an ISO 3166-2 code that Wikidata holds (states, regions, provinces,
 * departments: about five thousand), named in five languages, with its
 * Wikidata item. Each sits under its nearest coded ancestor (a department in
 * its region), else under its country. A country that has a pack of its own is
 * left to that pack.
 *
 *   pnpm run places:world-subdivisions           write data/places/world/subdivisions.json
 *
 * Reads Wikidata (CC0): P300, the ISO 3166-2 code, where its statement is
 * neither ended nor deprecated; a code two items carry
 * goes to the one with more Wikipedia articles; an item marked dissolved
 * (P576) or with no English name is left out, and so is a place that has a
 * page of its own in the world list (config: SUBDIVISIONS_WITH_OWN_PAGE, and
 * any item that is itself a world entry). The country is
 * the code's first two letters, so nothing is taken from Wikidata's own idea
 * of which state a place belongs to.
 *
 * Imported by the `world-subdivisions` source
 * (src/lib/config/places/sources.ts); merged by pull request, then imported
 * after the deploy like every file under data/places.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { COUNTRY_PACKS } from "@/lib/config/places/countries";
import { SUBDIVISIONS_WITH_OWN_PAGE } from "@/lib/config/places/world";
import { COUNTRIES } from "@/lib/config/world/countries";
import { WORLD_PROFILES_FILE } from "@/lib/config/world/kinds";
import { nestPlaces } from "@/lib/places/nesting";
import { itemOf, sparql } from "@/lib/wikidata/query";

const LOCALES = ["en", "de", "fr", "it", "ru"] as const;
const FILE = join(process.cwd(), "data/places/world/subdivisions.json");
const CODE = /^([A-Z]{2})-[A-Z0-9]{1,3}$/;
/** The world pack's tiers below a country (src/lib/config/places/countries/world.ts). */
const TIERS = ["subdivision", "subdivision_2", "subdivision_3"] as const;

async function main() {
  const held = new Set(
    COUNTRY_PACKS.flatMap((p) => (p.key !== "world" && p.region ? [p.region] : [])),
  );
  const countries = new Set(COUNTRIES.filter((c) => !held.has(c.a2)).map((c) => c.a2));

  const rows = await sparql(
    // The code's own statement, so one Wikidata marks as ended (P582) or deprecated is left out.
    `SELECT ?i ?code ?links WHERE { ?i p:P300 ?s . ?s ps:P300 ?code . ?s wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank) FILTER NOT EXISTS { ?s pq:P582 ?ended } ?i wikibase:sitelinks ?links . FILTER NOT EXISTS { ?i wdt:P576 ?end } }`,
  );
  // A place with its own page in the world list is not also a subdivision.
  const profiles = JSON.parse(readFileSync(join(process.cwd(), WORLD_PROFILES_FILE), "utf8")) as {
    places: Record<string, { wikidata: string }>;
  };
  const worldItems = new Set(Object.values(profiles.places).map((p) => p.wikidata));
  const byCode = new Map<string, { item: string; links: number }>();
  for (const r of rows) {
    const country = CODE.exec(r.code!)?.[1];
    if (!country || !countries.has(country)) continue;
    if (worldItems.has(itemOf(r.i!)) || r.code! in SUBDIVISIONS_WITH_OWN_PAGE) continue;
    const candidate = { item: itemOf(r.i!), links: Number(r.links ?? 0) };
    const have = byCode.get(r.code!);
    if (!have || candidate.links > have.links) byCode.set(r.code!, candidate);
  }

  // Names, a few hundred items a query: the label service times out on all of them at once.
  const items = [...new Set([...byCode.values()].map((v) => v.item))];
  const names = new Map<string, Partial<Record<(typeof LOCALES)[number], string>>>();
  for (let i = 0; i < items.length; i += 250) {
    const labels = await sparql(
      `SELECT ?i ?l (LANG(?l) AS ?lang) WHERE { VALUES ?i { ${items
        .slice(i, i + 250)
        .map((q) => `wd:${q}`)
        .join(
          " ",
        )} } ?i rdfs:label ?l . FILTER(LANG(?l) IN (${LOCALES.map((l) => `"${l}"`).join(", ")})) }`,
    );
    for (const r of labels) {
      const item = itemOf(r.i!);
      names.set(item, { ...names.get(item), [r.lang as (typeof LOCALES)[number]]: r.l! });
    }
    console.error(`names ${Math.min(i + 250, items.length)}/${items.length}`);
  }

  // One item, one place: where two codes still name the same item, the first by code is kept
  // and the other reported, to be settled on Wikidata.
  const taken = new Map<string, string>();
  for (const code of [...byCode.keys()].sort()) {
    const { item } = byCode.get(code)!;
    const first = taken.get(item);
    if (first) {
      console.error(`${code} names the same item as ${first} (${item}): left out`);
      byCode.delete(code);
    } else taken.set(item, code);
  }
  // Where each sits: its nearest ancestor that also carries a code of the same country, by
  // "located in" (P131) followed any number of steps (a French department in its region, a
  // Spanish province in its autonomous community); none, and it sits under the country. Only a
  // place with an English name is kept (its path is built from it); one whose parent was not
  // kept sits under its next kept ancestor.
  const codeOf = new Map([...byCode].map(([code, v]) => [v.item, code]));
  const ancestors = new Map<string, Set<string>>();
  for (const r of await sparql(
    `SELECT ?i ?a WHERE { ?i wdt:P300 ?c . ?i wdt:P131+ ?a . ?a wdt:P300 ?ac . FILTER(?a != ?i) }`,
  )) {
    const code = codeOf.get(itemOf(r.i!));
    const above = codeOf.get(itemOf(r.a!));
    if (!code || !above || above.slice(0, 2) !== code.slice(0, 2)) continue;
    ancestors.set(code, (ancestors.get(code) ?? new Set()).add(above));
  }
  const kept = new Set([...byCode].filter(([, v]) => names.get(v.item)?.en).map(([c]) => c));
  const { parentOf, tierOf } = nestPlaces(kept, ancestors, TIERS.length);

  const codes = [...kept].sort();
  const jurisdictions = codes.map((code) => {
    const { item } = byCode.get(code)!;
    const own = names.get(item)!;
    // English first: the path segment is built from the first name.
    const list = LOCALES.flatMap((locale) =>
      own[locale] ? [{ locale, name: own[locale], nameType: "common" }] : [],
    );
    return {
      ref: { scheme: "iso_3166_2", value: code },
      levelKey: TIERS[tierOf(code)]!,
      names: list,
      identifiers: [{ scheme: "wikidata", value: item }],
    };
  });
  const relations = jurisdictions.map((j) => {
    const parent = parentOf.get(j.ref.value);
    return {
      from: j.ref,
      to: parent
        ? { scheme: "iso_3166_2", value: parent }
        : { scheme: "iso_3166_1", value: j.ref.value.slice(0, 2) },
      relation: "part_of",
    };
  });

  mkdirSync(dirname(FILE), { recursive: true });
  // One place a line: five thousand places, and a rerun's diff shows what changed.
  const lines = (rows: unknown[]) => rows.map((r) => `    ${JSON.stringify(r)}`).join(",\n");
  writeFileSync(
    FILE,
    `{\n  "pack": "world",\n  "jurisdictions": [\n${lines(jurisdictions)}\n  ],\n  "relations": [\n${lines(relations)}\n  ]\n}\n`,
  );
  const perCountry = new Set(jurisdictions.map((j) => j.ref.value.slice(0, 2))).size;
  const lower = jurisdictions.filter((j) => j.levelKey !== "subdivision").length;
  console.log(
    `${jurisdictions.length} subdivisions of ${perCountry} countries written (${lower} inside another)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
