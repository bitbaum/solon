/**
 * The import queue against a real run log: a fetch that fails is recorded, the
 * log counts failures in a row, and the queue reads it back.
 *
 * Runs only with INTEGRATION=1 against a migrated database. The log is never
 * deleted from, so a rerun works on the next source in the queue.
 */
import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { placeImportRuns } from "@/lib/db/places-schema";
import { closeAbandonedRuns, drainQueue, failedSince, sourceRuns } from "../importer/queue";
import type { SnapshotStore } from "../importer/snapshots";

const RUN = process.env.INTEGRATION === "1";
const snapshots: SnapshotStore = {
  put: async (sha) => `memory/${sha}`,
  get: async () => {
    throw new Error("not needed here");
  },
};

describe.runIf(RUN)("the import queue", () => {
  it("records a fetch that failed, counts failures in a row, and stops when its time is up", async () => {
    const before = new Date(Date.now() - 1000);
    let calls = 0;
    const report = await drainQueue(db, {
      config: placesConfig,
      snapshots,
      // Time for one source only: the clock jumps an hour once the first is done.
      budgetMs: 60_000,
      now: () => new Date(Date.now() + (calls > 0 ? 3_600_000 : 0)),
      fetchSource: async () => {
        calls += 1;
        throw new Error("publisher is down");
      },
    });
    expect(calls).toBe(1);
    expect(report.queued).toBeGreaterThan(1);
    expect(report.ran).toHaveLength(1);
    const key = report.ran[0]!.source;
    expect(report.ran[0]).toMatchObject({ status: "failed", problems: ["publisher is down"] });

    const state = (await sourceRuns(db)).get(key)!;
    expect(state.latest?.status).toBe("failed");
    expect(state.failuresInARow).toBeGreaterThanOrEqual(1);
    expect((await failedSince(db, before)).some((f) => f.source === key)).toBe(true);

    // An applied run after it ends the row of failures.
    await db.insert(placeImportRuns).values({
      sourceKey: key,
      status: "applied",
      report: {},
      startedAt: new Date(Date.now() + 5_000),
      finishedAt: new Date(Date.now() + 5_000),
    });
    const after = (await sourceRuns(db)).get(key)!;
    expect(after.latest?.status).toBe("applied");
    expect(after.failuresInARow).toBe(0);
  });

  it("counts every failure since the latest applied run, however many", async () => {
    const key = `queue-count-${Date.now()}`;
    const start = Date.now() - 600_000;
    const at = (minutes: number) => new Date(start + minutes * 60_000);
    await db.insert(placeImportRuns).values([
      { sourceKey: key, status: "failed", report: {}, startedAt: at(0), finishedAt: at(0) },
      { sourceKey: key, status: "applied", report: {}, startedAt: at(1), finishedAt: at(1) },
      { sourceKey: key, status: "failed", report: {}, startedAt: at(2), finishedAt: at(2) },
      { sourceKey: key, status: "failed", report: {}, startedAt: at(3), finishedAt: at(3) },
      // A dry run and a run still open say nothing about whether the source loaded.
      { sourceKey: key, status: "dry_run", report: {}, startedAt: at(4), finishedAt: at(4) },
    ]);
    expect((await sourceRuns(db)).get(key)).toEqual({
      latest: { status: "failed", at: at(3) },
      failuresInARow: 2,
    });
  });

  it("closes a run its process left open as failed, once, and reports it", async () => {
    const key = `queue-abandoned-${Date.now()}`;
    const now = new Date();
    const hours = (n: number) => new Date(now.getTime() - n * 3_600_000);
    await db.insert(placeImportRuns).values([
      { sourceKey: key, status: "running", report: {}, startedAt: hours(3) },
      // Still within two budgets: a worker may be at it.
      { sourceKey: `${key}-fresh`, status: "running", report: {}, startedAt: hours(0.5) },
    ]);
    const closed = await closeAbandonedRuns(db, 2 * 3_600_000, now);
    expect(closed).toContain(key);
    expect(closed).not.toContain(`${key}-fresh`);
    expect(await closeAbandonedRuns(db, 2 * 3_600_000, now)).not.toContain(key);
    const reported = await failedSince(db, new Date(now.getTime() - 60_000));
    expect(reported.find((f) => f.source === key)?.problems).toEqual([
      "the run never finished: its process stopped",
    ]);
    expect((await sourceRuns(db)).get(key)).toMatchObject({ failuresInARow: 1 });
  });
});
