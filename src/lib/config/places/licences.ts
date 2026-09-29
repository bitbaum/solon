import type { Licence } from "./schema";

/**
 * The licence policy: which source licences the register accepts. An importer
 * whose source's licence is not listed here does not run (§8.1).
 *
 * Decided 2026-09-29 (§13): public domain, CC0 and CC BY. No share-alike source
 * (ODbL) before a Register decision admits one, which comes before any
 * OpenStreetMap-derived data.
 */
export const LICENCES = [
  { spdx: "CC0-1.0", requiresAttribution: false, shareAlike: false },
  { spdx: "PDDL-1.0", requiresAttribution: false, shareAlike: false },
  { spdx: "CC-BY-4.0", requiresAttribution: true, shareAlike: false },
] satisfies readonly Licence[];
