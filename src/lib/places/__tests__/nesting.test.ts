import { describe, expect, it } from "vitest";
import { nestPlaces } from "../nesting";

const map = (o: Record<string, string[]>) =>
  new Map(Object.entries(o).map(([k, v]) => [k, new Set(v)]));

describe("nesting places a source lists flat", () => {
  it("puts each under its nearest listed ancestor", () => {
    // A department in its region; the region in nothing listed.
    const { parentOf, tierOf } = nestPlaces(
      ["FR-ARA", "FR-01", "FR-GES", "FR-6AE", "FR-67"],
      map({ "FR-01": ["FR-ARA"], "FR-6AE": ["FR-GES"], "FR-67": ["FR-6AE", "FR-GES"] }),
      3,
    );
    expect(parentOf.get("FR-01")).toBe("FR-ARA");
    expect(parentOf.get("FR-67")).toBe("FR-6AE");
    expect(parentOf.has("FR-ARA")).toBe(false);
    expect([tierOf("FR-ARA"), tierOf("FR-01"), tierOf("FR-67")]).toEqual([0, 1, 2]);
  });

  it("skips an ancestor that is not listed, and caps the depth", () => {
    const { parentOf, tierOf } = nestPlaces(
      ["A", "C", "D"],
      map({ C: ["B", "A"], D: ["C", "B", "A"] }),
      2,
    );
    expect(parentOf.get("C")).toBe("A");
    // Three deep with two tiers: D hangs from A, still above it.
    expect(parentOf.get("D")).toBe("A");
    expect(tierOf("D")).toBe(1);
  });

  it("puts a place two equal ancestors both claim under what they share, not under one of them", () => {
    const { parentOf } = nestPlaces(
      ["BA-BIH", "BA-SRP", "BA-BRC", "R", "P", "Q", "S"],
      map({ "BA-BRC": ["BA-BIH", "BA-SRP"], P: ["R"], Q: ["R"], S: ["P", "Q", "R"] }),
      3,
    );
    expect(parentOf.has("BA-BRC")).toBe(false);
    expect(parentOf.get("S")).toBe("R");
  });

  it("breaks a cycle in the statements", () => {
    const { parentOf } = nestPlaces(["X", "Y"], map({ X: ["Y"], Y: ["X"] }), 3);
    expect([...parentOf].some(([a, b]) => parentOf.get(b) === a)).toBe(false);
  });
});
