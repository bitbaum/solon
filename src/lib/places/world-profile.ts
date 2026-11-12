/**
 * A place's profile for its page: what kind of place it is, its facts from
 * Wikidata with the day they were read, and the way into its law. Read on the
 * server only (data/world/profiles.json is half a megabyte); the map reads the
 * small extras file instead.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { routesFor } from "@/lib/config/law/routes";
import { countryAuthority } from "@/lib/law/places";
import type { WorldRegion } from "@/lib/config/world";
import {
  FACT_OVERRIDES,
  type FactOverride,
  type OverriddenFact,
  type OverrideValues,
} from "@/lib/config/world/overrides";
import { WORLD_PROFILES_FILE, kindOf, type PlaceKind } from "@/lib/config/world/kinds";
import type { Database } from "@/lib/db/client";
import { rowsOf } from "@/lib/db/rows";
import { actTitleSql } from "@/lib/law/act-title";

type Texts = Readonly<Record<string, string>>;

interface StoredProfile {
  wikidata: string;
  names: Texts;
  description: Texts;
  capital: Texts[];
  government: Texts[];
  headOfState: Texts[];
  headOfGovernment: Texts[];
  population: { value: number; year: number | null } | null;
  areaKm2: number | null;
  languages: string[];
  currencies: string[];
  inception: string | null;
  website: string | null;
  point: [number, number] | null;
  country: string | null;
  wikipedias: number;
}

interface ProfilesFile {
  read: string;
  un: Record<string, string>;
  places: Record<string, StoredProfile>;
}

let cached: ProfilesFile | null = null;
function profiles(): ProfilesFile {
  cached ??= JSON.parse(
    readFileSync(join(process.cwd(), WORLD_PROFILES_FILE), "utf8"),
  ) as ProfilesFile;
  return cached;
}

export interface ProfileFact {
  key:
    | "capital"
    | "population"
    | "area"
    | "languages"
    | "currency"
    | "government"
    | "headOfState"
    | "headOfGovernment"
    | "founded"
    | "unSince"
    | "website";
  value: string;
  href?: string;
  /** Set when the value is Solon's own, from the place's law, and not Wikidata's. */
  source?: { title: string; url: string };
}

/**
 * Pure: a fact of a place, the cited override when there is one, else
 * Wikidata's (which may be null). Works the same for every fact and place.
 */
export function applyOverrides<F extends OverriddenFact>(
  place: string,
  fact: F,
  wikidata: OverrideValues[F] | null,
  overrides: readonly FactOverride[] = FACT_OVERRIDES,
): { value: OverrideValues[F] | null; source?: FactOverride["source"] } {
  const hit = overrides.find((o) => o.place === place && o.fact === fact);
  return hit ? { value: hit.value as OverrideValues[F], source: hit.source } : { value: wikidata };
}

export interface WorldProfileView {
  kind: PlaceKind;
  /** The UN's day of admission, for a member. */
  unSince: string | null;
  /** The country it lies in or belongs to, by name, when it is not itself. */
  within: { name: string; slug: string | null } | null;
  /** Wikidata's one-line description, in the reader's language, for a place beyond the ISO list. */
  description: string | null;
  facts: ProfileFact[];
  read: string;
  wikidata: string;
  /** Its constitution in Solon, and how many official routes say how its law is changed. */
  constitution: { actId: string; title: string } | null;
  routes: number;
  /** The authority whose law it is, for the link to all of it. */
  authority: string | null;
}

const pick = (texts: Texts | undefined, locale: string) =>
  texts ? (texts[locale] ?? texts.en ?? Object.values(texts)[0] ?? null) : null;

export async function loadWorldProfile(
  db: Database,
  region: WorldRegion,
  locale: string,
  regionBySlugOrCode: (code: string) => WorldRegion | undefined,
  nameOf: (region: WorldRegion) => string,
  overrides: readonly FactOverride[] = FACT_OVERRIDES,
): Promise<WorldProfileView | null> {
  const file = profiles();
  const p = file.places[region.slug];
  if (!p) return null;
  const kind = kindOf(region);
  const number = new Intl.NumberFormat(locale);
  const languages = new Intl.DisplayNames([locale], { type: "language" });
  const currencies = new Intl.DisplayNames([locale], { type: "currency" });
  const date = (iso: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(
      new Date(`${iso}T00:00:00Z`),
    );
  const list = (items: readonly Texts[]) =>
    items
      .map((t) => pick(t, locale))
      .filter(Boolean)
      .join(", ");
  const facts: ProfileFact[] = [];
  const add = (
    key: ProfileFact["key"],
    value: string | null | undefined,
    href?: string,
    source?: FactOverride["source"],
  ) => {
    if (value) facts.push({ key, value, ...(href ? { href } : {}), ...(source ? { source } : {}) });
  };
  // Every fact below is Wikidata's unless a cited override for this place says otherwise.
  const of = <F extends OverriddenFact>(fact: F, wikidata: OverrideValues[F] | null) =>
    applyOverrides(region.slug, fact, wikidata, overrides);
  /** A fact Wikidata gives as names (the capital, who heads the state). */
  const names = (
    key: ProfileFact["key"],
    fact: "capital" | "government" | "headOfState" | "headOfGovernment",
  ) => {
    const cited = applyOverrides(region.slug, fact, null, overrides);
    const value: readonly Texts[] = cited.value ?? p[fact];
    add(key, list(value), undefined, cited.source);
  };

  const unSince = region.code ? (file.un[region.code] ?? null) : null;
  if (unSince) add("unSince", date(unSince));
  names("capital", "capital");
  const population = of("population", p.population);
  if (population.value) {
    const { value, year } = population.value;
    add(
      "population",
      year ? `${number.format(value)} (${year})` : number.format(value),
      undefined,
      population.source,
    );
  }
  const area = of("areaKm2", p.areaKm2);
  if (area.value !== null) add("area", `${number.format(area.value)} km²`, undefined, area.source);
  const spoken = of("languages", p.languages);
  add(
    "languages",
    (spoken.value ?? []).map((l) => languages.of(l) ?? l).join(", "),
    undefined,
    spoken.source,
  );
  const money = of("currencies", p.currencies);
  add(
    "currency",
    (money.value ?? []).map((c) => currencies.of(c) ?? c).join(", "),
    undefined,
    money.source,
  );
  names("government", "government");
  names("headOfState", "headOfState");
  names("headOfGovernment", "headOfGovernment");
  // A state's founding year in Wikidata can be centuries back (Russia: 1263); a state shows its
  // UN admission instead, and only the places beyond it their founding or proclamation.
  const founded = of("inception", p.inception);
  if (kind !== "state" && kind !== "territory" && founded.value)
    add("founded", date(founded.value), undefined, founded.source);
  const website = of("website", p.website);
  if (website.value)
    add(
      "website",
      new URL(website.value).hostname.replace(/^www\./, ""),
      website.value,
      website.source,
    );

  const within =
    p.country && p.country !== region.code
      ? (() => {
          const r = regionBySlugOrCode(p.country!);
          return r ? { name: nameOf(r), slug: r.slug } : null;
        })()
      : null;

  // A country's authority by its code; a place beyond the ISO list's by its slug.
  const authority = region.code
    ? (countryAuthority(region.code)?.key ?? null)
    : (LAW_AUTHORITIES.find((a) => a.key === region.slug)?.key ?? null);
  const constitution = authority
    ? (rowsOf<{ id: string; title: string }>(
        await db.execute(sql`
          SELECT * FROM (
            SELECT a.id, ${actTitleSql(sql`a.id`, locale)} AS title FROM legal_acts a
            WHERE a.authority = ${authority} AND a.kind = 'constitution' AND a.in_force
              AND EXISTS (SELECT 1 FROM legal_act_versions v WHERE v.act_id = a.id AND v.in_force_to IS NULL)
          ) c
          WHERE title IS NOT NULL
          LIMIT 1`),
      )[0] ?? null)
    : null;
  const routes = authority
    ? routesFor(authority, "statute").length + routesFor(authority, "constitution").length
    : 0;

  return {
    kind,
    unSince,
    within,
    // Wikidata's descriptions are written by anyone and can judge ("Scheinstaat", sham state, for
    // Liberland in German): a contested place is said in Solon's own neutral sentence alone. Only a
    // special jurisdiction or a project, whose description says what it is, keeps one.
    description: kind === "special" || kind === "project" ? pick(p.description, locale) : null,
    facts,
    read: file.read,
    wikidata: p.wikidata,
    constitution: constitution ? { actId: constitution.id, title: constitution.title } : null,
    routes,
    authority,
  };
}
