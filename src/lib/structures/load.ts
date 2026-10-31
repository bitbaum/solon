/** Reads the provisions the structures register cites, as the law stands on a day. */
import type { Database } from "@/lib/db/client";
import { STRUCTURE_KINDS } from "@/lib/config/structures";
import { readProvision } from "@/lib/law/register/coverage";
import { citedProvisions, provisionKey, structureTable, type ProvisionText } from "./view";

export async function loadStructureTable(db: Database, on: string) {
  const cited = citedProvisions(STRUCTURE_KINDS);
  // The texts are held in German so far, as on /law.
  const found = await Promise.all(
    cited.map((c) => readProvision(db, { actId: c.act, path: c.path, lang: "de", on })),
  );
  const provisions = new Map<string, ProvisionText>();
  cited.forEach((c, i) => {
    const hit = found[i];
    if (hit) provisions.set(provisionKey(c), hit);
  });
  return structureTable(STRUCTURE_KINDS, provisions);
}
