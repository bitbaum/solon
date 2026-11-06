import { describe, expect, it } from "vitest";
import { ACT_KINDS, LAW_AUTHORITIES } from "@/lib/config/law";
import { OFFICIAL_ROUTES, routesFor } from "@/lib/config/law/routes";

describe("official routes", () => {
  it("are each for a known authority and known kinds of act, with unique keys", () => {
    const keys = OFFICIAL_ROUTES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const route of OFFICIAL_ROUTES) {
      expect(
        LAW_AUTHORITIES.some((a) => a.key === route.authority),
        route.key,
      ).toBe(true);
      expect(route.appliesTo.length, route.key).toBeGreaterThan(0);
      for (const kind of route.appliesTo) expect(ACT_KINDS, route.key).toContain(kind);
    }
  });

  it("each cite the provision that makes them, read on a stated day", () => {
    for (const { key, source } of OFFICIAL_ROUTES) {
      expect(source.url, key).toMatch(/^https:\/\//);
      expect(source.provision.trim(), key).not.toBe("");
      expect(source.readOn, key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("offer a federal statute the petition, and only the Constitution the initiative", () => {
    expect(routesFor("ch", "statute").map((r) => r.key)).toEqual(["ch-petition"]);
    expect(routesFor("ch", "constitution").map((r) => r.key)).toEqual([
      "ch-popular-initiative",
      "ch-petition",
    ]);
    expect(routesFor("gl", "statute")).toEqual([]);
  });
});
