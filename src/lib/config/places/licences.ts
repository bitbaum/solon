import type { Licence } from "./schema";

/**
 * The licence policy: which source licences the register accepts. An importer
 * whose source's licence is not listed here does not run (§8.1).
 *
 * Decided 2026-09-29 (§13): public domain, CC0 and CC BY. No share-alike source
 * (ODbL) before a Register decision admits one, which comes before any
 * OpenStreetMap-derived data.
 *
 * Swiss public bodies publish under terms of use rather than licences, because
 * raw data is mostly not protected by copyright there. The `LicenseRef-`
 * entries are those terms, each the equivalent of a class the decision admits.
 */
export const LICENCES = [
  { spdx: "CC0-1.0", requiresAttribution: false, shareAlike: false },
  { spdx: "PDDL-1.0", requiresAttribution: false, shareAlike: false },
  { spdx: "CC-BY-4.0", requiresAttribution: true, shareAlike: false },
  // opendata.swiss "Open use" (terms_open): free use, citing the source recommended.
  // https://opendata.swiss/en/terms-of-use
  { spdx: "LicenseRef-opendata-swiss-open", requiresAttribution: false, shareAlike: false },
  // opendata.swiss "Open use. Must provide the source." (terms_by): CC BY's obligation.
  { spdx: "LicenseRef-opendata-swiss-by", requiresAttribution: true, shareAlike: false },
  // Swiss official acts, decisions and their official figures (tax tariffs, rates set
  // by a canton or commune) are not protected: Art. 5 URG, SR 231.1. Public domain.
  { spdx: "LicenseRef-ch-official-act", requiresAttribution: false, shareAlike: false },
] satisfies readonly Licence[];
