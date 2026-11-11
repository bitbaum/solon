/**
 * Seeding the plan (./schema.ts): pure, so it is tested on the sources' own
 * answers. What the sources say replaces what they said before; what a person
 * decided stays.
 */
import type { Candidate, ChosenSource, CountryPlan, LawPlan } from "./schema";

/** A country name reduced so two spellings of it compare equal: "Gambia__the" and "The Gambia". */
export function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_\-'’,.()]+/g, " ")
    .replace(/\b(the|of|and|&)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Constitute's names that no list of country names spells the same way, read off its index on
 * 2026-11-10 (each one checked by eye against the country it names).
 */
export const CONSTITUTE_ALIASES: Readonly<Record<string, string>> = {
  Cape_Verde: "CV",
  Congo_the: "CG",
  Cote_d_Ivoire: "CI",
  Czech_Republic_the: "CZ",
  Democratic_People_s_Republic_of_Korea_the: "KP",
  Democratic_Republic_of_the_Congo: "CD",
  Iran_Islamic_Rep_of_: "IR",
  Lao_People_s_Democratic_Republic__the: "LA",
  Micronesia__Fed_States_of_: "FM",
  Republic_of_Korea__the: "KR",
  Republic_of_Moldova: "MD",
  Russian_Federation__the: "RU",
  Swaziland: "SZ",
  The_former_Yugoslav_Republic_of_Macedonia: "MK",
  Timor_Leste: "TL",
  "Timor-Leste": "TL",
  United_Kingdom_of_Great_Britain_and_Northern_Ireland__the: "GB",
  United_Republic_of_Tanzania__the: "TZ",
  United_States_of_America: "US",
  Viet_Nam: "VN",
  Brunei_Darussalam: "BN",
  Palestine: "PS",
  Kosovo: "XK",
  Taiwan: "TW",
  Turkey: "TR",
  Bosnia_and_Herzegovina: "BA",
  Saint_Vincent_and_the_Grenadines: "VC",
  Saint_Kitts_and_Nevis: "KN",
  Sao_Tome_and_Principe: "ST",
};

/** A country of Constitute's index by ISO code, through the aliases, else by name. */
export function isoOfConstitute(
  countryId: string,
  namesByKey: ReadonlyMap<string, string>,
): string | null {
  return CONSTITUTE_ALIASES[countryId] ?? namesByKey.get(nameKey(countryId)) ?? null;
}

export interface ConstituteEntry {
  id: string;
  country_id: string;
  title_long: string;
  in_force: boolean;
  year_enacted: string | null;
  year_updated: string | null;
}

/** The constitution in force per country, from Constitute's index. */
export function inForceByCountry(
  index: readonly ConstituteEntry[],
  namesByKey: ReadonlyMap<string, string>,
): { found: Map<string, CountryPlan["constitution"]["inForce"]>; unmatched: string[] } {
  const found = new Map<string, NonNullable<CountryPlan["constitution"]["inForce"]>>();
  const unmatched: string[] = [];
  const year = (y: string | null) => (y && /^\d{4}$/.test(y) ? Number(y) : null);
  for (const entry of index.filter((e) => e.in_force)) {
    const iso = isoOfConstitute(entry.country_id, namesByKey);
    if (!iso) {
      unmatched.push(entry.country_id);
      continue;
    }
    found.set(iso, {
      title: entry.title_long,
      enacted: year(entry.year_enacted),
      amended: year(entry.year_updated),
      constitute: entry.id,
    });
  }
  return { found, unmatched };
}

/**
 * The rule the seed chooses by, so a choice is never a guess: Wikisource pages in one of the
 * country's official languages, of Wikidata items not marked as ended or replaced, whose year of
 * inception is the year the constitution in force was enacted, or is not recorded and Wikidata
 * gives the item an official address. Exactly one
 * such item: its page in the first official language that has one. Several, and one of them has
 * the year: that one. Otherwise no choice, and the country waits for a person.
 */
export function chooseByRule(plan: CountryPlan): ChosenSource | null {
  const enacted = plan.constitution.inForce?.enacted;
  if (!enacted) return null;
  const pages = plan.constitution.candidates.filter(
    (c) =>
      c.kind === "wikisource" &&
      !c.ended &&
      c.lang !== null &&
      plan.languages.includes(c.lang) &&
      (c.year === null || c.year === enacted),
  );
  // An item with no year counts only where Wikidata also gives it an official address: the
  // constitution a state publishes, not a draft or a party's proposal that shares the label.
  const official = new Set(
    plan.constitution.candidates.filter((c) => c.kind === "official").map((c) => c.wikidata),
  );
  pages.splice(
    0,
    pages.length,
    ...pages.filter((p) => p.year === enacted || official.has(p.wikidata)),
  );
  const items = [...new Set(pages.map((p) => p.wikidata))];
  const dated = [...new Set(pages.filter((p) => p.year === enacted).map((p) => p.wikidata))];
  const item = items.length === 1 ? items[0] : dated.length === 1 ? dated[0] : undefined;
  if (item === undefined) return null;
  for (const lang of plan.languages) {
    const page = pages.find((p) => p.wikidata === item && p.lang === lang);
    if (page) return { kind: "wikisource", url: page.url, lang, by: "rule" };
  }
  return null;
}

/** The plan with what the sources say now, keeping every choice and note a person made. */
export function mergeSeed(
  previous: LawPlan | null,
  found: ReadonlyMap<
    string,
    {
      authority: string;
      languages: string[];
      inForce: CountryPlan["constitution"]["inForce"];
      candidates: Candidate[];
    }
  >,
  seeded: string,
  defaults: ReadonlyMap<string, Pick<CountryPlan["national"], "register" | "texts">> = new Map(),
): LawPlan {
  const countries: LawPlan["countries"] = {};
  for (const [iso, f] of [...found.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const before = previous?.countries[iso];
    const plan: CountryPlan = {
      authority: f.authority,
      copyright: before?.copyright ?? null,
      languages: f.languages,
      constitution: {
        inForce: f.inForce,
        candidates: f.candidates,
        chosen: before?.constitution.chosen?.by === "person" ? before.constitution.chosen : null,
        ...(before?.constitution.note ? { note: before.constitution.note } : {}),
      },
      national: before?.national ?? {
        register: defaults.get(iso)?.register ?? null,
        texts: defaults.get(iso)?.texts ?? null,
        candidates: [],
      },
    };
    plan.constitution.chosen ??= chooseByRule(plan);
    countries[iso] = plan;
  }
  return { seeded, countries };
}
