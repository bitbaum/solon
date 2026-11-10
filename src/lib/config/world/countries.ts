/**
 * The country registry: the one list of countries every part of Solon reads.
 * A country is its ISO 3166-1 alpha-2 code; its alpha-3 and numeric codes, a
 * point to label it at and its importance on a map come from here and from
 * nowhere else. Its name is the reader's language's (Intl.DisplayNames on the
 * alpha-2), so no list of names is kept either.
 *
 * Generated from Natural Earth 1:10m admin 0 (public domain) by
 * `pnpm run geography:world`; never edited by hand. A country Natural Earth
 * gives no ISO numeric code (Kosovo) has none here, and cannot be drawn by
 * the world outlines, which are keyed by it.
 *
 * Who uses it: the law globe (an authority's country to its outline), the
 * statistics map (a place's code to its outline), the OECD sources (a
 * country's alpha-3 for the SDMX key) and the atlas's country names.
 */
import { z } from "zod";
import data from "./countries.json";

const countrySchema = z.object({
  a2: z.string().regex(/^[A-Z]{2}$/),
  a3: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
  n3: z
    .string()
    .regex(/^\d{3}$/)
    .nullable(),
  /** Natural Earth's English name, for logs and scripts; pages name a country with Intl. */
  name: z.string().min(1),
  at: z.tuple([z.number(), z.number()]),
  rank: z.number(),
  z: z.number(),
});
export type Country = z.infer<typeof countrySchema>;

function load(): readonly Country[] {
  const countries = z.array(countrySchema).parse(data.countries);
  for (const key of ["a2", "a3", "n3"] as const) {
    const seen = new Set<string>();
    for (const c of countries) {
      const v = c[key];
      if (v === null) continue;
      if (seen.has(v)) throw new Error(`country registry: ${key} ${v} twice`);
      seen.add(v);
    }
  }
  return countries;
}

export const COUNTRIES: readonly Country[] = load();
const byA2 = new Map(COUNTRIES.map((c) => [c.a2, c]));

export const countryOf = (a2: string): Country | undefined => byA2.get(a2.toUpperCase());

/** A country's ISO 3166-1 alpha-3 code, or a thrown error naming the code that is missing. */
export function alpha3Of(a2: string): string {
  const a3 = countryOf(a2)?.a3;
  if (!a3) throw new Error(`country registry: no alpha-3 code for ${a2}`);
  return a3;
}

/** A country's ISO 3166-1 numeric code (what the world outlines are keyed by), or null. */
export const numericOf = (a2: string): string | null => countryOf(a2)?.n3 ?? null;
