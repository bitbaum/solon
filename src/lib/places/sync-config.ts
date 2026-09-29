/**
 * places:sync-config — project the config registries into the `place_*`
 * tables that facts foreign-key into (design §5.3).
 *
 * Config stays the single producer; the tables exist so the database can
 * enforce integrity. The sync:
 * - inserts new keys and updates changed ones;
 * - marks a key retired when config retires it, or when it vanished from
 *   config and nothing references it — rows are never deleted;
 * - REFUSES to drop a key still referenced, or to change a key in a way the
 *   data it holds cannot survive (a metric's value type; making a scheme
 *   reserved that a founded place already carries), naming the reason;
 * - records what it changed, with the config's hash and the git commit.
 *
 * It runs at the start of every import run, inside the import's transaction,
 * so registries always exist before anything references them; and standalone
 * (`pnpm run places:sync-config`, `--check` in CI).
 */
import { createHash } from "node:crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import type { PlacesConfig } from "@/lib/config/places/schema";
import type { Database, Tx } from "@/lib/db/client";
import {
  facts,
  instruments,
  jurisdictionIdentifiers,
  jurisdictions,
  placeConfigSyncs,
  placeCountryPacks,
  placeIdentifierSchemes,
  placeInstrumentKinds,
  placeLevels,
  placeMetrics,
} from "@/lib/db/places-schema";
import type { MetricValueType } from "./vocabulary";

/** The registry rows config implies, or the database holds. */
export interface RegistryRows {
  packs: { key: string; retired: boolean }[];
  levels: { packKey: string; key: string; parentKey: string | null; retired: boolean }[];
  metrics: { key: string; valueType: MetricValueType; retired: boolean }[];
  identifierSchemes: { key: string; reserved: boolean; retired: boolean }[];
  instrumentKinds: { key: string; retired: boolean }[];
}
export type RegistryName = keyof RegistryRows;

/** Keys the data uses — what a sync may not pull out from under it. */
export interface ReferencedKeys {
  packs: ReadonlySet<string>;
  /** `${packKey}/${levelKey}` */
  levels: ReadonlySet<string>;
  metrics: ReadonlySet<string>;
  identifierSchemes: ReadonlySet<string>;
  /** Schemes a founded or proposed place carries; they may not become reserved. */
  schemesOnNonStatePlaces: ReadonlySet<string>;
  instrumentKinds: ReadonlySet<string>;
}

export type SyncAction = "insert" | "update" | "retire" | "unretire";
export interface SyncChange {
  registry: RegistryName;
  key: string;
  action: SyncAction;
}
export interface SyncPlan {
  changes: SyncChange[];
  /** Why the sync must not run, one sentence each. Empty when it may. */
  refusals: string[];
}

export function projectConfig(config: PlacesConfig): RegistryRows {
  return {
    packs: config.packs.map((pack) => ({ key: pack.key, retired: false })),
    levels: config.packs.flatMap((pack) =>
      pack.levels.map((level) => ({
        packKey: pack.key,
        key: level.key,
        parentKey: level.parent,
        retired: false,
      })),
    ),
    metrics: config.metrics.map((m) => ({
      key: m.key,
      valueType: m.valueType,
      retired: !!m.retired,
    })),
    identifierSchemes: config.identifierSchemes.map((s) => ({
      key: s.key,
      reserved: s.reserved,
      retired: !!s.retired,
    })),
    instrumentKinds: config.instrumentKinds.map((k) => ({ key: k.key, retired: !!k.retired })),
  };
}

const rowKey = (registry: RegistryName, row: { key: string; packKey?: string }): string =>
  registry === "levels" ? `${row.packKey}/${row.key}` : row.key;

/** Whether two rows differ in anything besides retirement. Both are built field by field in one order. */
const contentDiffers = (want: object, have: object): boolean =>
  JSON.stringify({ ...want, retired: undefined }) !==
  JSON.stringify({ ...have, retired: undefined });

/** Pure: the changes that bring `current` to `desired`, and what forbids them. */
export function planSync(
  desired: RegistryRows,
  current: RegistryRows,
  refs: ReferencedKeys,
): SyncPlan {
  const changes: SyncChange[] = [];
  const refusals: string[] = [];
  for (const registry of Object.keys(desired) as RegistryName[]) {
    const want = new Map(desired[registry].map((row) => [rowKey(registry, row), row]));
    const have = new Map(current[registry].map((row) => [rowKey(registry, row), row]));
    const used = refs[registry];

    for (const [key, row] of want) {
      const existing = have.get(key);
      if (!existing) {
        changes.push({ registry, key, action: "insert" });
        if (row.retired) {
          changes.push({ registry, key, action: "retire" });
        }
        continue;
      }
      if (contentDiffers(row, existing)) {
        if (registry === "metrics" && used.has(key)) {
          refusals.push(`metric "${key}" changes its value type, but facts already hold it`);
        } else if (
          registry === "identifierSchemes" &&
          "reserved" in row &&
          row.reserved &&
          refs.schemesOnNonStatePlaces.has(key)
        ) {
          refusals.push(
            `identifier scheme "${key}" cannot become reserved: a founded place carries it`,
          );
        } else {
          changes.push({ registry, key, action: "update" });
        }
      }
      if (row.retired && !existing.retired) {
        changes.push({ registry, key, action: "retire" });
      } else if (!row.retired && existing.retired) {
        changes.push({ registry, key, action: "unretire" });
      }
    }
    for (const [key, existing] of have) {
      if (want.has(key) || existing.retired) {
        continue;
      }
      if (used.has(key)) {
        refusals.push(
          `${registry} "${key}" vanished from config but data still uses it — mark it retired instead`,
        );
      } else {
        changes.push({ registry, key, action: "retire" });
      }
    }
  }
  return { changes, refusals };
}

/** sha256 of the canonical projection — the same config always hashes the same. */
export function configSha256(rows: RegistryRows): string {
  const canonical = Object.fromEntries(
    (Object.keys(rows) as RegistryName[])
      .sort()
      .map((registry) => [
        registry,
        [...rows[registry]].sort((a, b) => rowKey(registry, a).localeCompare(rowKey(registry, b))),
      ]),
  );
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

// Reads run one after another: inside a transaction they share one connection,
// which does not take concurrent queries.
type Executor = Database | Tx;

async function readRegistries(db: Executor): Promise<RegistryRows> {
  const packs = await db.select().from(placeCountryPacks);
  const levels = await db.select().from(placeLevels);
  const metrics = await db.select().from(placeMetrics);
  const schemes = await db.select().from(placeIdentifierSchemes);
  const kinds = await db.select().from(placeInstrumentKinds);
  return {
    packs: packs.map((r) => ({ key: r.key, retired: r.retiredAt !== null })),
    levels: levels.map((r) => ({
      packKey: r.packKey,
      key: r.key,
      parentKey: r.parentKey,
      retired: r.retiredAt !== null,
    })),
    metrics: metrics.map((r) => ({
      key: r.key,
      valueType: r.valueType,
      retired: r.retiredAt !== null,
    })),
    identifierSchemes: schemes.map((r) => ({
      key: r.key,
      reserved: r.reserved,
      retired: r.retiredAt !== null,
    })),
    instrumentKinds: kinds.map((r) => ({ key: r.key, retired: r.retiredAt !== null })),
  };
}

async function readReferences(db: Executor): Promise<ReferencedKeys> {
  const packRows = await db.selectDistinct({ key: jurisdictions.countryPack }).from(jurisdictions);
  const levelRows = await db
    .selectDistinct({ pack: jurisdictions.countryPack, level: jurisdictions.levelKey })
    .from(jurisdictions);
  const metricRows = await db.selectDistinct({ key: facts.metricKey }).from(facts);
  const schemeRows = await db
    .selectDistinct({ key: jurisdictionIdentifiers.scheme })
    .from(jurisdictionIdentifiers);
  const nonStateRows = await db
    .selectDistinct({ key: jurisdictionIdentifiers.scheme })
    .from(jurisdictionIdentifiers)
    .innerJoin(jurisdictions, eq(jurisdictions.id, jurisdictionIdentifiers.jurisdictionId))
    .where(and(ne(jurisdictions.origin, "state"), isNull(jurisdictionIdentifiers.supersededAt)));
  const kindRows = await db.selectDistinct({ key: instruments.kind }).from(instruments);
  const keys = (rows: { key: string | null }[]) =>
    new Set(rows.flatMap((r) => (r.key === null ? [] : [r.key])));
  return {
    packs: keys(packRows),
    levels: new Set(levelRows.flatMap((r) => (r.pack && r.level ? [`${r.pack}/${r.level}`] : []))),
    metrics: keys(metricRows),
    identifierSchemes: keys(schemeRows),
    schemesOnNonStatePlaces: keys(nonStateRows),
    instrumentKinds: keys(kindRows),
  };
}

export class PlacesSyncRefused extends Error {
  constructor(readonly refusals: string[]) {
    super(`places:sync-config refused:\n- ${refusals.join("\n- ")}`);
    this.name = "PlacesSyncRefused";
  }
}

async function applyChanges(tx: Executor, desired: RegistryRows, changes: SyncChange[]) {
  const now = new Date();
  const find = <R extends RegistryName>(registry: R, key: string) =>
    (desired[registry] as { key: string; packKey?: string }[]).find(
      (row) => rowKey(registry, row) === key,
    ) as RegistryRows[R][number] | undefined;
  // Packs first: levels reference them.
  const ordered = [...changes].sort(
    (a, b) => Number(a.registry !== "packs") - Number(b.registry !== "packs"),
  );
  for (const { registry, key, action } of ordered) {
    const retiredAt = action === "retire" ? now : null;
    if (action === "retire" || action === "unretire") {
      if (registry === "levels") {
        const [packKey, levelKey] = key.split("/") as [string, string];
        await tx
          .update(placeLevels)
          .set({ retiredAt })
          .where(and(eq(placeLevels.packKey, packKey), eq(placeLevels.key, levelKey)));
      } else {
        const table = {
          packs: placeCountryPacks,
          metrics: placeMetrics,
          identifierSchemes: placeIdentifierSchemes,
          instrumentKinds: placeInstrumentKinds,
        }[registry];
        await tx.update(table).set({ retiredAt }).where(eq(table.key, key));
      }
      continue;
    }
    switch (registry) {
      case "packs": {
        await tx.insert(placeCountryPacks).values({ key }).onConflictDoNothing();
        break;
      }
      case "levels": {
        const row = find("levels", key)!;
        const values = { packKey: row.packKey, key: row.key, parentKey: row.parentKey };
        await tx
          .insert(placeLevels)
          .values(values)
          .onConflictDoUpdate({ target: [placeLevels.packKey, placeLevels.key], set: values });
        break;
      }
      case "metrics": {
        const row = find("metrics", key)!;
        await tx
          .insert(placeMetrics)
          .values({ key, valueType: row.valueType })
          .onConflictDoUpdate({ target: placeMetrics.key, set: { valueType: row.valueType } });
        break;
      }
      case "identifierSchemes": {
        const row = find("identifierSchemes", key)!;
        await tx
          .insert(placeIdentifierSchemes)
          .values({ key, reserved: row.reserved })
          .onConflictDoUpdate({
            target: placeIdentifierSchemes.key,
            set: { reserved: row.reserved },
          });
        break;
      }
      case "instrumentKinds": {
        await tx.insert(placeInstrumentKinds).values({ key }).onConflictDoNothing();
        break;
      }
    }
  }
}

export interface SyncResult {
  plan: SyncPlan;
  configSha256: string;
  /** False in check mode, or when there was nothing to change. */
  applied: boolean;
}

/**
 * Sync inside an existing transaction — the importer calls this so the
 * registries and the facts that reference them commit together.
 */
export async function syncPlacesConfigIn(
  tx: Executor,
  config: PlacesConfig,
  options: { check?: boolean; gitSha?: string | null } = {},
): Promise<SyncResult> {
  const desired = projectConfig(config);
  const current = await readRegistries(tx);
  const refs = await readReferences(tx);
  const plan = planSync(desired, current, refs);
  const sha = configSha256(desired);
  if (plan.refusals.length > 0) {
    throw new PlacesSyncRefused(plan.refusals);
  }
  if (options.check || plan.changes.length === 0) {
    return { plan, configSha256: sha, applied: false };
  }
  await applyChanges(tx, desired, plan.changes);
  await tx.insert(placeConfigSyncs).values({
    configSha256: sha,
    gitSha: options.gitSha ?? null,
    changes: plan.changes,
  });
  return { plan, configSha256: sha, applied: true };
}

/** Sync in a transaction of its own. */
export function syncPlacesConfig(
  db: Database,
  config: PlacesConfig,
  options: { check?: boolean; gitSha?: string | null } = {},
): Promise<SyncResult> {
  return db.transaction((tx) => syncPlacesConfigIn(tx, config, options));
}
