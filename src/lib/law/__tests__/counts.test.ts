import { describe, expect, it } from "vitest";
import { LAW_AUTHORITIES, countryOf } from "@/lib/config/law";
import { countOf, heldOf, rollUp } from "../counts";
import { globeActs } from "../globe";
import { chainOf } from "../places";

describe("law counts", () => {
  it("counts a place's own law apart from everything within it", () => {
    const counts = rollUp(
      new Map([
        ["li", 3_412],
        ["li7001", 30],
        ["li7002", 306],
      ]),
    );
    expect(countOf(counts, "li", "own")).toBe(3_412);
    expect(countOf(counts, "li", "within")).toBe(3_748);
    expect(countOf(counts, "li7001", "own")).toBe(30);
    expect(countOf(counts, "li7001", "within")).toBe(30);
  });

  it("gives a country that holds no law of its own the law within it, not nothing", () => {
    const counts = rollUp(new Map([["li7001", 30]]));
    expect(countOf(counts, "li", "own")).toBe(0);
    expect(countOf(counts, "li", "within")).toBe(30);
  });

  it("puts a country's law within the union above it", () => {
    const counts = rollUp(
      new Map([
        ["ee", 10],
        ["eu", 5],
      ]),
    );
    expect(countOf(counts, "eu", "own")).toBe(5);
    expect(countOf(counts, "eu", "within")).toBe(15);
  });

  it("counts an authority nobody holds law for as zero", () => {
    expect(countOf(rollUp(new Map()), "li", "within")).toBe(0);
    expect(countOf(rollUp(new Map()), "no-such-authority", "own")).toBe(0);
  });

  it("never counts within less than own, and within is own plus the authorities below", () => {
    const held = new Map(LAW_AUTHORITIES.map((a, i) => [a.key, i % 7]));
    const counts = rollUp(held);
    for (const a of LAW_AUTHORITIES) {
      const c = counts.get(a.key) ?? { own: 0, within: 0 };
      expect(c.within, a.key).toBeGreaterThanOrEqual(c.own);
      const below = LAW_AUTHORITIES.filter(
        (b) => b.key !== a.key && chainOf(b.key).some((x) => x.key === a.key),
      ).reduce((sum, b) => sum + (held.get(b.key) ?? 0), 0);
      expect(c.within, a.key).toBe((held.get(a.key) ?? 0) + below);
    }
  });

  it("agrees with the figures the globe has always drawn for a country", () => {
    const held = new Map(LAW_AUTHORITIES.map((a, i) => [a.key, (i * 13) % 50]));
    const counts = rollUp(held);
    for (const a of LAW_AUTHORITIES.filter((x) => x.place?.scheme === "iso_3166_1")) {
      // The globe's own sum before it read counts.ts: every authority in the country, by its code.
      const below = [...held].reduce(
        (sum, [k, n]) => sum + (k !== a.key && countryOf(k) === a.place!.value ? n : 0),
        0,
      );
      const own = held.get(a.key) ?? 0;
      expect(globeActs(counts, a.key), a.key).toEqual({ acts: own + below, own, below });
    }
  });

  it("builds every count from the acts whose text is held", () => {
    // The register lists more acts in force than Solon holds the text of; the count is of texts held.
    const row = (key: string, inForce: number, withText: number) => ({
      key,
      name: key,
      inForce,
      notInForce: 0,
      statusNotStated: 0,
      withText,
    });
    const held = heldOf({ authorities: [row("li", 3_500, 3_412), row("li7001", 40, 30)] });
    expect([...held]).toEqual([
      ["li", 3_412],
      ["li7001", 30],
    ]);
  });
});
