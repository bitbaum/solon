import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { dueOn, dueSources, importQueue, lastDue, type SourceRuns } from "../schedule";

describe("dueOn", () => {
  it("reads the day fields and leaves the time of day to the timer", () => {
    expect(dueOn("0 4 2 * *", "2026-10-02")).toBe(true);
    expect(dueOn("30 23 2 * *", "2026-10-02")).toBe(true);
    expect(dueOn("0 4 2 * *", "2026-10-03")).toBe(false);
  });

  it("reads months, ranges, lists and steps", () => {
    expect(dueOn("0 4 15 1 *", "2027-01-15")).toBe(true);
    expect(dueOn("0 4 15 1 *", "2026-10-15")).toBe(false);
    expect(dueOn("0 4 1,15 * *", "2026-10-15")).toBe(true);
    expect(dueOn("0 4 */10 * *", "2026-10-21")).toBe(true);
    expect(dueOn("0 4 */10 * *", "2026-10-20")).toBe(false);
    expect(dueOn("0 4 * 1-3 *", "2026-02-10")).toBe(true);
  });

  it("follows cron's weekday rules: 0 and 7 are Sunday, either day field suffices", () => {
    // 2026-10-04 is a Sunday.
    expect(dueOn("0 9 * * 0", "2026-10-04")).toBe(true);
    expect(dueOn("0 9 * * 7", "2026-10-04")).toBe(true);
    expect(dueOn("0 9 * * 1-5", "2026-10-04")).toBe(false);
    expect(dueOn("0 9 1 * 0", "2026-10-04")).toBe(true);
    expect(dueOn("0 9 1 * 1", "2026-10-04")).toBe(false);
  });

  it("refuses what it cannot read rather than guessing", () => {
    expect(() => dueOn("0 4 2 *", "2026-10-02")).toThrow(/five-field/);
    expect(() => dueOn("0 4 L * *", "2026-10-02")).toThrow(/not a cron field/);
  });
});

describe("dueSources", () => {
  it("reads every registered cadence and keeps registry order", () => {
    for (let day = 1; day <= 31; day++) {
      expect(() =>
        dueSources(placesConfig, `2026-01-${String(day).padStart(2, "0")}`),
      ).not.toThrow();
    }
    const keys = dueSources(placesConfig, "2026-10-02").map((s) => s.key);
    expect(keys).toEqual(
      placesConfig.sources.filter((s) => keys.includes(s.key)).map((s) => s.key),
    );
    expect(keys).toContain("bfs-communes-snapshot");
    expect(keys).toContain("bfs-communes-mutations");
  });
});

describe("importQueue", () => {
  const fetchable = (s: { adapter: string }) => s.adapter !== "fixture";
  const now = new Date("2026-11-12T05:00:00Z");
  const source = placesConfig.sources.find((s) => fetchable(s) && s.cadence === "0 4 2 * *")!;
  const queued = (runs: Map<string, SourceRuns>) =>
    importQueue(placesConfig, runs, now, fetchable).some((s) => s.key === source.key);
  const at = (iso: string) => new Date(iso);

  it("finds the last day a cadence names", () => {
    expect(lastDue("0 4 2 * *", "2026-11-12")).toBe("2026-11-02");
    expect(lastDue("0 4 12 * *", "2026-11-12")).toBe("2026-11-12");
    expect(lastDue("0 6 5 1 *", "2026-11-12")).toBe("2026-01-05");
  });

  it("queues a source never loaded, in registry order, and no hand-kept file", () => {
    const queue = importQueue(placesConfig, new Map(), now, fetchable);
    const order = placesConfig.sources.filter(fetchable).map((s) => s.key);
    expect(queue.map((s) => s.key)).toEqual(order);
  });

  it("leaves a source that loaded on or after its day, and queues one that loaded before it", () => {
    const applied = (iso: string) =>
      new Map([
        [source.key, { latest: { status: "applied" as const, at: at(iso) }, failuresInARow: 0 }],
      ]);
    expect(queued(applied("2026-11-02T04:31:00Z"))).toBe(false);
    expect(queued(applied("2026-11-07T10:00:00Z"))).toBe(false);
    expect(queued(applied("2026-10-02T04:31:00Z"))).toBe(true);
  });

  it("tries a failed source again a day later, and a week later after three in a row", () => {
    const failed = (iso: string, inARow: number) =>
      new Map([
        [
          source.key,
          { latest: { status: "failed" as const, at: at(iso) }, failuresInARow: inARow },
        ],
      ]);
    expect(queued(failed("2026-11-12T01:00:00Z", 1))).toBe(false);
    expect(queued(failed("2026-11-11T04:00:00Z", 1))).toBe(true);
    expect(queued(failed("2026-11-10T04:00:00Z", 3))).toBe(false);
    expect(queued(failed("2026-11-04T04:00:00Z", 3))).toBe(true);
  });

  it("does not miss a once-a-day queue's next run by the minutes its start time drifts", () => {
    const failedAt = (iso: string) =>
      new Map([
        [source.key, { latest: { status: "failed" as const, at: at(iso) }, failuresInARow: 1 }],
      ]);
    const runner = (now: string) =>
      importQueue(
        placesConfig,
        failedAt("2026-11-11T06:21:00Z"),
        at(now),
        (s) => s.key === source.key,
      ).length > 0;
    // Failed at 06:21; the next day's run starts at 06:17.
    expect(runner("2026-11-12T06:17:00Z")).toBe(true);
    expect(runner("2026-11-11T18:00:00Z")).toBe(false);
  });
});
