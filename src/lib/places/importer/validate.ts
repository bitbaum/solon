/**
 * A mapped batch, checked against the config before anything is written.
 * Pure. Problems abort the run; values outside a metric's plausible band are
 * quarantined — reported and left out, never published (design §8.3).
 */
import type { PlacesConfig } from "@/lib/config/places/schema";
import { tariffProblem, type Tariff } from "@/lib/tax-model";
import { refKey, type BatchFact, type ExternalRef, type ImportBatch } from "./batch";

export interface Quarantined {
  fact: BatchFact;
  reason: string;
}

export interface BatchCheck {
  problems: string[];
  quarantined: Quarantined[];
  /** The batch without its quarantined facts. */
  batch: ImportBatch;
}

const currencyNames = new Intl.DisplayNames(["en"], { type: "currency", fallback: "none" });

export function checkBatch(
  batch: ImportBatch,
  config: PlacesConfig,
  sourceKey: string,
): BatchCheck {
  const problems: string[] = [];
  const quarantined: Quarantined[] = [];
  const source = config.sources.find((s) => s.key === sourceKey);
  const pack = config.packs.find((p) => p.key === batch.pack);
  if (!source) {
    problems.push(`source "${sourceKey}" is not in the source registry`);
  } else if (!source.packs.includes(batch.pack)) {
    problems.push(`source "${sourceKey}" does not serve pack "${batch.pack}"`);
  }
  if (!pack) {
    problems.push(`pack "${batch.pack}" is not in config`);
    return { problems, quarantined, batch };
  }

  const levels = new Set(pack.levels.map((l) => l.key));
  const schemes = new Map(
    config.identifierSchemes
      .filter((s) => pack.identifierSchemes.includes(s.key))
      .map((s) => [s.key, { scheme: s, pattern: new RegExp(`^(?:${s.pattern})$`) }]),
  );
  const identifierProblem = (ref: ExternalRef, where: string): string | null => {
    const entry = schemes.get(ref.scheme);
    if (!entry) {
      return `${where}: scheme "${ref.scheme}" is not one of pack "${pack.key}"'s schemes`;
    }
    if (entry.scheme.retired) {
      return `${where}: scheme "${ref.scheme}" is retired`;
    }
    if (!entry.pattern.test(ref.value)) {
      return `${where}: "${ref.value}" does not match scheme "${ref.scheme}"`;
    }
    return null;
  };

  const seen = new Set<string>();
  for (const j of batch.jurisdictions) {
    const where = `place ${refKey(j.ref)}`;
    if (seen.has(refKey(j.ref))) {
      problems.push(`${where} appears twice`);
    }
    seen.add(refKey(j.ref));
    if (!levels.has(j.levelKey)) {
      problems.push(`${where}: level "${j.levelKey}" is not a level of pack "${pack.key}"`);
    }
    for (const ref of [j.ref, ...j.identifiers]) {
      const problem = identifierProblem(ref, where);
      if (problem) {
        problems.push(problem);
      }
    }
  }

  const postcodePattern = pack.postcodePattern ? new RegExp(`^(?:${pack.postcodePattern})$`) : null;
  const postcodeKeys = new Set<string>();
  for (const row of batch.postcodes) {
    const key = `${row.postcode} ${row.locality} ${refKey(row.place)} ${row.validFrom ?? "-"}`;
    const where = `postcode ${key}`;
    if (postcodeKeys.has(key)) {
      problems.push(`${where} appears twice`);
    }
    postcodeKeys.add(key);
    if (!postcodePattern) {
      problems.push(`${where}: pack "${pack.key}" has no postcode format`);
    } else if (!postcodePattern.test(row.postcode)) {
      problems.push(
        `${where}: "${row.postcode}" does not match pack "${pack.key}"'s postcode format`,
      );
    }
    const problem = identifierProblem(row.place, where);
    if (problem) {
      problems.push(problem);
    }
  }

  problems.push(...areaProblems(batch, levels, identifierProblem));

  const metrics = new Map(config.metrics.map((m) => [m.key, m]));
  const factKeys = new Set<string>();
  const accepted: BatchFact[] = [];
  for (const fact of batch.facts) {
    const key = `${refKey(fact.jurisdiction)} ${fact.metricKey} ${fact.variant ?? "-"} ${fact.validFrom}`;
    const where = `fact ${key}`;
    if (factKeys.has(key)) {
      problems.push(`${where} appears twice`);
    }
    factKeys.add(key);
    const metric = metrics.get(fact.metricKey);
    if (!metric) {
      problems.push(`${where}: metric "${fact.metricKey}" is not in the catalog`);
      continue;
    }
    if (metric.retired) {
      problems.push(`${where}: metric "${fact.metricKey}" is retired`);
      continue;
    }
    if (metric.valueType === "tariff") {
      if (typeof fact.value === "number") {
        problems.push(`${where}: "${fact.metricKey}" holds a tariff, the source gave a number`);
        continue;
      }
      const tariff = fact.value as Tariff;
      const problem = tariffProblem(tariff);
      if (problem) {
        problems.push(`${where}: ${problem}`);
        continue;
      }
      if (currencyNames.of(tariff.currency) === undefined) {
        problems.push(`${where}: "${tariff.currency}" is not an ISO 4217 currency`);
        continue;
      }
    } else {
      if (typeof fact.value !== "number" || !Number.isFinite(fact.value)) {
        problems.push(
          `${where}: "${fact.metricKey}" holds a number, the source gave something else`,
        );
        continue;
      }
      const band = metric.plausible;
      if (band && (fact.value < band.min || fact.value > band.max)) {
        quarantined.push({
          fact,
          reason: `${fact.value} is outside the plausible band [${band.min}, ${band.max}] of "${fact.metricKey}"`,
        });
        continue;
      }
    }
    accepted.push(fact);
  }
  return { problems, quarantined, batch: { ...batch, facts: accepted } };
}

/** A geometry file and the areas drawn in it agree: one level, every feature there once. */
function areaProblems(
  batch: ImportBatch,
  levels: Set<string>,
  identifierProblem: (ref: ExternalRef, where: string) => string | null,
): string[] {
  const { areas, geometry } = batch;
  if (!geometry) {
    return areas.length > 0 ? ["the batch states areas without the geometry file they are in"] : [];
  }
  const problems: string[] = [];
  if (!levels.has(geometry.levelKey)) {
    problems.push(`geometry: level "${geometry.levelKey}" is not a level of pack "${batch.pack}"`);
  }
  const features = topologyFeatureIds(geometry.topology, geometry.levelKey);
  if (typeof features === "string") {
    return [...problems, `geometry: ${features}`];
  }
  const stated = new Set<string>();
  for (const area of areas) {
    const where = `area ${refKey(area.place)} (feature ${area.feature})`;
    if (stated.has(area.feature)) {
      problems.push(`${where}: the feature is stated twice`);
    }
    stated.add(area.feature);
    if (!features.has(area.feature)) {
      problems.push(`${where}: the geometry file has no such feature`);
    }
    const problem = identifierProblem(area.place, where);
    if (problem) {
      problems.push(problem);
    }
  }
  return problems;
}

/** The ids of the features in a TopoJSON file's object for `levelKey`, or why there are none. */
function topologyFeatureIds(text: string, levelKey: string): Set<string> | string {
  let topology: unknown;
  try {
    topology = JSON.parse(text);
  } catch {
    return "the file is not JSON";
  }
  const object = (topology as { type?: unknown; objects?: Record<string, unknown> })?.objects?.[
    levelKey
  ] as { type?: unknown; geometries?: { id?: unknown }[] } | undefined;
  if ((topology as { type?: unknown }).type !== "Topology" || !object) {
    return `the file is not a TopoJSON topology with an object named "${levelKey}"`;
  }
  if (object.type !== "GeometryCollection" || !Array.isArray(object.geometries)) {
    return `object "${levelKey}" is not a collection of features`;
  }
  return new Set(object.geometries.map((g) => String(g.id)));
}
