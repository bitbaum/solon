import { describe, expect, it } from "vitest";
import {
  addToRanking,
  moveInRanking,
  nudgeDot,
  removeFromRanking,
  setScore,
  spentDots,
  toggleApproval,
} from "../methods/ballot-updates";

/**
 * The regression these exist for: a voter tapping "+" five times quickly had
 * three of the taps silently discarded, because each edit was computed from the
 * ballot as last rendered rather than the ballot as last updated. Found by
 * driving the real UI, not by any test that existed at the time.
 *
 * Chaining each result into the next is exactly what React does with a
 * functional update, so a value-based implementation fails these.
 */
function applyAll<T>(start: unknown, edits: ((prev: unknown) => unknown)[]): unknown {
  return edits.reduce((acc, edit) => edit(acc), start);
}

describe("dot allocation edits", () => {
  it("accumulates a burst of taps instead of keeping only the last", () => {
    const result = applyAll({}, [
      (p) => nudgeDot(p, "solar-roof", 1, 5),
      (p) => nudgeDot(p, "solar-roof", 1, 5),
      (p) => nudgeDot(p, "solar-roof", 1, 5),
      (p) => nudgeDot(p, "heat-pump", 1, 5),
      (p) => nudgeDot(p, "heat-pump", 1, 5),
    ]);
    expect(result).toEqual({
      method: "dot",
      allocations: { "solar-roof": 3, "heat-pump": 2 },
    });
    expect(spentDots(result)).toBe(5);
  });

  it("refuses the tap that would overspend, however fast they arrive", () => {
    const full = applyAll(
      {},
      Array.from({ length: 5 }, () => (p: unknown) => nudgeDot(p, "a", 1, 5)),
    );
    expect(spentDots(full)).toBe(5);
    const overspent = nudgeDot(full, "b", 1, 5);
    expect(spentDots(overspent)).toBe(5);
    expect(overspent).toBe(full); // unchanged, not merely equal
  });

  it("never drops below zero", () => {
    expect(nudgeDot({}, "a", -1, 5)).toEqual({});
  });

  it("frees budget again when dots are taken back", () => {
    const after = applyAll({}, [
      (p) => nudgeDot(p, "a", 1, 2),
      (p) => nudgeDot(p, "a", 1, 2),
      (p) => nudgeDot(p, "a", -1, 2),
      (p) => nudgeDot(p, "b", 1, 2),
    ]);
    expect(after).toEqual({ method: "dot", allocations: { a: 1, b: 1 } });
  });
});

describe("approval edits", () => {
  it("accumulates successive toggles rather than overwriting", () => {
    const result = applyAll({}, [
      (p) => toggleApproval(p, "a"),
      (p) => toggleApproval(p, "b"),
      (p) => toggleApproval(p, "c"),
    ]);
    expect(result).toEqual({ method: "approval", approved: ["a", "b", "c"] });
  });

  it("toggles off without disturbing the others", () => {
    const result = applyAll({}, [
      (p) => toggleApproval(p, "a"),
      (p) => toggleApproval(p, "b"),
      (p) => toggleApproval(p, "a"),
    ]);
    expect(result).toEqual({ method: "approval", approved: ["b"] });
  });
});

describe("score edits", () => {
  it("keeps every option scored in a rapid sequence", () => {
    const result = applyAll({}, [
      (p) => setScore(p, "a", 5),
      (p) => setScore(p, "b", 3),
      (p) => setScore(p, "c", 0),
    ]);
    expect(result).toEqual({ method: "score", scores: { a: 5, b: 3, c: 0 } });
  });
});

describe("ranking edits", () => {
  it("builds a ranking from successive additions", () => {
    const result = applyAll({}, [
      (p) => addToRanking(p, "a"),
      (p) => addToRanking(p, "b"),
      (p) => addToRanking(p, "c"),
    ]);
    expect(result).toEqual({ method: "ranked", ranking: ["a", "b", "c"] });
  });

  it("will not add the same option twice", () => {
    const once = addToRanking({}, "a");
    expect(addToRanking(once, "a")).toBe(once);
  });

  it("moves an entry and leaves the rest in order", () => {
    const start = { ranking: ["a", "b", "c"] };
    expect(moveInRanking(start, 2, -1)).toEqual({ method: "ranked", ranking: ["a", "c", "b"] });
  });

  it("treats an out-of-range move as a no-op", () => {
    const start = { ranking: ["a", "b"] };
    expect(moveInRanking(start, 0, -1)).toBe(start);
    expect(moveInRanking(start, 1, 1)).toBe(start);
  });

  it("removes without disturbing order", () => {
    expect(removeFromRanking({ ranking: ["a", "b", "c"] }, "b")).toEqual({
      method: "ranked",
      ranking: ["a", "c"],
    });
  });
});
