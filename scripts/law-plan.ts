/**
 * The plan for the law of every country (docs/design/2026-11-law-of-every-country.md).
 *
 *   pnpm run law:plan seed     read Constitute's index and Wikidata, write data/law/plan.json,
 *                              keeping every choice and note a person made
 *   pnpm run law:plan status [--json] [--country RU,UA]
 *                              how far each country has got, counted from the database,
 *                              and its next step
 */
import { writeFileSync } from "node:fs";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { WORLD } from "@/lib/config/world";
import { countryOf } from "@/lib/config/world/countries";
import { PLAN_FILE, loadPlanCounts, readPlan } from "@/lib/law/plan/load";
import type { Candidate, LawPlan } from "@/lib/law/plan/schema";
import { lawPlanSchema } from "@/lib/law/plan/schema";
import { inForceByCountry, mergeSeed, nameKey, type ConstituteEntry } from "@/lib/law/plan/seed";
import { planStatus, planTotals } from "@/lib/law/plan/status";

const USER_AGENT = "Solon law reader (solon.orangecat.ch)";
const CONSTITUTE_INDEX = "https://www.constituteproject.org/service/constitutions";
const WIKIDATA = "https://query.wikidata.org/sparql";

/** Readers Solon already has for a country's national law, by the plan's field. */
const NATIONAL_READERS = new Map([
  ["CH", { register: "lexfind", texts: "fedlex" }],
  ["LI", { register: "li-systematic", texts: "lilex" }],
  ["LU", { register: "legilux", texts: "legilux" }],
  ["EE", { register: "riigiteataja", texts: "riigiteataja" }],
  ["AT", { register: "ris", texts: "ris" }],
  ["DE", { register: "gii", texts: "gii" }],
  ["GB", { register: "ukleg", texts: "ukleg" }],
  ["RU", { register: "pravo-gov-ru", texts: null }],
]);

async function sparql<T>(query: string): Promise<T[]> {
  const url = `${WIKIDATA}?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { accept: "application/sparql-results+json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Wikidata: HTTP ${response.status}`);
  const body = (await response.json()) as {
    results: { bindings: Record<string, { value: string }>[] };
  };
  return body.results.bindings.map(
    (b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])) as T,
  );
}

async function seed(): Promise<number> {
  const index = (await (
    await fetch(CONSTITUTE_INDEX, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(60_000),
    })
  ).json()) as ConstituteEntry[];

  const english = new Intl.DisplayNames(["en"], { type: "region" });
  const namesByKey = new Map<string, string>();
  for (const r of WORLD) {
    if (!r.code) continue;
    for (const name of [english.of(r.code), countryOf(r.code)?.name, r.slug]) {
      if (name) namesByKey.set(nameKey(name), r.code);
    }
  }
  const { found: inForce, unmatched } = inForceByCountry(index, namesByKey);
  if (unmatched.length) console.error(`Constitute countries not matched: ${unmatched.join(", ")}`);

  // ISO 639-1 where the language has one, else the primary subtag of its IETF tag (Standard Chinese: zh).
  const languages = await sparql<{ iso: string; code: string }>(`
    SELECT DISTINCT ?iso ?code WHERE {
      ?c wdt:P297 ?iso ; wdt:P37 ?l .
      OPTIONAL { ?l wdt:P218 ?a }
      OPTIONAL { ?l wdt:P305 ?tag }
      BIND(COALESCE(?a, REPLACE(STR(?tag), "-.*$", "")) AS ?code)
      FILTER(BOUND(?code) && STRLEN(?code) >= 2 && STRLEN(?code) <= 3)
    }`);
  const constitutions = await sparql<{
    iso: string;
    con: string;
    url?: string;
    ws?: string;
    year?: string;
    ended?: string;
  }>(`
    SELECT DISTINCT ?iso ?con ?url ?ws ?year ?ended WHERE {
      ?c wdt:P297 ?iso .
      ?con wdt:P31/wdt:P279* wd:Q7755 ; wdt:P1001 ?c .
      OPTIONAL { ?con wdt:P953 ?url }
      OPTIONAL { ?ws schema:about ?con ; schema:isPartOf ?site . FILTER(CONTAINS(STR(?site), ".wikisource.org")) }
      OPTIONAL { ?con wdt:P571 ?inception . BIND(YEAR(?inception) AS ?year) }
      BIND(EXISTS { { ?con wdt:P576 ?x } UNION { ?con wdt:P582 ?y } UNION { ?con wdt:P1366 ?z } } AS ?ended)
    }`);

  const langsOf = new Map<string, string[]>();
  for (const l of languages) langsOf.set(l.iso, [...(langsOf.get(l.iso) ?? []), l.code]);
  const candidatesOf = new Map<string, Candidate[]>();
  for (const c of constitutions) {
    const list = candidatesOf.get(c.iso) ?? [];
    const wikidata = c.con.replace(/^.*\//, "");
    const year = c.year ? Number(c.year) : null;
    const ended = c.ended === "true";
    const add = (candidate: Candidate) => {
      if (!list.some((x) => x.url === candidate.url)) list.push(candidate);
    };
    if (c.url) add({ kind: "official", url: c.url, lang: null, wikidata, year, ended });
    if (c.ws) {
      const lang = new URL(c.ws).hostname.split(".")[0] ?? null;
      add({ kind: "wikisource", url: c.ws, lang, wikidata, year, ended });
    }
    candidatesOf.set(c.iso, list);
  }

  const found = new Map<
    string,
    Parameters<typeof mergeSeed>[1] extends ReadonlyMap<string, infer V> ? V : never
  >();
  for (const a of LAW_AUTHORITIES) {
    if (a.place?.scheme !== "iso_3166_1") continue;
    const iso = a.place.value;
    found.set(iso, {
      authority: a.key,
      languages: [...new Set(langsOf.get(iso) ?? [])].sort(),
      inForce: inForce.get(iso) ?? null,
      candidates: (candidatesOf.get(iso) ?? []).sort((x, y) => x.url.localeCompare(y.url)),
    });
  }
  let previous: LawPlan | null = null;
  try {
    previous = readPlan();
  } catch {
    previous = null;
  }
  const plan = lawPlanSchema.parse(
    mergeSeed(previous, found, new Date().toISOString().slice(0, 10), NATIONAL_READERS),
  );
  writeFileSync(PLAN_FILE, `${JSON.stringify(plan, null, 2)}\n`);
  const chosen = Object.values(plan.countries).filter((c) => c.constitution.chosen).length;
  console.log(
    `${Object.keys(plan.countries).length} countries; ${inForce.size} with a constitution in Constitute's index; ${chosen} with a source chosen`,
  );
  return 0;
}

async function status(): Promise<number> {
  const { db } = await import("@/lib/db/client");
  const plan = readPlan();
  const only = process.argv.includes("--country")
    ? process.argv[process.argv.indexOf("--country") + 1]?.split(",")
    : undefined;
  const rows = planStatus(plan, await loadPlanCounts(db)).filter(
    (r) => !only || only.includes(r.iso),
  );
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ totals: planTotals(rows), rows }, null, 2));
    return 0;
  }
  for (const r of rows) {
    console.log(
      `${r.iso}  ${r.authority.padEnd(6)} constitution ${r.constitution.padEnd(6)} national ${r.national.padEnd(6)} (${r.nationalWithText}/${r.nationalActs})  next: ${r.next}`,
    );
  }
  console.log(JSON.stringify(planTotals(rows)));
  return 0;
}

const command = process.argv[2] ?? "status";
(command === "seed" ? seed() : status())
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
