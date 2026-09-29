/**
 * The importer framework (design §8.3): one run turns a retrieval of a source
 * into rows, or into a precise refusal.
 *
 *  1. snapshot the raw bytes under their sha256;
 *  2. parse with the adapter's schema (a format change fails loudly);
 *  3. map to the generic batch, keyed by identifiers;
 *  4. check it against config (unknown levels, schemes, metrics; tariffs;
 *     values outside a metric's plausible band are quarantined);
 *  5. in ONE transaction: sync the config registries, record the source, and
 *     apply the diff — insert, end, supersede, never delete;
 *  6. run the invariant engine on the resulting hierarchy; any problem rolls
 *     the whole run back.
 *
 * Every run is recorded in `place_import_runs`, failed ones included. A dry run
 * does all of it and rolls back, so it reports the exact diff.
 *
 * What a batch says replaces what the same source said before about the same
 * places: names, identifiers and relations of this source that the batch no
 * longer states are superseded. Facts are per period, so a batch that omits
 * an old period leaves it standing; a changed value supersedes the old one.
 * Places this source knew and the batch omits are reported, not ended: only a
 * source can say when a place ended.
 */
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { CountryPack, PlacesConfig, Source } from "@/lib/config/places/schema";
import type { Database, Tx } from "@/lib/db/client";
import {
  facts,
  jurisdictionIdentifiers,
  jurisdictionNames,
  jurisdictionRelations,
  jurisdictions,
  placeImportRuns,
  sources,
} from "@/lib/db/places-schema";
import { ADAPTERS, type Adapter } from "../adapters";
import { hierarchyProblems } from "../invariants";
import { slugSegment } from "../slug";
import { syncPlacesConfigIn } from "../sync-config";
import {
  importBatchSchema,
  refKey,
  type BatchJurisdiction,
  type ExternalRef,
  type ImportBatch,
} from "./batch";
import { sha256Hex, type SnapshotStore } from "./snapshots";
import { checkBatch } from "./validate";

export interface Retrieval {
  bytes: Uint8Array;
  url: string | null;
  retrievedAt: Date;
}

export interface ImportOptions {
  config: PlacesConfig;
  sourceKey: string;
  retrieval: Retrieval;
  snapshots: SnapshotStore;
  dryRun?: boolean;
  gitSha?: string | null;
  adapters?: ReadonlyMap<string, Adapter>;
}

export const CHANGE_KINDS = [
  "placesInserted",
  "placesUpdated",
  "namesInserted",
  "namesSuperseded",
  "identifiersInserted",
  "identifiersSuperseded",
  "relationsInserted",
  "relationsEnded",
  "relationsSuperseded",
  "factsInserted",
  "factsSuperseded",
] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];
export type ChangeCounts = Record<ChangeKind, number>;

export interface ImportReport {
  runId: string;
  status: "applied" | "dry_run" | "failed";
  /** The `sources` row of this retrieval; null for dry and failed runs. */
  sourceId: string | null;
  contentSha256: string | null;
  counts: ChangeCounts;
  quarantined: { fact: string; reason: string }[];
  /** Places this source stated before that the batch no longer mentions. */
  missingFromSource: string[];
  problems: string[];
}

class RunFailed extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join("; "));
  }
}
class DryRunDone extends Error {
  constructor(readonly outcome: ApplyOutcome) {
    super("dry run");
  }
}

interface ApplyOutcome {
  counts: ChangeCounts;
  missingFromSource: string[];
}

const noChanges = (): ChangeCounts =>
  Object.fromEntries(CHANGE_KINDS.map((kind) => [kind, 0])) as ChangeCounts;

/** JSON with sorted keys, so equal values compare equal. */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );

export async function runImport(db: Database, options: ImportOptions): Promise<ImportReport> {
  const { config, sourceKey, retrieval, snapshots, dryRun = false } = options;
  const adapters = options.adapters ?? ADAPTERS;
  const [run] = await db
    .insert(placeImportRuns)
    .values({ sourceKey, status: "running", report: {} })
    .returning({ id: placeImportRuns.id });
  const report: ImportReport = {
    runId: run!.id,
    status: "failed",
    sourceId: null,
    contentSha256: null,
    counts: noChanges(),
    quarantined: [],
    missingFromSource: [],
    problems: [],
  };

  try {
    const source = config.sources.find((s) => s.key === sourceKey);
    if (!source) {
      throw new RunFailed([`source "${sourceKey}" is not in the source registry`]);
    }
    if (!config.licences.some((licence) => licence.spdx === source.licence)) {
      throw new RunFailed([
        `licence "${source.licence}" is not on the licence policy; the importer does not run`,
      ]);
    }
    const adapter = adapters.get(source.adapter);
    if (!adapter) {
      throw new RunFailed([`no adapter "${source.adapter}" for source "${sourceKey}"`]);
    }

    const sha = sha256Hex(retrieval.bytes);
    report.contentSha256 = sha;
    const snapshotKey = await snapshots.put(sha, retrieval.bytes);

    const decoded = adapter.decode
      ? adapter.decode(retrieval.bytes)
      : (JSON.parse(new TextDecoder().decode(retrieval.bytes)) as unknown);
    const parsed = adapter.schema.safeParse(decoded);
    if (!parsed.success) {
      throw new RunFailed(
        parsed.error.issues
          .slice(0, 20)
          .map((issue) => `format: ${issue.path.join(".") || "(root)"}: ${issue.message}`),
      );
    }
    const adapterOptions = adapter.options
      ? adapter.options.safeParse(source.options)
      : { success: true as const, data: undefined };
    if (!adapterOptions.success) {
      throw new RunFailed(
        adapterOptions.error.issues.map(
          (issue) => `source options: ${issue.path.join(".") || "(root)"}: ${issue.message}`,
        ),
      );
    }
    const pack = config.packs.find((p) => p.key === source.packs[0]);
    const batch = importBatchSchema.parse(
      adapter.map(parsed.data, {
        source,
        pack,
        options: adapterOptions.data,
        retrieval: { url: retrieval.url },
      }),
    );
    const check = checkBatch(batch, config, sourceKey);
    report.quarantined = check.quarantined.map(({ fact, reason }) => ({
      fact: `${refKey(fact.jurisdiction)} ${fact.metricKey} ${fact.validFrom}`,
      reason,
    }));
    if (check.problems.length > 0) {
      throw new RunFailed(check.problems);
    }
    const batchPack = config.packs.find((p) => p.key === check.batch.pack)!;

    const outcome = await db
      .transaction(async (tx) => {
        await syncPlacesConfigIn(tx, config, { gitSha: options.gitSha });
        const [sourceRow] = await tx
          .insert(sources)
          .values({
            sourceKey,
            retrievedAt: retrieval.retrievedAt,
            url: retrieval.url,
            contentSha256: sha,
            snapshotKey,
            importerVersion: `${adapter.key}@${adapter.version}`,
            licenceSpdx: source.licence,
          })
          .returning();
        const applied = await applyBatch(tx, config, batchPack, source, check.batch, sourceRow!.id);
        const problems = await packInvariants(tx, batchPack);
        if (problems.length > 0) {
          throw new RunFailed(problems);
        }
        if (dryRun) {
          throw new DryRunDone(applied);
        }
        report.sourceId = sourceRow!.id;
        return applied;
      })
      .catch((error: unknown) => {
        if (error instanceof DryRunDone) {
          return error.outcome;
        }
        throw error;
      });
    report.counts = outcome.counts;
    report.missingFromSource = outcome.missingFromSource;
    report.status = dryRun ? "dry_run" : "applied";
  } catch (error) {
    report.status = "failed";
    report.sourceId = null;
    report.problems =
      error instanceof RunFailed
        ? error.problems
        : [error instanceof Error ? describeDbError(error) : String(error)];
  }

  await db
    .update(placeImportRuns)
    .set({
      status: report.status,
      sourceId: report.sourceId,
      report: {
        contentSha256: report.contentSha256,
        counts: report.counts,
        quarantined: report.quarantined,
        missingFromSource: report.missingFromSource,
        problems: report.problems,
      },
      finishedAt: new Date(),
    })
    .where(eq(placeImportRuns.id, report.runId));
  return report;
}

/** The database's own words for a refused write, when it has them. */
function describeDbError(error: Error): string {
  const cause = (error as { cause?: { message?: string; constraint?: string } }).cause;
  if (cause?.constraint) {
    return `the database refused it (${cause.constraint}): ${cause.message ?? error.message}`;
  }
  return cause?.message ?? error.message;
}

/** The name a place's path segment is built from: its own name, in the pack's languages first. */
function slugName(place: BatchJurisdiction, pack: CountryPack): string {
  const own = place.names.filter((n) => n.nameType === "self" && n.validTo === null);
  for (const locale of pack.defaultLocales) {
    const name = own.find((n) => n.locale === locale);
    if (name) {
      return name.name;
    }
  }
  return (own[0] ?? place.names[0]!).name;
}

async function resolveRefs(tx: Tx, refs: ExternalRef[]): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  if (refs.length === 0) {
    return resolved;
  }
  const wanted = new Set(refs.map(refKey));
  const rows = await tx
    .select({
      scheme: jurisdictionIdentifiers.scheme,
      value: jurisdictionIdentifiers.value,
      jurisdictionId: jurisdictionIdentifiers.jurisdictionId,
    })
    .from(jurisdictionIdentifiers)
    .where(
      and(
        inArray(jurisdictionIdentifiers.scheme, [...new Set(refs.map((r) => r.scheme))]),
        inArray(jurisdictionIdentifiers.value, [...new Set(refs.map((r) => r.value))]),
        isNull(jurisdictionIdentifiers.supersededAt),
      ),
    );
  for (const row of rows) {
    if (wanted.has(refKey(row))) {
      resolved.set(refKey(row), row.jurisdictionId);
    }
  }
  return resolved;
}

async function applyBatch(
  tx: Tx,
  config: PlacesConfig,
  pack: CountryPack,
  source: Source,
  batch: ImportBatch,
  sourceId: string,
): Promise<ApplyOutcome> {
  const counts = noChanges();
  const now = new Date();
  const ids = await resolveRefs(tx, [
    ...batch.jurisdictions.flatMap((j) => [j.ref, ...j.identifiers]),
    ...batch.relations.flatMap((r) => [r.from, r.to]),
    ...batch.facts.map((f) => f.jurisdiction),
    ...batch.jurisdictions.flatMap((j) => j.names.flatMap((n) => (n.usedBy ? [n.usedBy] : []))),
  ]);
  const idOf = (ref: ExternalRef, where: string): string => {
    const id = ids.get(refKey(ref));
    if (!id) {
      throw new RunFailed([`${where}: no place is known by ${refKey(ref)}`]);
    }
    return id;
  };

  // --- Places: new ones get a row, a path and their identifier. ---
  // The current parent, or for a place that has ended, the last one it had.
  const currentParent = new Map(
    batch.relations
      .filter((r) => r.relation === "part_of")
      .sort((a, b) => (a.validTo ?? "9999").localeCompare(b.validTo ?? "9999"))
      .map((r) => [refKey(r.from), r.to]),
  );
  const byRef = new Map(batch.jurisdictions.map((j) => [refKey(j.ref), j]));
  const paths = new Map<string, string>();
  const takenPaths = new Set<string>();
  const pathOf = async (place: BatchJurisdiction, depth = 0): Promise<string> => {
    const key = refKey(place.ref);
    const known = paths.get(key);
    if (known) {
      return known;
    }
    if (depth > pack.levels.length) {
      throw new RunFailed([`place ${key}: its parents loop`]);
    }
    let parentPath: string | null = null;
    const parentRef = currentParent.get(key);
    if (parentRef) {
      const recordedParent = ids.get(refKey(parentRef));
      const parentInBatch = byRef.get(refKey(parentRef));
      if (recordedParent) {
        const [row] = await tx
          .select({ slugPath: jurisdictions.slugPath })
          .from(jurisdictions)
          .where(eq(jurisdictions.id, recordedParent));
        parentPath = row?.slugPath ?? null;
      } else if (parentInBatch) {
        parentPath = await pathOf(parentInBatch, depth + 1);
      } else {
        throw new RunFailed([`place ${key}: no place is known by ${refKey(parentRef)}`]);
      }
    }
    const segment =
      slugSegment(slugName(place, pack), pack.slug.transliterate) ??
      slugSegment(place.ref.value, true) ??
      place.ref.value;
    const isRoot = pack.levels.some(
      (l) => l.key === place.levelKey && l.parent === null && !l.overlaps,
    );
    let path = isRoot ? pack.key : `${parentPath ?? pack.key}/${segment}`;
    if (takenPaths.has(path)) {
      path = `${path}-${slugSegment(place.ref.value, true) ?? place.ref.value}`;
    }
    takenPaths.add(path);
    paths.set(key, path);
    return path;
  };

  const existingPaths = new Set(
    (
      await tx
        .select({ slugPath: jurisdictions.slugPath })
        .from(jurisdictions)
        .where(eq(jurisdictions.countryPack, pack.key))
    ).flatMap((r) => (r.slugPath ? [r.slugPath] : [])),
  );
  for (const path of existingPaths) {
    takenPaths.add(path);
  }

  for (const place of batch.jurisdictions) {
    const key = refKey(place.ref);
    const existingId = ids.get(key);
    if (existingId) {
      const [row] = await tx.select().from(jurisdictions).where(eq(jurisdictions.id, existingId));
      if (
        row &&
        (row.levelKey !== place.levelKey ||
          row.validFrom !== place.validFrom ||
          row.validTo !== place.validTo)
      ) {
        await tx
          .update(jurisdictions)
          .set({ levelKey: place.levelKey, validFrom: place.validFrom, validTo: place.validTo })
          .where(eq(jurisdictions.id, existingId));
        counts.placesUpdated += 1;
      }
      continue;
    }
    // A new place's path is fixed when it is first recorded, so links to it hold.
    const path = await pathOf(place);
    const [row] = await tx
      .insert(jurisdictions)
      .values({
        origin: "state",
        countryPack: pack.key,
        levelKey: place.levelKey,
        slugPath: path,
        validFrom: place.validFrom,
        validTo: place.validTo,
      })
      .returning({ id: jurisdictions.id });
    ids.set(key, row!.id);
    counts.placesInserted += 1;
  }
  const placeIds = batch.jurisdictions.map((j) => ids.get(refKey(j.ref))!);

  // --- Identifiers: what this source states replaces what it stated before. ---
  const currentIdentifiers = await tx
    .select({
      id: jurisdictionIdentifiers.id,
      jurisdictionId: jurisdictionIdentifiers.jurisdictionId,
      scheme: jurisdictionIdentifiers.scheme,
      value: jurisdictionIdentifiers.value,
      validFrom: jurisdictionIdentifiers.validFrom,
      validTo: jurisdictionIdentifiers.validTo,
      sourceKey: sources.sourceKey,
    })
    .from(jurisdictionIdentifiers)
    .innerJoin(sources, eq(sources.id, jurisdictionIdentifiers.sourceId))
    .where(
      and(
        inArray(jurisdictionIdentifiers.jurisdictionId, placeIds),
        isNull(jurisdictionIdentifiers.supersededAt),
      ),
    );
  const identifierKey = (r: {
    jurisdictionId: string;
    scheme: string;
    value: string;
    validFrom: string | null;
    validTo: string | null;
  }) => canonical([r.jurisdictionId, r.scheme, r.value, r.validFrom, r.validTo]);
  const wantedIdentifiers = batch.jurisdictions.flatMap((place) => {
    const jurisdictionId = ids.get(refKey(place.ref))!;
    const extra = place.identifiers.map((i) => ({ jurisdictionId, ...i }));
    const own = extra.some((i) => i.scheme === place.ref.scheme && i.value === place.ref.value)
      ? []
      : [{ jurisdictionId, ...place.ref, validFrom: place.validFrom, validTo: null }];
    return [...own, ...extra];
  });
  const wantedIdentifierKeys = new Set(wantedIdentifiers.map(identifierKey));
  const haveIdentifierKeys = new Set(currentIdentifiers.map(identifierKey));
  const staleIdentifiers = currentIdentifiers.filter(
    (r) => r.sourceKey === source.key && !wantedIdentifierKeys.has(identifierKey(r)),
  );
  if (staleIdentifiers.length > 0) {
    await tx
      .update(jurisdictionIdentifiers)
      .set({ supersededAt: now })
      .where(
        inArray(
          jurisdictionIdentifiers.id,
          staleIdentifiers.map((r) => r.id),
        ),
      );
    counts.identifiersSuperseded += staleIdentifiers.length;
  }
  const newIdentifiers = wantedIdentifiers.filter((r) => !haveIdentifierKeys.has(identifierKey(r)));
  if (newIdentifiers.length > 0) {
    await tx
      .insert(jurisdictionIdentifiers)
      .values(newIdentifiers.map((r) => ({ ...r, sourceId })));
    counts.identifiersInserted += newIdentifiers.length;
  }

  // --- Names: attributed to this source; what it no longer states is superseded. ---
  const currentNames = await tx
    .select({
      id: jurisdictionNames.id,
      jurisdictionId: jurisdictionNames.jurisdictionId,
      locale: jurisdictionNames.locale,
      script: jurisdictionNames.script,
      name: jurisdictionNames.name,
      nameType: jurisdictionNames.nameType,
      usedById: jurisdictionNames.usedById,
      validFrom: jurisdictionNames.validFrom,
      validTo: jurisdictionNames.validTo,
    })
    .from(jurisdictionNames)
    .innerJoin(sources, eq(sources.id, jurisdictionNames.sourceId))
    .where(
      and(
        inArray(jurisdictionNames.jurisdictionId, placeIds),
        eq(sources.sourceKey, source.key),
        isNull(jurisdictionNames.supersededAt),
      ),
    );
  const nameKey = (r: {
    jurisdictionId: string;
    locale: string;
    script: string | null;
    name: string;
    nameType: string;
    usedById: string | null;
    validFrom: string | null;
    validTo: string | null;
  }) =>
    canonical([
      r.jurisdictionId,
      r.locale,
      r.script,
      r.name,
      r.nameType,
      r.usedById,
      r.validFrom,
      r.validTo,
    ]);
  const wantedNames = batch.jurisdictions.flatMap((place) =>
    place.names.map((n) => ({
      jurisdictionId: ids.get(refKey(place.ref))!,
      locale: n.locale,
      script: n.script,
      name: n.name,
      nameType: n.nameType,
      usedById: n.usedBy ? idOf(n.usedBy, `name "${n.name}"`) : null,
      validFrom: n.validFrom,
      validTo: n.validTo,
    })),
  );
  const wantedNameKeys = new Set(wantedNames.map(nameKey));
  const haveNameKeys = new Set(currentNames.map(nameKey));
  const staleNames = currentNames.filter((r) => !wantedNameKeys.has(nameKey(r)));
  if (staleNames.length > 0) {
    await tx
      .update(jurisdictionNames)
      .set({ supersededAt: now })
      .where(
        inArray(
          jurisdictionNames.id,
          staleNames.map((r) => r.id),
        ),
      );
    counts.namesSuperseded += staleNames.length;
  }
  const newNames = wantedNames.filter((r) => !haveNameKeys.has(nameKey(r)));
  if (newNames.length > 0) {
    await tx.insert(jurisdictionNames).values(newNames.map((r) => ({ ...r, sourceId })));
    counts.namesInserted += newNames.length;
  }

  // --- Relations: end or supersede first, so "one current parent" holds throughout. ---
  // A source may state relations of places it does not list (a register of mergers).
  const relationScope = [
    ...new Set([
      ...placeIds,
      ...batch.relations.map((r) => idOf(r.from, `relation ${r.relation}`)),
    ]),
  ];
  const currentRelations = await tx
    .select({
      id: jurisdictionRelations.id,
      fromId: jurisdictionRelations.fromId,
      toId: jurisdictionRelations.toId,
      relation: jurisdictionRelations.relation,
      validFrom: jurisdictionRelations.validFrom,
      validTo: jurisdictionRelations.validTo,
    })
    .from(jurisdictionRelations)
    .innerJoin(sources, eq(sources.id, jurisdictionRelations.sourceId))
    .where(
      and(
        inArray(jurisdictionRelations.fromId, relationScope),
        eq(sources.sourceKey, source.key),
        isNull(jurisdictionRelations.supersededAt),
      ),
    );
  const relationKey = (r: {
    fromId: string;
    toId: string;
    relation: string;
    validFrom: string | null;
  }) => canonical([r.fromId, r.toId, r.relation, r.validFrom]);
  const wantedRelations = batch.relations.map((r) => ({
    fromId: idOf(r.from, `relation ${r.relation}`),
    toId: idOf(r.to, `relation ${r.relation}`),
    relation: r.relation,
    validFrom: r.validFrom,
    validTo: r.validTo,
  }));
  const wantedByKey = new Map(wantedRelations.map((r) => [relationKey(r), r]));
  const haveByKey = new Map(currentRelations.map((r) => [relationKey(r), r]));
  for (const have of currentRelations) {
    const want = wantedByKey.get(relationKey(have));
    if (!want) {
      await tx
        .update(jurisdictionRelations)
        .set({ supersededAt: now })
        .where(eq(jurisdictionRelations.id, have.id));
      counts.relationsSuperseded += 1;
    } else if (want.validTo !== have.validTo) {
      if (have.validTo === null) {
        await tx
          .update(jurisdictionRelations)
          .set({ validTo: want.validTo })
          .where(eq(jurisdictionRelations.id, have.id));
        counts.relationsEnded += 1;
      } else {
        await tx
          .update(jurisdictionRelations)
          .set({ supersededAt: now })
          .where(eq(jurisdictionRelations.id, have.id));
        haveByKey.delete(relationKey(have));
        counts.relationsSuperseded += 1;
      }
    }
  }
  const newRelations = wantedRelations.filter((r) => !haveByKey.has(relationKey(r)));
  if (newRelations.length > 0) {
    await tx.insert(jurisdictionRelations).values(newRelations.map((r) => ({ ...r, sourceId })));
    counts.relationsInserted += newRelations.length;
  }

  // --- Facts: per period; a changed value supersedes, it never overwrites. ---
  const metrics = new Map(config.metrics.map((m) => [m.key, m]));
  const factIds = [...new Set(batch.facts.map((f) => idOf(f.jurisdiction, `fact ${f.metricKey}`)))];
  const currentFacts =
    factIds.length === 0
      ? []
      : await tx
          .select()
          .from(facts)
          .where(and(inArray(facts.jurisdictionId, factIds), isNull(facts.supersededAt)));
  const factKey = (r: {
    jurisdictionId: string;
    metricKey: string;
    variant: string | null;
    validFrom: string;
  }) => canonical([r.jurisdictionId, r.metricKey, r.variant, r.validFrom]);
  const haveFacts = new Map(currentFacts.map((r) => [factKey(r), r]));
  for (const fact of batch.facts) {
    const row = {
      jurisdictionId: idOf(fact.jurisdiction, `fact ${fact.metricKey}`),
      metricKey: fact.metricKey,
      variant: fact.variant,
      validFrom: fact.validFrom,
      validTo: fact.validTo,
      valueNumeric: typeof fact.value === "number" ? String(fact.value) : null,
      valueJson: typeof fact.value === "number" ? null : fact.value,
      currency: typeof fact.value === "number" ? null : fact.value.currency,
      unit: metrics.get(fact.metricKey)?.unit ?? null,
    };
    const have = haveFacts.get(factKey(row));
    if (have) {
      const same =
        have.validTo === row.validTo &&
        have.currency === row.currency &&
        (row.valueNumeric !== null
          ? have.valueNumeric !== null && Number(have.valueNumeric) === Number(row.valueNumeric)
          : canonical(have.valueJson) === canonical(row.valueJson));
      if (same) {
        continue;
      }
      await tx.update(facts).set({ supersededAt: now }).where(eq(facts.id, have.id));
      counts.factsSuperseded += 1;
    }
    await tx.insert(facts).values({ ...row, sourceId, method: "imported" });
    counts.factsInserted += 1;
  }

  // --- Current places this source knew and no longer mentions: reported, never ended here. ---
  const known = await tx
    .selectDistinct({
      jurisdictionId: jurisdictionIdentifiers.jurisdictionId,
      slugPath: jurisdictions.slugPath,
    })
    .from(jurisdictionIdentifiers)
    .innerJoin(sources, eq(sources.id, jurisdictionIdentifiers.sourceId))
    .innerJoin(jurisdictions, eq(jurisdictions.id, jurisdictionIdentifiers.jurisdictionId))
    .where(
      and(
        eq(sources.sourceKey, source.key),
        isNull(jurisdictionIdentifiers.supersededAt),
        eq(jurisdictions.origin, "state"),
        isNull(jurisdictions.validTo),
      ),
    );
  const inBatch = new Set(placeIds);
  const missingFromSource = known
    .filter((r) => !inBatch.has(r.jurisdictionId))
    .map((r) => r.slugPath ?? r.jurisdictionId);

  return { counts, missingFromSource };
}

/** The pack's current hierarchy, checked against its level declarations. */
async function packInvariants(tx: Tx, pack: CountryPack): Promise<string[]> {
  const places = await tx
    .select({
      id: jurisdictions.id,
      levelKey: jurisdictions.levelKey,
      slugPath: jurisdictions.slugPath,
    })
    .from(jurisdictions)
    .where(and(eq(jurisdictions.countryPack, pack.key), isNull(jurisdictions.validTo)));
  const ids = places.map((p) => p.id);
  const edges =
    ids.length === 0
      ? []
      : await tx
          .select({ childId: jurisdictionRelations.fromId, parentId: jurisdictionRelations.toId })
          .from(jurisdictionRelations)
          .where(
            and(
              inArray(jurisdictionRelations.fromId, ids),
              eq(jurisdictionRelations.relation, "part_of"),
              isNull(jurisdictionRelations.validTo),
              isNull(jurisdictionRelations.supersededAt),
            ),
          );
  return hierarchyProblems(
    pack,
    places.map((p) => ({ id: p.id, levelKey: p.levelKey, label: p.slugPath ?? p.id })),
    edges,
  );
}
