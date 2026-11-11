import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { PROFILE_FIGURES } from "../profile-figures";

describe("profile figures", () => {
  it("names only metrics that exist and are published statistics", () => {
    const statistics = new Set(
      placesConfig.metrics.filter((m) => m.statistic && !m.retired).map((m) => m.key),
    );
    const missing = PROFILE_FIGURES.flatMap((f) => f.metrics).filter((k) => !statistics.has(k));
    expect(missing).toEqual([]);
  });

  it("keys each figure once", () => {
    const keys = PROFILE_FIGURES.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
