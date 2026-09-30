/**
 * The contract for everything Places knows about the world's STRUCTURE — the
 * Zod schemas every module in this directory satisfies.
 *
 * Mechanism lives in src/lib/places and knows none of this by name. A new
 * country is a new pack plus its sources, metrics and schemes here, and an
 * importer; never an engine change. Design:
 * docs/design/2026-09-places-and-jurisdictions.md §3, §5.
 *
 * Labels live beside the thing they label, keyed by BCP 47 locale, rather than
 * in messages/*.json: a pack names its levels in the languages of its country
 * (Romansh included), which are not the site's locales, and contributing a
 * country must not mean editing five message files.
 */
import { z } from "zod";
import { modelProblems, type TaxModel } from "@/lib/tax-model";
import { LEVEL_COVERAGES, METRIC_UNITS, METRIC_VALUE_TYPES } from "@/lib/places/vocabulary";

/** A registry key: lower snake case. */
const registryKey = z.string().regex(/^[a-z][a-z0-9_]*$/, "lower snake case");
/** A metric key: dotted lower snake case, e.g. `tax.multiplier`. */
const metricKey = z
  .string()
  .regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/, "dotted lower snake case");
/** A source key: kebab case, the name of a dataset. */
const sourceKey = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "kebab case");

/** Text in several languages, keyed by BCP 47 locale. At least one entry. */
export const localizedTextSchema = z
  .record(
    z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "a BCP 47 locale"),
    z.string().min(1),
  )
  .refine((text) => Object.keys(text).length > 0, "needs at least one locale");
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const levelSchema = z
  .object({
    key: registryKey,
    /** The level this one is `part_of`; null for the pack's root. */
    parent: registryKey.nullable(),
    /** A level beside the hierarchy, overlapping another (a school municipality). */
    overlaps: registryKey.optional(),
    /** `partial` when only some parents are divided into this level. */
    coverage: z.enum(LEVEL_COVERAGES).default("full"),
    names: localizedTextSchema,
  })
  .refine((level) => !(level.parent !== null && level.overlaps !== undefined), {
    message: "a level is either part of a parent or overlaps one, not both",
  });
export type Level = z.infer<typeof levelSchema>;

/**
 * What a reader sees of a tax model: its inputs, variants and components in
 * the country's words, and what the estimate leaves out. Required beside a
 * `taxModel`; every key the model names must be labelled.
 */
export const taxLabelsSchema = z.object({
  inputs: z.record(
    z.string(),
    z.object({ label: localizedTextSchema, hint: localizedTextSchema.optional() }),
  ),
  variants: z.record(z.string(), localizedTextSchema),
  components: z.record(z.string(), localizedTextSchema),
  /** Said once beside every estimate. */
  excludes: localizedTextSchema,
});
export type TaxLabels = z.infer<typeof taxLabelsSchema>;

export const countryPackSchema = z.object({
  /** Also the file name under countries/. */
  key: registryKey,
  names: localizedTextSchema,
  /** ISO 4217. Checked against the runtime's CLDR data. */
  currency: z.string().regex(/^[A-Z]{3}$/),
  /**
   * ISO 3166-1 alpha-2, for the country's number formats: its amounts read as
   * its people write them (de-CH: CHF 13’050). Absent: the reader's locale alone.
   */
  region: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  fiscalYear: z.object({
    startMonthDay: z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/, "MM-DD"),
  }),
  /** BCP 47 locales the country's own names are published in. */
  defaultLocales: z.array(z.string().min(2)).min(1),
  slug: z.object({
    strategy: z.enum(["official-name"]),
    transliterate: z.boolean(),
  }),
  levels: z.array(levelSchema).min(1),
  identifierSchemes: z.array(registryKey),
  /** The country's postcode format, a regular expression; absent when it has no postcodes. */
  postcodePattern: z.string().min(1).optional(),
  sources: z.array(sourceKey),
  instrumentKinds: z.array(registryKey).default([]),
  /** The country's income tax as data; validated against its levels and the metric catalog. */
  taxModel: z
    .custom<TaxModel>((value) => typeof value === "object" && value !== null, "a TaxModel")
    .optional(),
  taxLabels: taxLabelsSchema.optional(),
});
export type CountryPack = z.infer<typeof countryPackSchema>;

export const identifierSchemeSchema = z.object({
  key: registryKey,
  label: localizedTextSchema,
  /** A regular expression (source) every value must match in full. */
  pattern: z.string().min(1),
  /** Where a value is looked up, with `{value}` in place of the value. */
  urlTemplate: z.string().includes("{value}").optional(),
  /** Only a state authority may carry it: the anti-impersonation rule (§4.3). */
  reserved: z.boolean(),
  retired: z.literal(true).optional(),
});
export type IdentifierScheme = z.infer<typeof identifierSchemeSchema>;

export const metricSchema = z.object({
  key: metricKey,
  label: localizedTextSchema,
  valueType: z.enum(METRIC_VALUE_TYPES),
  unit: z.enum(METRIC_UNITS),
  /** Values outside this band are quarantined and reported, not published (§8.3). */
  plausible: z.object({ min: z.number(), max: z.number() }).optional(),
  retired: z.literal(true).optional(),
});
export type Metric = z.infer<typeof metricSchema>;

export const sourceSchema = z.object({
  key: sourceKey,
  publisher: z.string().min(1),
  dataset: z.string().min(1),
  homepage: z.url(),
  /** SPDX identifier; must be on the licence policy or the importer does not run. */
  licence: z.string().min(1),
  attribution: localizedTextSchema.optional(),
  /** Cron expression the scheduler reads; no job has a hardcoded date. */
  cadence: z.string().regex(/^(\S+\s+){4}\S+$/, "a five-field cron expression"),
  /** Key of the adapter module in src/lib/places/adapters. */
  adapter: registryKey,
  /**
   * What the adapter needs to know about the world to map this source: which
   * levels and identifier schemes its rows become, which part of the source to
   * take. Validated by the adapter's own schema, so an adapter parses a format
   * and names no country.
   */
  options: z.record(z.string(), z.unknown()).default({}),
  packs: z.array(registryKey),
});
export type Source = z.infer<typeof sourceSchema>;

export const licenceSchema = z.object({
  /** SPDX identifier. */
  spdx: z.string().min(1),
  requiresAttribution: z.boolean(),
  /** Share-alike sources are excluded until a Register decision admits one (§13). */
  shareAlike: z.literal(false),
});
export type Licence = z.infer<typeof licenceSchema>;

export const instrumentKindSchema = z.object({
  key: registryKey,
  label: localizedTextSchema,
  retired: z.literal(true).optional(),
});
export type InstrumentKind = z.infer<typeof instrumentKindSchema>;

export const placesConfigSchema = z.object({
  packs: z.array(countryPackSchema),
  sources: z.array(sourceSchema),
  metrics: z.array(metricSchema),
  identifierSchemes: z.array(identifierSchemeSchema),
  instrumentKinds: z.array(instrumentKindSchema),
  licences: z.array(licenceSchema),
});
export type PlacesConfig = z.infer<typeof placesConfigSchema>;
/** What a config module declares, before defaults are filled in. */
export type PlacesConfigInput = z.input<typeof placesConfigSchema>;
export type CountryPackInput = z.input<typeof countryPackSchema>;
export type SourceInput = z.input<typeof sourceSchema>;
export type MetricInput = z.input<typeof metricSchema>;
export type IdentifierSchemeInput = z.input<typeof identifierSchemeSchema>;
export type InstrumentKindInput = z.input<typeof instrumentKindSchema>;

const duplicates = (keys: readonly string[]): string[] => [
  ...new Set(keys.filter((key, i) => keys.indexOf(key) !== i)),
];

function levelProblems(pack: CountryPack): string[] {
  const problems: string[] = [];
  const keys = pack.levels.map((level) => level.key);
  for (const key of duplicates(keys)) {
    problems.push(`pack "${pack.key}": level "${key}" is declared twice`);
  }
  const byKey = new Map(pack.levels.map((level) => [level.key, level]));
  const roots = pack.levels.filter(
    (level) => level.parent === null && level.overlaps === undefined,
  );
  if (roots.length !== 1) {
    problems.push(`pack "${pack.key}": needs exactly one root level, has ${roots.length}`);
  }
  for (const level of pack.levels) {
    for (const ref of [level.parent, level.overlaps]) {
      if (ref && !byKey.has(ref)) {
        problems.push(`pack "${pack.key}": level "${level.key}" refers to unknown level "${ref}"`);
      }
    }
    const seen = new Set<string>();
    let cursor: Level | undefined = level;
    while (cursor?.parent) {
      if (seen.has(cursor.key)) {
        problems.push(`pack "${pack.key}": level "${level.key}" is its own ancestor`);
        break;
      }
      seen.add(cursor.key);
      cursor = byKey.get(cursor.parent);
    }
  }
  return problems;
}

function taxModelProblems(pack: CountryPack, metrics: ReadonlyMap<string, Metric>): string[] {
  const model = pack.taxModel;
  if (!model) {
    return pack.taxLabels ? [`pack "${pack.key}": tax labels without a tax model`] : [];
  }
  const prefix = `pack "${pack.key}" tax model`;
  const problems = modelProblems(model).map((problem) => `${prefix}: ${problem}`);
  const labels = pack.taxLabels;
  if (!labels) {
    problems.push(`${prefix}: no taxLabels`);
  } else {
    const unlabelled = [
      ...model.inputs.filter((key) => !labels.inputs[key]).map((key) => `input "${key}"`),
      ...model.variants.filter((key) => !labels.variants[key]).map((key) => `variant "${key}"`),
      ...model.components
        .filter((c) => !labels.components[c.key])
        .map((c) => `component "${c.key}"`),
    ];
    problems.push(...unlabelled.map((what) => `${prefix}: ${what} has no label`));
  }
  const levels = new Set(pack.levels.map((level) => level.key));
  for (const component of model.components) {
    const refs = [
      { ref: component.tariff, valueType: "tariff" as const },
      ...(component.multipliers ?? []).map((ref) => ({ ref, valueType: "number" as const })),
    ];
    for (const { ref, valueType } of refs) {
      if (!levels.has(ref.level)) {
        problems.push(`${prefix}: "${component.key}" reads unknown level "${ref.level}"`);
      }
      const metric = metrics.get(ref.metric);
      if (!metric) {
        problems.push(`${prefix}: "${component.key}" reads unknown metric "${ref.metric}"`);
      } else if (metric.valueType !== valueType) {
        problems.push(
          `${prefix}: "${component.key}" reads "${ref.metric}" as a ${valueType}, but it holds a ${metric.valueType}`,
        );
      }
    }
  }
  return problems;
}

/**
 * Everything wrong across the registries, one sentence each; empty when the
 * config is sound. Zod checks each entry's shape; this checks what refers to
 * what.
 */
export function placesConfigProblems(config: PlacesConfig): string[] {
  const problems: string[] = [];
  const registries: [string, readonly string[]][] = [
    ["pack", config.packs.map((p) => p.key)],
    ["source", config.sources.map((s) => s.key)],
    ["metric", config.metrics.map((m) => m.key)],
    ["identifier scheme", config.identifierSchemes.map((s) => s.key)],
    ["instrument kind", config.instrumentKinds.map((k) => k.key)],
    ["licence", config.licences.map((l) => l.spdx)],
  ];
  for (const [name, keys] of registries) {
    for (const key of duplicates(keys)) {
      problems.push(`${name} "${key}" is declared twice`);
    }
  }

  // CLDR's full ISO 4217 list, test codes included; supportedValuesOf omits those.
  const currencyNames = new Intl.DisplayNames(["en"], { type: "currency", fallback: "none" });
  const regionNames = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
  const packs = new Set(config.packs.map((p) => p.key));
  const sources = new Set(config.sources.map((s) => s.key));
  const schemes = new Set(config.identifierSchemes.map((s) => s.key));
  const kinds = new Set(config.instrumentKinds.map((k) => k.key));
  const licences = new Set(config.licences.map((l) => l.spdx));
  const metrics = new Map(config.metrics.map((m) => [m.key, m]));

  for (const pack of config.packs) {
    if (currencyNames.of(pack.currency) === undefined) {
      problems.push(`pack "${pack.key}": "${pack.currency}" is not an ISO 4217 currency`);
    }
    if (pack.region !== undefined && regionNames.of(pack.region) === undefined) {
      problems.push(`pack "${pack.key}": "${pack.region}" is not an ISO 3166-1 region`);
    }
    problems.push(...levelProblems(pack));
    for (const key of pack.identifierSchemes.filter((k) => !schemes.has(k))) {
      problems.push(`pack "${pack.key}": unknown identifier scheme "${key}"`);
    }
    for (const key of pack.sources.filter((k) => !sources.has(k))) {
      problems.push(`pack "${pack.key}": unknown source "${key}"`);
    }
    for (const key of pack.instrumentKinds.filter((k) => !kinds.has(k))) {
      problems.push(`pack "${pack.key}": unknown instrument kind "${key}"`);
    }
    problems.push(...taxModelProblems(pack, metrics));
  }
  for (const source of config.sources) {
    if (!licences.has(source.licence)) {
      problems.push(
        `source "${source.key}": licence "${source.licence}" is not on the licence policy`,
      );
    }
    for (const key of source.packs.filter((k) => !packs.has(k))) {
      problems.push(`source "${source.key}": unknown pack "${key}"`);
    }
  }
  for (const scheme of config.identifierSchemes) {
    try {
      new RegExp(`^(?:${scheme.pattern})$`);
    } catch {
      problems.push(`identifier scheme "${scheme.key}": pattern does not compile`);
    }
  }
  for (const metric of config.metrics) {
    if (metric.plausible && metric.plausible.min > metric.plausible.max) {
      problems.push(`metric "${metric.key}": plausible band is upside down`);
    }
  }
  return problems;
}

/** Parse and cross-check a config, or throw naming every problem. */
export function definePlacesConfig(input: PlacesConfigInput): PlacesConfig {
  const config = placesConfigSchema.parse(input);
  const problems = placesConfigProblems(config);
  if (problems.length > 0) {
    throw new Error(`Places config is invalid:\n- ${problems.join("\n- ")}`);
  }
  return config;
}
