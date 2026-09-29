import { bfsCommunesMutationsAdapter, bfsCommunesSnapshotAdapter } from "./bfs-communes";
import { csvFactsAdapter } from "./csv-facts";
import { fixtureAdapter } from "./fixture";
import { geojsonTiersAdapter } from "./geojson-tiers";
import type { Adapter } from "./types";

/** Every adapter, by the key sources name in the registry. */
export const ADAPTERS: ReadonlyMap<string, Adapter> = new Map(
  [
    fixtureAdapter,
    bfsCommunesSnapshotAdapter,
    bfsCommunesMutationsAdapter,
    geojsonTiersAdapter,
    csvFactsAdapter,
  ].map((adapter) => [adapter.key, adapter as Adapter]),
);

export type { Adapter, RetrievalRequest } from "./types";
