/**
 * The second tree against the first: a law authority that names a place
 * resolves to exactly one current jurisdiction (design:
 * docs/design/2026-11-place-navigation.md, "Invariants").
 *
 * Two strengths. Always: no authority resolves to two places. With
 * `PLACES_COMPLETE=1`, for a database that holds every pack in full (the
 * production one): each resolves to exactly one. CI's database holds a cut of
 * the Swiss communes and no pack for countries only the world backbone covers,
 * so "exactly one" there would report data not yet imported, not drift.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { jurisdictionIdentifiers, jurisdictions } from "@/lib/db/places-schema";

const RUN = process.env.INTEGRATION === "1";
const COMPLETE = process.env.PLACES_COMPLETE === "1";

describe.skipIf(!RUN)("law authorities resolve to places", () => {
  it("each names at most one current place, and exactly one when the database is complete", async () => {
    const rows = await db
      .select({
        scheme: jurisdictionIdentifiers.scheme,
        value: jurisdictionIdentifiers.value,
        id: jurisdictionIdentifiers.jurisdictionId,
        validTo: jurisdictionIdentifiers.validTo,
      })
      .from(jurisdictionIdentifiers)
      .innerJoin(jurisdictions, eq(jurisdictions.id, jurisdictionIdentifiers.jurisdictionId))
      .where(and(isNull(jurisdictionIdentifiers.supersededAt), eq(jurisdictions.origin, "state")));
    const today = new Date().toISOString().slice(0, 10);
    const imported = new Set(rows.map((r) => r.scheme));
    const problems: string[] = [];
    for (const a of LAW_AUTHORITIES) {
      if (!a.place || (!COMPLETE && !imported.has(a.place.scheme))) continue;
      const holders = new Set(
        rows
          .filter(
            (r) =>
              r.scheme === a.place!.scheme &&
              r.value === a.place!.value &&
              (r.validTo === null || r.validTo > today),
          )
          .map((r) => r.id),
      );
      if (holders.size > 1 || (COMPLETE && holders.size !== 1)) {
        problems.push(`${a.key} (${a.place.scheme}:${a.place.value}): ${holders.size} places`);
      }
    }
    expect(problems).toEqual([]);
  });
});
