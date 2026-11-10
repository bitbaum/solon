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
  /** Wait between one retrieval and the next of the same source; publishers rate-limit bursts (default 1 s). */
  paceMs?: number;
}

const FETCH_TIMEOUT_MS = 120_000;

export async function send(fetchImpl: typeof fetch, request: RetrievalRequest): Promise<Response> {
  // Say who is asking, as the law reader does, and say what is wanted. The OECD's SDMX API
  // answered Node's default request (`accept-language: *`) with 500 and the same request with
  // a plain language and a data type with 200: a gateway rule, not a rate limit (found 2026-11-09).
  const init: RequestInit = {
    headers: {
      "user-agent": "Solon places importer (solon.orangecat.ch)",
      accept: "text/csv, application/json;q=0.9, */*;q=0.5",
      "accept-language": "en",
    },
  };
  if (request.body !== undefined) {
    init.method = "POST";
    init.headers = { ...init.headers, "content-type": "application/json" };
    init.body = JSON.stringify(request.body);
  }
  // A server error is retried five times, backing off from a few seconds: some publishers
  // (the OECD's SDMX API, 2026-11-08) answer 500 now and 200 a moment later.
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetchImpl(request.url, {
      ...init,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (response.ok) {
      return response;
    }
    if (response.status < 500 || attempt >= RETRIES_ON_SERVER_ERROR) {
      throw new Error(`${describeRequest(request)}: HTTP ${response.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs * 2 ** attempt));
  }
}

const RETRIES_ON_SERVER_ERROR = 5;
let retryDelayMs = 4_000;
/** Tests shorten the wait between retries. */
export const setRetryDelayForTests = (ms: number) => {
  retryDelayMs = ms;
};

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
  const paceMs = options.paceMs ?? 1_000;
  for (const [i, request] of requests.entries()) {
    if (i > 0 && paceMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, paceMs));
    }
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
