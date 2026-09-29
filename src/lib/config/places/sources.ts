import type { SourceInput } from "./schema";

/**
 * The source registry: one entry per dataset — publisher, licence, cadence and
 * the adapter that reads it (§8.2). Each importer's first task is to confirm
 * the access path, format and licence, then record them here.
 */
export const SOURCES = [] satisfies readonly SourceInput[];
