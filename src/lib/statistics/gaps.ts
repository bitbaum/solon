/**
 * Where what is measured differs between places, and what that leaves unknown.
 * Statistical offices decide what to collect and what to publish, for reasons
 * that are legal, historical, practical or political; the same question can be
 * answerable in one country and not in another. This registry records, per
 * topic and place, what a source that was read says is collected, with which
 * crossings (age, sex …) and under what legal frame, and derives from it where
 * a gap is: a place whose answer to the topic's question is absent while
 * another's is published.
 *
 * It states and proposes; it does not conclude. A gap is not a fault of an
 * office: it may be a law the country chose. A proposal says what would be
 * collected, what question it would answer, what must accompany it so it is
 * not misread, and what the objections and safeguards are. Nothing here
 * characterises an office or the people in a statistic.
 */
import { z } from "zod";
import { localizedTextSchema } from "@/lib/config/places/schema";

export const COVERAGE_STATUSES = [
  /** Collected, and published as figures anyone can read. */
  "published",
  /** Collected, available only to approved researchers or on request. */
  "restricted",
  /** An office could collect it but does not, as far as its own pages say. */
  "not_collected",
  /** The law bars collecting or using the category. */
  "barred_by_law",
] as const;

/** What a breakdown is crossed with, where it is published: the things a fair comparison needs. */
export const CROSSINGS = ["age", "sex", "region", "income", "education", "offence_type"] as const;

const evidenceSchema = z.object({
  publisher: z.string().min(1),
  url: z.url(),
  read: z.iso.date(),
  expect: z.array(z.string().min(1)),
  unchecked: z.literal(true).optional(),
});

/**
 * A place as the place pages identify it: an ISO 3166-1 code where there is one, otherwise the
 * place's Wikidata item (a country with no ISO code, such as South Ossetia).
 */
export const GAP_PLACE_SCHEMES = {
  iso_3166_1: /^[A-Z]{2}$/,
  wikidata: /^Q[0-9]+$/,
} as const;
export const placeSchema = z
  .object({
    scheme: z.enum(["iso_3166_1", "wikidata"]),
    value: z.string(),
  })
  .refine((p) => GAP_PLACE_SCHEMES[p.scheme].test(p.value), {
    message: "the value does not fit the place's identifier scheme",
  });
export type GapPlace = z.infer<typeof placeSchema>;

/** One string for a place: an ISO code as it is, another scheme as `scheme:value`. */
export const placeId = (p: GapPlace): string =>
  p.scheme === "iso_3166_1" ? p.value : `${p.scheme}:${p.value}`;

/**
 * What it would take to collect and publish a measure: a proposal is Solon's own statement of a
 * possibility, signed as such, never a finding about an office or a law. It names who would be
 * asked (an entry of the offices registry) and what must come with the figure so it is not misread.
 */
export const proposalSchema = z.object({
  /** What would be collected and published, in a sentence. */
  collect: localizedTextSchema,
  /** What must accompany it so it is not misread (the topic's companions that apply here). */
  accompany: z.array(localizedTextSchema).default([]),
  /** The office that would be asked, a key of the offices registry. */
  office: z
    .string()
    .regex(/^[a-z0-9_.-]+$/)
    .optional(),
  author: z.string().min(1),
});
export type Proposal = z.infer<typeof proposalSchema>;

/**
 * The institution that is responsible for a place's statistics, and its official channels. Only an
 * institution's own channel is stored (an address, a general e-mail or telephone line a page of the
 * office names as its contact), never a named person; each value must be in the words the cited
 * page is expected to hold, so `statistics:verify` fails when the page stops saying it.
 */
export const OFFICE_CONTACT_KINDS = ["page", "email", "phone", "postal"] as const;
export const officeSchema = z.object({
  key: z.string().regex(/^[a-z0-9_.-]+$/),
  place: placeSchema,
  name: z.string().min(1),
  /** What it is, in the words of its own page (its mandate), only where a page says so. */
  role: localizedTextSchema.optional(),
  contacts: z
    .array(z.object({ kind: z.enum(OFFICE_CONTACT_KINDS), value: z.string().min(1) }))
    .min(1),
  evidence: z.array(evidenceSchema).min(1),
});
export type Office = z.infer<typeof officeSchema>;

export const topicSchema = z.object({
  key: z.string().regex(/^[a-z0-9_.]+$/),
  label: localizedTextSchema,
  /** The question an answer would settle, in a sentence. */
  question: localizedTextSchema,
  /** What the measure is for: the uses that justify collecting it. */
  purposes: z.array(localizedTextSchema).min(1),
  /** The breakdowns a source can offer, from the coarsest to the finest. */
  variants: z
    .array(z.object({ key: z.string().regex(/^[a-z0-9_]+$/), label: localizedTextSchema }))
    .min(1),
  /** What a reader must keep in mind so the figures are not misread. */
  cautions: z.array(localizedTextSchema).min(1),
  /** What could go wrong in collecting or publishing it, and what offices and laws do about it. */
  risks: z.array(z.object({ risk: localizedTextSchema, safeguard: localizedTextSchema })),
  /** What would let an explanation be tested, not only a difference shown. */
  companions: z.array(localizedTextSchema),
  /** What collecting it generally would take, where an office does not yet. */
  proposal: proposalSchema.optional(),
  author: z.string().min(1),
});
export type Topic = z.infer<typeof topicSchema>;

export const coverageSchema = z.object({
  topic: z.string(),
  place: placeSchema,
  /** Which of the topic's variants this line is about. */
  variant: z.string().regex(/^[a-z0-9_]+$/),
  status: z.enum(COVERAGE_STATUSES),
  crossings: z.array(z.enum(CROSSINGS)).default([]),
  publisher: z.string().min(1),
  /** What it collects, in the office's own terms, and how it defines the group. */
  summary: localizedTextSchema,
  /** The legal or policy reason for collecting or not collecting, only where a page says so. */
  frame: localizedTextSchema.optional(),
  /** What about it was not read, so nobody fills it in from memory. */
  unread: z.array(z.string().min(1)).default([]),
  /** The office responsible for this place's figures, a key of the offices registry. */
  office: z
    .string()
    .regex(/^[a-z0-9_.-]+$/)
    .optional(),
  /** For a place that does not publish it: what collecting it here would take. */
  proposal: proposalSchema.optional(),
  /** Pages read, each with the words relied on. */
  evidence: z.array(evidenceSchema).min(1),
});
export type Coverage = z.infer<typeof coverageSchema>;

export interface GapRow {
  variant: string;
  place: string;
  status: Coverage["status"];
  /** Places that publish this variant, for the reader to compare against. */
  publishedElsewhere: string[];
}

export function defineGaps(input: {
  topics: readonly unknown[];
  coverage: readonly unknown[];
  offices?: readonly unknown[];
}) {
  const topics = input.topics.map((t) => topicSchema.parse(t));
  const coverage = input.coverage.map((c) => coverageSchema.parse(c));
  const offices = (input.offices ?? []).map((o) => officeSchema.parse(o));
  const officeKeys = new Map<string, Office>();
  for (const o of offices) {
    if (officeKeys.has(o.key)) throw new Error(`the office "${o.key}" is declared twice`);
    officeKeys.set(o.key, o);
    for (const c of o.contacts) {
      if (c.kind === "page") continue;
      // The page is expected to say the contact in its own words, so a changed address is noticed.
      const said = o.evidence.some((e) => e.expect.some((w) => w.includes(c.value)));
      if (!said) {
        throw new Error(
          `${o.key}: the ${c.kind} "${c.value}" is not among the words a cited page is expected to hold`,
        );
      }
    }
    for (const e of o.evidence) {
      if (!e.unchecked && e.expect.length === 0) {
        throw new Error(`${o.key}: ${e.url} must name the words it relies on`);
      }
    }
  }
  const officeOf = (id: string, key: string | undefined, place: z.infer<typeof placeSchema>) => {
    if (!key) return;
    const office = officeKeys.get(key);
    if (!office) throw new Error(`${id}: the office "${key}" is not in the registry`);
    if (office.place.scheme !== place.scheme || office.place.value !== place.value) {
      throw new Error(
        `${id}: the office "${key}" belongs to ${placeId(office.place)}, not ${placeId(place)}`,
      );
    }
  };
  const keys = new Set(topics.map((t) => t.key));
  if (keys.size !== topics.length) throw new Error("a topic is declared twice");
  const seen = new Set<string>();
  for (const c of coverage) {
    const topic = topics.find((t) => t.key === c.topic);
    if (!topic) throw new Error(`coverage names the unknown topic "${c.topic}"`);
    const id = `${c.topic}:${placeId(c.place)}:${c.variant}`;
    if (seen.has(id)) throw new Error(`${id} is covered twice`);
    seen.add(id);
    if (!topic.variants.some((v) => v.key === c.variant)) {
      throw new Error(`${id}: "${c.variant}" is not a variant of ${topic.key}`);
    }
    officeOf(id, c.office, c.place);
    officeOf(id, c.proposal?.office, c.place);
    if (c.status === "barred_by_law" && !c.frame) {
      throw new Error(`${id}: a bar in law must quote the law that bars it (frame)`);
    }
    for (const e of c.evidence) {
      if (!e.unchecked && e.expect.length === 0) {
        throw new Error(
          `${id}: ${e.url} must name the words it relies on, or say a program cannot read it`,
        );
      }
    }
  }
  return { topics, coverage, offices };
}

/**
 * For each variant some place publishes: the places that do not. A variant
 * nobody publishes is not a gap between places, and is not listed.
 */
export function gapsOf(topic: string, coverage: readonly Coverage[]): GapRow[] {
  const here = coverage.filter((c) => c.topic === topic);
  const rows: GapRow[] = [];
  for (const variant of new Set(here.map((c) => c.variant))) {
    const of = here.filter((c) => c.variant === variant);
    const published = of.filter((c) => c.status === "published").map((c) => placeId(c.place));
    if (published.length === 0) continue;
    for (const c of of.filter((x) => x.status !== "published")) {
      rows.push({
        variant,
        place: placeId(c.place),
        status: c.status,
        publishedElsewhere: published,
      });
    }
  }
  return rows;
}

export const publishedWith = (c: Coverage, crossing: (typeof CROSSINGS)[number]) =>
  c.status === "published" && c.crossings.includes(crossing);

/**
 * A topic's address: its key with dots and underscores as hyphens
 * (`crime.by_background` → `crime-by-background`). A dot in the path makes the
 * language middleware treat it as a file (`src/proxy.ts` skips any path with a
 * dot), so the unprefixed English page of a dotted key answered 404.
 */
export const topicSlug = (key: string) => key.replace(/[._]/g, "-");

/** The path of a topic's page, without a language. */
export const topicHref = (key: string) => `/statistics/gaps/${topicSlug(key)}`;

/** The topic a path segment names: its slug, or its key (links already shared). */
export function findTopic<T extends { key: string }>(
  topics: readonly T[],
  segment: string,
): T | undefined {
  let s = segment;
  try {
    s = decodeURIComponent(segment);
  } catch {
    // a malformed escape is not a topic; compare it as it came
  }
  return topics.find((t) => topicSlug(t.key) === s) ?? topics.find((t) => t.key === s);
}
