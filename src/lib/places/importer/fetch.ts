/**
 * Step 1 of the framework for a scheduled run (design §8.3): ask the source's
 * adapter what to retrieve for today, fetch each in turn and import it. The
 * retrievals are imported in the adapter's order and the first failure stops
 * the run, because later retrievals may build on earlier ones (a register's
 * yearly snapshots, then its mergers).
 */
import type { PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { ADAPTERS, type Adapter, type Probe, type RetrievalRequest } from "../adapters";
import { envelopeBytes } from "./envelope";
import { runImport, type ImportReport } from "./run";
import type { GeometryStore } from "./geometry-store";
import type { SnapshotStore } from "./snapshots";

export interface FetchOptions {
  config: PlacesConfig;
  sourceKey: string;
  /** ISO date the retrievals are planned for. */
  today: string;
  snapshots: SnapshotStore;
  geometry?: GeometryStore;
  dryRun?: boolean;
  gitSha?: string | null;
  /** Load the source's history first (adapter `backfill`), then today's state. */
  backfill?: boolean;
  adapters?: ReadonlyMap<string, Adapter>;
  fetchImpl?: typeof fetch;
}

const FETCH_TIMEOUT_MS = 120_000;

async function send(fetchImpl: typeof fetch, request: RetrievalRequest): Promise<Response> {
  const init: RequestInit = { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) };
  if (request.body !== undefined) {
    init.method = "POST";
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(request.body);
  }
  const response = await fetchImpl(request.url, init);
  if (!response.ok) {
    throw new Error(`${describeRequest(request)}: HTTP ${response.status}`);
  }
  return response;
}

/** One line per request: the URL, and the body when it is a POST. */
export const describeRequest = (request: RetrievalRequest): string =>
  request.body === undefined ? request.url : `POST ${request.url} ${JSON.stringify(request.body)}`;

/** What a run of the source fetches, in import order. */
export async function plannedRetrievals(
  config: PlacesConfig,
  sourceKey: string,
  today: string,
  {
    backfill = false,
    adapters = ADAPTERS,
    fetchImpl = fetch,
  }: { backfill?: boolean; adapters?: ReadonlyMap<string, Adapter>; fetchImpl?: typeof fetch } = {},
): Promise<RetrievalRequest[]> {
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
  const probe: Probe = async (request) => (await send(fetchImpl, request)).json();
  return [
    ...(backfill ? ((await adapter.backfill?.(options, today, probe)) ?? []) : []),
    ...(await adapter.retrievals(options, today, probe)),
  ];
}

export async function fetchAndImport(db: Database, options: FetchOptions): Promise<ImportReport[]> {
  const adapters = options.adapters ?? ADAPTERS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const reports: ImportReport[] = [];
  const requests = await plannedRetrievals(options.config, options.sourceKey, options.today, {
    backfill: options.backfill,
    adapters,
    fetchImpl,
  });
  for (const request of requests) {
    const response = await send(fetchImpl, request);
    const bytes =
      request.body === undefined
        ? new Uint8Array(await response.arrayBuffer())
        : envelopeBytes(
            { method: "POST", url: request.url, body: request.body },
            await response.text(),
          );
    const report = await runImport(db, {
      config: options.config,
      sourceKey: options.sourceKey,
      retrieval: {
        bytes,
        url: request.url,
        retrievedAt: new Date(),
        validFrom: request.validFrom ?? null,
      },
      snapshots: options.snapshots,
      geometry: options.geometry,
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
