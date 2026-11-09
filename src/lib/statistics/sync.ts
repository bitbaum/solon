/**
 * Write the curated statistics records into the append-only log. A record new
 * or changed in config gets an `asserted` row; a record config no longer
 * holds, and which config asserted, gets a `retracted` row. Nothing is
 * updated or deleted (the database refuses it). Rerunning with no change in
 * config writes nothing.
 */
import { and, desc, inArray, isNull } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { jurisdictionIdentifiers } from "@/lib/db/places-schema";
import { statisticRecords } from "@/lib/db/statistics-schema";
import { canonicalJson } from "@/lib/domain/canonical";
import type { CuratedRecord } from "./records";

export interface StatisticsSyncReport {
  asserted: string[];
  retracted: string[];
  unchanged: number;
  /** Records left out this time, with why: their place is not in Places yet. */
  skipped: { key: string; reason: string }[];
}

export const CONFIG_ASSERTER_PREFIX = "config:";

/** The place a record names, or null when it holds wherever the metric is read. */
const placeOf = (record: CuratedRecord) => record.body.place;

const fingerprint = (row: {
  metricKey: string | null;
  jurisdictionId: string | null;
  body: unknown;
}) => canonicalJson([row.metricKey, row.jurisdictionId, row.body]);

export async function syncStatisticRecords(
  db: Database,
  records: readonly CuratedRecord[],
  {
    gitSha,
    check = false,
    within = "",
  }: {
    gitSha: string | null;
    check?: boolean;
    /** Only records whose key starts with this are retracted (a test's own). */
    within?: string;
  },
): Promise<StatisticsSyncReport> {
  const report: StatisticsSyncReport = { asserted: [], retracted: [], unchanged: 0, skipped: [] };
  const asserter = `${CONFIG_ASSERTER_PREFIX}${gitSha ?? "unknown"}`;

  return db.transaction(async (tx) => {
    const refs = records.flatMap((r) => (placeOf(r) ? [placeOf(r)!] : []));
    const places = new Map<string, string>();
    if (refs.length > 0) {
      const rows = await tx
        .select({
          scheme: jurisdictionIdentifiers.scheme,
          value: jurisdictionIdentifiers.value,
          id: jurisdictionIdentifiers.jurisdictionId,
        })
        .from(jurisdictionIdentifiers)
        .where(
          and(
            inArray(jurisdictionIdentifiers.scheme, [...new Set(refs.map((r) => r.scheme))]),
            inArray(jurisdictionIdentifiers.value, [...new Set(refs.map((r) => r.value))]),
            isNull(jurisdictionIdentifiers.supersededAt),
          ),
        );
      for (const row of rows) places.set(`${row.scheme}:${row.value}`, row.id);
    }

    // The latest row of every record; earlier rows are history.
    const latest = new Map<string, typeof statisticRecords.$inferSelect>();
    for (const row of await tx
      .select()
      .from(statisticRecords)
      .orderBy(desc(statisticRecords.recordedAt), desc(statisticRecords.id))) {
      if (!latest.has(row.recordKey)) latest.set(row.recordKey, row);
    }

    const inserts: (typeof statisticRecords.$inferInsert)[] = [];
    const wanted = new Set<string>();
    for (const record of records) {
      wanted.add(record.key);
      const place = placeOf(record);
      const jurisdictionId = place ? (places.get(`${place.scheme}:${place.value}`) ?? null) : null;
      if (place && !jurisdictionId) {
        report.skipped.push({
          key: record.key,
          reason: `${place.scheme}:${place.value} is not in Places yet`,
        });
        continue;
      }
      const row = { metricKey: record.metric, jurisdictionId, body: record.body };
      const have = latest.get(record.key);
      if (have && have.state === "asserted" && fingerprint(have) === fingerprint(row)) {
        report.unchanged += 1;
        continue;
      }
      inserts.push({
        ...row,
        kind: record.kind,
        recordKey: record.key,
        state: "asserted",
        assertedBy: asserter,
      });
      report.asserted.push(record.key);
    }
    for (const [key, have] of latest) {
      if (
        !key.startsWith(within) ||
        wanted.has(key) ||
        have.state !== "asserted" ||
        !have.assertedBy.startsWith(CONFIG_ASSERTER_PREFIX)
      ) {
        continue;
      }
      inserts.push({
        kind: have.kind,
        recordKey: key,
        state: "retracted",
        metricKey: have.metricKey,
        jurisdictionId: have.jurisdictionId,
        body: have.body,
        assertedBy: asserter,
      });
      report.retracted.push(key);
    }
    if (!check && inserts.length > 0) {
      await tx.insert(statisticRecords).values(inserts);
    }
    return report;
  });
}
