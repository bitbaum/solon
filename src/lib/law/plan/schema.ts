/**
 * The plan for the law of every country (design:
 * docs/design/2026-11-law-of-every-country.md), as data in
 * data/law/plan.json: for each country, what Solon should hold (its
 * constitution in force, its national law) and where the words can be read.
 *
 * Two kinds of field. What `pnpm run law:plan seed` finds is replaced on every
 * seed: the constitution in force by Constitute's index, and the candidate
 * copies Wikidata lists. What a person decides is kept: the source chosen, a
 * note, the readers that hold the national law. How far each country has got
 * is never written here: `pnpm run law:plan status` counts it from the
 * database, so the plan cannot claim more than Solon holds.
 */
import { z } from "zod";

export const SOURCE_KINDS = ["official", "wikisource", "copy"] as const;

const candidate = z.object({
  /** official: an address Wikidata gives as where the work is published; wikisource: a Wikisource page. */
  kind: z.enum(SOURCE_KINDS),
  url: z.string().url(),
  /** The language of the words at that address (BCP 47 primary tag), when known. */
  lang: z.string().nullable(),
  /** The Wikidata item that pointed to it. */
  wikidata: z
    .string()
    .regex(/^Q\d+$/)
    .nullable(),
  /** The item's year of inception, to match it to the constitution in force. */
  year: z.number().int().nullable(),
  /** Wikidata says the item ended or was replaced: a constitution no longer in force. */
  ended: z.boolean().default(false),
});
export type Candidate = z.infer<typeof candidate>;

const chosen = z.object({
  kind: z.enum(SOURCE_KINDS),
  url: z.string().url(),
  lang: z.string(),
  /** The act's title in its own language; a Wikisource page's title stands in when absent. */
  title: z.string().optional(),
  /** Who chose it: the seed's rule, or a person. */
  by: z.enum(["rule", "person"]),
  /** Why, in a sentence, when a person chose it. */
  why: z.string().optional(),
});
export type ChosenSource = z.infer<typeof chosen>;

const country = z.object({
  /** Key in LAW_AUTHORITIES. */
  authority: z.string(),
  /**
   * Why the words of this country's law may be copied: the provision of its own law that puts
   * official texts outside copyright, read from a source opened on `readOn`, and the licence
   * entry (src/lib/config/places/licences.ts) it stands for. No text is stored without it.
   */
  copyright: z
    .object({ spdx: z.string(), basis: z.string(), url: z.string().url(), readOn: z.string() })
    .nullable()
    .default(null),
  /** Official languages (ISO 639-1), from Wikidata. */
  languages: z.array(z.string()),
  constitution: z.object({
    /** The constitution in force, from Constitute's index; null where it lists none. */
    inForce: z
      .object({
        title: z.string(),
        enacted: z.number().int().nullable(),
        /** The last year the index records an amendment for. */
        amended: z.number().int().nullable(),
        constitute: z.string(),
      })
      .nullable(),
    candidates: z.array(candidate),
    chosen: chosen.nullable(),
    note: z.string().optional(),
  }),
  national: z.object({
    /** Keys of the readers that list the national acts and load their texts, when there are any. */
    register: z.string().nullable(),
    texts: z.string().nullable(),
    /** Where the national law can be read, as far as anyone has looked. */
    candidates: z.array(z.object({ url: z.string().url(), note: z.string() })),
    note: z.string().optional(),
  }),
});
export type CountryPlan = z.infer<typeof country>;

export const lawPlanSchema = z.object({
  seeded: z.string(),
  /** By ISO 3166-1 alpha-2. */
  countries: z.record(z.string().regex(/^[A-Z]{2}$/), country),
});
export type LawPlan = z.infer<typeof lawPlanSchema>;
