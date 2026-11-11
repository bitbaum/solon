import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { dueOn, dueSources, firstLoads } from "../schedule";

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

describe("firstLoads", () => {
  const fetchable = (s: { adapter: string }) => s.adapter !== "fixture";
  const today = "2026-11-11";

  it("loads sources never loaded, a few a day, in registry order, skipping those due today", () => {
    const picked = firstLoads(placesConfig, new Set(), today, fetchable, 5);
    expect(picked).toHaveLength(5);
    const order = placesConfig.sources.map((s) => s.key);
    const at = picked.map((s) => order.indexOf(s.key));
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(picked.every((s) => fetchable(s) && !dueOn(s.cadence, today))).toBe(true);
  });

  it("leaves a loaded source to its cadence", () => {
    const loaded = new Set(placesConfig.sources.map((s) => s.key));
    expect(firstLoads(placesConfig, loaded, today, fetchable)).toEqual([]);
  });
});
