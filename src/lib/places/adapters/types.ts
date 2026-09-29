import type { z } from "zod";
import type { CountryPack, Source } from "@/lib/config/places/schema";
import type { ImportBatch } from "../importer/batch";

/**
 * One adapter per source format (design §8.3). An adapter only parses and
 * maps; the framework owns snapshots, diffing, applying and invariants, so no
 * adapter reimplements them.
 */
export interface Adapter<Parsed = unknown> {
  /** The `adapter` key sources name in the registry. */
  key: string;
  /** Recorded on every `sources` row it produces. Bump when the mapping changes. */
  version: string;
  /** Bytes to a value the schema can check; JSON by default. */
  decode?: (bytes: Uint8Array) => unknown;
  /** A format change fails here, loudly. */
  schema: z.ZodType<Parsed>;
  map: (parsed: Parsed, context: { source: Source; pack: CountryPack | undefined }) => ImportBatch;
}
