import { importBatchSchema, type ImportBatch } from "../importer/batch";
import type { Adapter } from "./types";

/**
 * Reads a batch already in the generic shape: hand-written, reviewed data
 * with a source of its own (the dispute fixtures of P4), and every test of
 * the framework itself.
 */
export const fixtureAdapter: Adapter<ImportBatch> = {
  key: "fixture",
  version: "1",
  schema: importBatchSchema,
  map: (batch) => batch,
};
