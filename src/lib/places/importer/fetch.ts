/**
 * Step 1 of the framework for a scheduled run (design §8.3): ask the source's
 * adapter what to retrieve for today, fetch each in turn and import it. The
 * retrievals are imported in the adapter's order and the first failure stops
 * the run, because later retrievals may build on earlier ones (a register's
 * yearly snapshots, then its mergers).
 */
import type { PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { ADAPTERS, type Adapter } from "../adapters";
import { runImport, type ImportReport } from "./run";
import type { SnapshotStore } from "./snapshots";

export interface FetchOptions {
  config: PlacesConfig;
  sourceKey: string;
  /** ISO date the retrievals are planned for. */
  today: string;
  snapshots: SnapshotStore;
  dryRun?: boolean;
  gitSha?: string | null;
  /** Load the source's history first (adapter `backfill`), then today's state. */
  backfill?: boolean;
  adapters?: ReadonlyMap<string, Adapter>;
  fetchImpl?: typeof fetch;
}

const FETCH_TIMEOUT_MS = 120_000;

/** The URLs a run of the source fetches, in import order. */
export function plannedRetrievals(
  config: PlacesConfig,
  sourceKey: string,
  today: string,
  {
    backfill = false,
    adapters = ADAPTERS,
  }: { backfill?: boolean; adapters?: ReadonlyMap<string, Adapter> } = {},
): string[] {
  const source = config.sources.find((s) => s.key === sourceKey);
  if (!source) {
    throw new Error(`source "${sourceKey}" is not in the source registry`);
  }
  const adapter = adapters.get(source.adapter);
  if (!adapter) {
    throw new Error(`no adapter "${source.adapter}" for source "${sourceKey}"`);
  }
  if (!adapter.retrievals) {
    throw new Error(`adapter "${adapter.key}" is handed files; it does not fetch`);
  }
  const options = adapter.options ? adapter.options.parse(source.options) : undefined;
  return [
    ...(backfill ? (adapter.backfill?.(options, today) ?? []) : []),
    ...adapter.retrievals(options, today),
  ].map((r) => r.url);
}

export async function fetchAndImport(db: Database, options: FetchOptions): Promise<ImportReport[]> {
  const adapters = options.adapters ?? ADAPTERS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const reports: ImportReport[] = [];
  const urls = plannedRetrievals(options.config, options.sourceKey, options.today, {
    backfill: options.backfill,
    adapters,
  });
  for (const url of urls) {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) {
      throw new Error(`${url}: HTTP ${response.status}`);
    }
    const report = await runImport(db, {
      config: options.config,
      sourceKey: options.sourceKey,
      retrieval: {
        bytes: new Uint8Array(await response.arrayBuffer()),
        url,
        retrievedAt: new Date(),
      },
      snapshots: options.snapshots,
      dryRun: options.dryRun,
      gitSha: options.gitSha,
      adapters,
    });
    reports.push(report);
    if (report.status === "failed") {
      break;
    }
  }
  return reports;
}
