import type { z } from "zod";
import type { CountryPack, Source } from "@/lib/config/places/schema";
import type { ImportBatch } from "../importer/batch";

/** One request the framework makes to fetch a source (design §8.3, step 1). */
export interface RetrievalRequest {
  url: string;
}

export interface MapContext<Options> {
  source: Source;
  pack: CountryPack | undefined;
  /** `source.options`, parsed with the adapter's `options` schema. */
  options: Options;
  /** Where these bytes came from, when known. */
  retrieval: { url: string | null };
  /** Leaves a row out on purpose; the run's report lists it with the reason. */
  skip: (row: string, reason: string) => void;
}

/**
 * One adapter per source format (design §8.3). An adapter only parses and
 * maps; the framework owns fetching, snapshots, diffing, applying and
 * invariants, so no adapter reimplements them.
 *
 * An adapter knows its format (column names, codes) and nothing about the
 * world: which levels, schemes and places its rows become is the source's
 * `options`, in config.
 */
export interface Adapter<Parsed = unknown, Options = unknown> {
  /** The `adapter` key sources name in the registry. */
  key: string;
  /** Recorded on every `sources` row it produces. Bump when the mapping changes. */
  version: string;
  /** Bytes to a value the schema can check; JSON by default. */
  decode?: (bytes: Uint8Array) => unknown;
  /** A format change fails here, loudly. */
  schema: z.ZodType<Parsed>;
  /** Checks `source.options`; absent when the adapter takes none. */
  options?: z.ZodType<Options>;
  /**
   * What to fetch, in the order to import it, for a scheduled run on `today`
   * (ISO date). Absent: the source is handed in as a file. Rerunning it must
   * change nothing when the source has not changed.
   */
  retrievals?: (options: Options, today: string) => RetrievalRequest[];
  /**
   * The history to load once, before the first scheduled run: older states of
   * the source, oldest first. Not refetched by schedule, since importing an
   * older state after a newer one would restate the past as current.
   */
  backfill?: (options: Options, today: string) => RetrievalRequest[];
  map: (parsed: Parsed, context: MapContext<Options>) => ImportBatch;
}
