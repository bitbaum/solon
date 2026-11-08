import { bfsCommunesMutationsAdapter, bfsCommunesSnapshotAdapter } from "./bfs-communes";
import { csvFactsAdapter } from "./csv-facts";
import { csvInstrumentsAdapter } from "./csv-instruments";
import { csvPostcodesAdapter } from "./csv-postcodes";
import { estvSimpleRatesAdapter, estvTaxScalesAdapter } from "./estv-tax-export";
import { fixtureAdapter } from "./fixture";
import { geojsonTiersAdapter } from "./geojson-tiers";
import { oecdSdmxAdapter } from "./oecd-sdmx";
import { shapefileAreasAdapter } from "./shapefile-areas";
import type { Adapter } from "./types";
import { worldbankIndicatorsAdapter } from "./worldbank-indicators";

/** Every adapter, by the key sources name in the registry. */
export const ADAPTERS: ReadonlyMap<string, Adapter> = new Map(
  [
    fixtureAdapter,
    bfsCommunesSnapshotAdapter,
    bfsCommunesMutationsAdapter,
    geojsonTiersAdapter,
    csvFactsAdapter,
    csvPostcodesAdapter,
    csvInstrumentsAdapter,
    estvTaxScalesAdapter,
    estvSimpleRatesAdapter,
    shapefileAreasAdapter,
    worldbankIndicatorsAdapter,
    oecdSdmxAdapter,
  ].map((adapter) => [adapter.key, adapter as Adapter]),
);

export type { Adapter, Probe, RetrievalRequest } from "./types";
