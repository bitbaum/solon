import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { hierarchyProblems, type ParentEdge, type PlaceNode } from "../invariants";
import { withTestland } from "./fixtures/testland/config";

const pack = withTestland(placesConfig).packs.find((p) => p.key === "testland")!;

const node = (id: string, levelKey: string): PlaceNode => ({ id, levelKey, label: id });
const edge = (childId: string, parentId: string): ParentEdge => ({ childId, parentId });

const NODES = [
  node("realm", "realm"),
  node("north", "shire"),
  node("mill", "parish"),
  node("oak", "hamlet"),
  node("guild", "guild"),
];
const EDGES = [edge("north", "realm"), edge("mill", "north"), edge("oak", "mill")];

describe("hierarchyProblems", () => {
  it("accepts a hierarchy the pack's levels allow", () => {
    expect(hierarchyProblems(pack, NODES, EDGES)).toEqual([]);
  });

  it("refuses a place that skips its level's parent", () => {
    const problems = hierarchyProblems(pack, NODES, [...EDGES.slice(0, 2), edge("oak", "north")]);
    expect(problems).toEqual([
      expect.stringContaining("a hamlet is part of a parish, not of a shire"),
    ]);
  });

  it("refuses a non-root place with no parent, or two", () => {
    expect(hierarchyProblems(pack, NODES, EDGES.slice(0, 2))).toEqual([
      expect.stringContaining("oak: a hamlet needs exactly one current parent, has 0"),
    ]);
    expect(hierarchyProblems(pack, NODES, [...EDGES, edge("oak", "realm")])).toEqual([
      expect.stringContaining("has 2"),
    ]);
  });

  it("refuses a root or an overlapping place that is part of something", () => {
    const problems = hierarchyProblems(pack, NODES, [
      ...EDGES,
      edge("guild", "mill"),
      edge("realm", "north"),
    ]);
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('guild: level "guild" overlaps "parish"'),
        expect.stringContaining('realm: level "realm" is the root'),
      ]),
    );
  });

  it("refuses a level the pack does not declare", () => {
    expect(hierarchyProblems(pack, [...NODES, node("x", "county")], EDGES)).toEqual([
      expect.stringContaining('level "county" is not a level of pack "testland"'),
    ]);
  });

  it("reports a loop once", () => {
    const loop = [node("a", "parish"), node("b", "parish")];
    const problems = hierarchyProblems(pack, loop, [edge("a", "b"), edge("b", "a")]);
    expect(problems.filter((p) => p.includes("its own ancestor"))).toHaveLength(1);
  });
});
