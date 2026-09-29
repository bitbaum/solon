/**
 * Testland's register snapshot, as a batch a test may change before encoding
 * it back into bytes for the importer.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { importBatchSchema, type ExternalRef, type ImportBatch } from "@/lib/places/importer/batch";

const SNAPSHOT = join(__dirname, "register-2025.json");

/** A fresh, parsed copy of the 2025 register. */
export function testlandBatch(): ImportBatch {
  return importBatchSchema.parse(JSON.parse(readFileSync(SNAPSHOT, "utf8")));
}

export const encode = (batch: unknown): Uint8Array =>
  new TextEncoder().encode(JSON.stringify(batch));

export const register = (value: string): ExternalRef => ({ scheme: "testland_register", value });
export const OAK_HOLLOW: ExternalRef = { scheme: "testland_hamlet", value: "oakhollow" };
