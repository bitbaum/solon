/**
 * Searching the provisions against a real database. Runs only with INTEGRATION=1
 * against a migrated one (the full-text index is part of migration 0018).
 */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { searchProvisions } from "../search";

const RUN = process.env.INTEGRATION === "1";

describe.skipIf(!RUN)("searchProvisions", () => {
  it("returns nothing for an empty or unmatched question", async () => {
    expect(await searchProvisions(db, { q: "   " })).toEqual([]);
    expect(await searchProvisions(db, { q: "qzxwvkjh" })).toEqual([]);
  });

  it("never returns more than the limit asked, capped", async () => {
    const hits = await searchProvisions(db, { q: "der OR die OR das", limit: 3 });
    expect(hits.length).toBeLessThanOrEqual(3);
    for (const hit of hits) {
      expect(hit.contentSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(hit.path).not.toBe("");
    }
  });
});
