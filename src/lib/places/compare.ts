/**
 * The database side of /compare (design §9.2): each place's chain and the
 * facts its pack's tax model reads, on a given day. `comparisonView` is pure,
 * so a made-up country compares from its pack alone; the estimate itself runs
 * in the browser (`compare-view.ts`).
 */
import { and, eq, inArray } from "drizzle-orm";
import type { CountryPack, PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { jurisdictions } from "@/lib/db/places-schema";
import { evaluate, modelRefs, taxingLevels, type TaxModel } from "@/lib/tax-model";
import { fiscalYearPeriod } from "./adapters/csv-facts";
import { evaluatorFacts, loadChain, loadFacts, type ChainFact, type ChainPlace } from "./chain";
import {
  multiplierRowKey,
  type CompareColumn,
  type CompareTaxPack,
  type Comparison,
} from "./compare-view";
import { loadRetrievals } from "./place-page";
import { displayName, localized, placeSources } from "./place-view";

export interface ComparedPlace {
  chain: ChainPlace[];
  facts: ChainFact[];
}

/** How many fiscal years back a comparison looks for figures not yet published for this one. */
const YEARS_BACK = 2;

export async function loadComparison(
  db: Database,
  config: PlacesConfig,
  slugPaths: readonly string[],
  on: string,
  locale: string,
): Promise<Comparison> {
  const wanted = [...new Set(slugPaths)];
  const rows =
    wanted.length === 0
      ? []
      : await db
          .select({ id: jurisdictions.id, slugPath: jurisdictions.slugPath })
          .from(jurisdictions)
          .where(and(inArray(jurisdictions.slugPath, wanted), eq(jurisdictions.origin, "state")));
  const found = wanted.flatMap((path) => rows.filter((r) => r.slugPath === path));
  const chains = await Promise.all(found.map(({ id }) => loadChain(db, id, on)));

  // The latest period whose figures are all published: every column is
  // estimated for the same one, never a mix of years.
  let places: ComparedPlace[] = [];
  let period = on;
  for (let back = 0; back <= YEARS_BACK; back++) {
    const day = yearsBefore(on, back);
    const candidate = await Promise.all(
      chains.map(async (chain) => ({
        chain,
        facts: await loadFacts(
          db,
          chain.map((p) => p.id),
          day,
        ),
      })),
    );
    if (back === 0 || candidate.every((place) => figuresPublished(config, place))) {
      places = candidate;
      period = day;
    }
    if (places.every((place) => figuresPublished(config, place))) {
      break;
    }
  }

  const retrievals = await loadRetrievals(
    db,
    places.flatMap((place) => modelFacts(config, place).map((f) => f.sourceId)),
  );
  const view = comparisonView({ config, places, on: period, locale });
  return {
    ...view,
    sources: placeSources(config, retrievals, locale),
    earlierYear: period !== on,
    notFound: [
      ...wanted.filter((path) => !found.some((r) => r.slugPath === path)),
      ...view.notFound,
    ],
  };
}

/** The chain facts its pack's tax model reads. */
function modelFacts(config: PlacesConfig, { chain, facts }: ComparedPlace): ChainFact[] {
  const place = chain.find((p) => p.depth === 0);
  const model = config.packs.find((p) => p.key === place?.countryPack)?.taxModel;
  if (!model) {
    return [];
  }
  const levelOf = new Map(chain.map((p) => [p.id, p.levelKey]));
  const read = new Set(modelRefs(model).map((r) => `${r.level} ${r.metric}`));
  return facts.filter((f) => read.has(`${levelOf.get(f.jurisdictionId)} ${f.metricKey}`));
}

/** The same day `years` earlier; 29 February becomes the 28th. */
export function yearsBefore(on: string, years: number): string {
  const day = `${Number(on.slice(0, 4)) - years}${on.slice(4)}`;
  return Number.isNaN(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day
    ? `${day.slice(0, 8)}28`
    : day;
}

/**
 * Whether every figure the model reads at this place's levels is recorded, for
 * every variant. A figure of a level below the place (a commune's multiplier
 * for a canton) does not count: no year would bring it.
 */
export function figuresPublished(config: PlacesConfig, place: ComparedPlace): boolean {
  const self = place.chain.find((p) => p.depth === 0);
  const model = config.packs.find((p) => p.key === self?.countryPack)?.taxModel;
  if (!model) {
    return true;
  }
  const levels = new Set(place.chain.map((p) => p.levelKey));
  const facts = evaluatorFacts(place.chain, modelFacts(config, place));
  return model.variants.every((variant) => {
    try {
      return evaluate(model, facts, { values: { [model.base]: 1 }, variant }).missing.every(
        (ref) => !levels.has(ref.level),
      );
    } catch {
      return true;
    }
  });
}

/** The fiscal year containing `on`: "2026", or "2026/27" when it spans two calendar years. */
export function taxYear(startMonthDay: string, on: string): string {
  const year = Number(on.slice(0, 4));
  const start = on.slice(5) >= startMonthDay ? year : year - 1;
  const { validFrom } = fiscalYearPeriod(start, startMonthDay);
  const calendar = new Date(Date.UTC(start, 0, 1)).toISOString().slice(0, 10);
  return validFrom === calendar ? String(start) : `${start}/${String(start + 1).slice(-2)}`;
}

export function comparisonView(input: {
  config: PlacesConfig;
  places: readonly ComparedPlace[];
  on: string;
  locale: string;
}): Omit<Comparison, "sources" | "earlierYear"> {
  const { config, on, locale } = input;
  const columns: CompareColumn[] = [];
  const notFound: string[] = [];
  const taxPacks = new Map<string, CompareTaxPack>();

  for (const compared of input.places) {
    const { chain } = compared;
    const place = chain.find((p) => p.depth === 0);
    const pack = config.packs.find((p) => p.key === place?.countryPack);
    if (!place?.slugPath) {
      continue;
    }
    if (!pack) {
      notFound.push(place.slugPath);
      continue;
    }
    const levelName = (key: string | null) => {
      const level = pack.levels.find((l) => l.key === key);
      return level ? localized(level.names, locale) : (key ?? "");
    };
    const nameOf = (p: ChainPlace) => displayName(p.names, locale, pack.defaultLocales);
    const model = pack.taxModel;
    const facts = evaluatorFacts(chain, modelFacts(config, compared));
    const taxing = model ? taxingLevels(model, facts) : [];

    let taxPack = taxPacks.get(pack.key);
    if (!taxPack) {
      taxPack = taxPackView(config, pack, on, locale) ?? undefined;
      if (taxPack) {
        taxPacks.set(pack.key, taxPack);
      }
    }

    const parent = chain.find((p) => p.depth === 1);
    columns.push({
      slugPath: place.slugPath,
      name: nameOf(place),
      levelName: levelName(place.levelKey),
      parentName: parent ? nameOf(parent) : null,
      packKey: pack.key,
      packName: localized(pack.names, locale),
      taxedBy: chain
        .filter((p) => p.levelKey !== null && taxing.includes(p.levelKey))
        .sort((a, b) => (b.depth ?? -1) - (a.depth ?? -1))
        .map((p) => ({ name: nameOf(p), levelName: levelName(p.levelKey) })),
      facts,
      levels: [...new Set(chain.flatMap((p) => (p.levelKey ? [p.levelKey] : [])))],
      multipliers: Object.fromEntries(
        (taxPack?.multiplierRows ?? [])
          .filter((row) => chain.some((p) => p.levelKey === row.levelKey))
          .map((row) => {
            const fact = facts.find(
              (f) => multiplierRowKey(f.level, f.metric) === row.key && typeof f.value === "number",
            );
            return [row.key, typeof fact?.value === "number" ? fact.value : null];
          }),
      ),
    });
  }
  return { columns, taxPacks: [...taxPacks.values()], notFound };
}

/** A pack's tax model in the reader's words, for the fiscal year containing `on`; null without one. */
export function taxPackView(
  config: PlacesConfig,
  pack: CountryPack,
  on: string,
  locale: string,
): CompareTaxPack | null {
  const model = pack.taxModel;
  const labels = pack.taxLabels;
  if (!model || !labels) {
    return null;
  }
  const levelName = (key: string | null) => {
    const level = pack.levels.find((l) => l.key === key);
    return level ? localized(level.names, locale) : (key ?? "");
  };
  const inputOf = (key: string) => ({
    key,
    label: localized(labels.inputs[key]!.label, locale),
    hint: labels.inputs[key]!.hint ? localized(labels.inputs[key]!.hint!, locale) : null,
  });
  const rows = new Map<string, CompareTaxPack["multiplierRows"][number]>();
  for (const ref of model.components.flatMap((c) => c.multipliers ?? [])) {
    const key = multiplierRowKey(ref.level, ref.metric);
    const metric = config.metrics.find((m) => m.key === ref.metric);
    rows.set(key, {
      key,
      levelKey: ref.level,
      metric: metric ? localized(metric.label, locale) : ref.metric,
      level: levelName(ref.level),
    });
  }
  return {
    key: pack.key,
    name: localized(pack.names, locale),
    currency: pack.currency,
    formatLocale: pack.region ? `${locale}-${pack.region}` : locale,
    taxYear: taxYear(pack.fiscalYear.startMonthDay, on),
    model,
    base: inputOf(model.base),
    conditions: model.inputs.filter((key) => key !== model.base).map(inputOf),
    variants: model.variants.map((key) => ({
      key,
      label: localized(labels.variants[key]!, locale),
    })),
    components: model.components.map((c) => ({
      key: c.key,
      label: localized(labels.components[c.key]!, locale),
    })),
    multiplierRows: [...rows.values()],
    levelNames: Object.fromEntries(pack.levels.map((l) => [l.key, levelName(l.key)])),
    excludes: localized(labels.excludes, locale),
    exampleBase: labels.exampleBase ?? null,
  };
}
