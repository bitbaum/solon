import { describe, expect, it } from "vitest";
import {
  ChangesSchema,
  applyChanges,
  checkChanges,
  provisionHash,
  redline,
  standing,
  type Change,
  type Provision,
} from "../changes";

const base: Provision[] = [
  { path: "art_1", heading: "Art. 1 Purpose", text: "This act governs dogs." },
  { path: "art_2", heading: "Art. 2 Tax", text: "The tax on each dog is 100 francs a year." },
  { path: "art_3", heading: "Art. 3 Exemptions", text: "Guide dogs pay no tax." },
];
const hashOf = (path: string) => provisionHash(base.find((p) => p.path === path)!);

describe("checkChanges", () => {
  it("accepts changes written against the text as held", () => {
    const changes: Change[] = [
      {
        op: "replace",
        path: "art_2",
        baseHash: hashOf("art_2"),
        text: "The tax on each dog is 50 francs a year.",
      },
      { op: "repeal", path: "art_3", baseHash: hashOf("art_3") },
      { op: "insert", after: "art_1", heading: "Art. 1a Definitions", text: "A dog is a dog." },
    ];
    expect(checkChanges(base, changes)).toEqual([]);
  });

  it("refuses a change pinned to text that is no longer the text", () => {
    const changes: Change[] = [
      {
        op: "replace",
        path: "art_2",
        baseHash: provisionHash({ text: "older wording" }),
        text: "x",
      },
    ];
    expect(checkChanges(base, changes)).toEqual([{ change: 0, kind: "stale_base", path: "art_2" }]);
  });

  it("names a path the act does not have, an insert after nothing, and a path touched twice", () => {
    const changes: Change[] = [
      { op: "repeal", path: "art_9", baseHash: hashOf("art_1") },
      { op: "insert", after: "art_9", heading: "h", text: "t" },
      { op: "repeal", path: "art_1", baseHash: hashOf("art_1") },
      { op: "replace", path: "art_1", baseHash: hashOf("art_1"), text: "x" },
    ];
    expect(checkChanges(base, changes).map((p) => p.kind)).toEqual([
      "unknown_path",
      "unknown_anchor",
      "duplicate_path",
    ]);
  });

  it("refuses a replacement that changes nothing, spacing aside", () => {
    const changes: Change[] = [
      {
        op: "replace",
        path: "art_3",
        baseHash: hashOf("art_3"),
        text: "  Guide dogs pay no tax.\r\n",
      },
    ];
    expect(checkChanges(base, changes)).toEqual([{ change: 0, kind: "no_effect", path: "art_3" }]);
  });

  it("lets a replacement change only the heading", () => {
    const changes: Change[] = [
      {
        op: "replace",
        path: "art_3",
        baseHash: hashOf("art_3"),
        heading: "Art. 3 Who pays nothing",
        text: base[2]!.text,
      },
    ];
    expect(checkChanges(base, changes)).toEqual([]);
  });
});

describe("applyChanges", () => {
  it("keeps the act's order, marks what goes, and puts inserts after their anchor in the order written", () => {
    const amended = applyChanges(base, [
      { op: "insert", after: "art_1", heading: "Art. 1b", text: "second" },
      { op: "repeal", path: "art_3", baseHash: hashOf("art_3") },
      { op: "insert", after: null, heading: "Preamble", text: "first of all" },
      { op: "insert", after: "art_1", heading: "Art. 1c", text: "third" },
      { op: "replace", path: "art_2", baseHash: hashOf("art_2"), text: "50 francs." },
    ]);
    expect(amended.map((p) => [p.status, p.heading])).toEqual([
      ["inserted", "Preamble"],
      ["unchanged", "Art. 1 Purpose"],
      ["inserted", "Art. 1b"],
      ["inserted", "Art. 1c"],
      ["replaced", "Art. 2 Tax"],
      ["repealed", "Art. 3 Exemptions"],
    ]);
    const replaced = amended[4]!;
    expect(replaced.status === "replaced" && replaced.before.text).toBe(base[1]!.text);
  });
});

describe("redline", () => {
  it("strikes and adds whole words, and the parts rebuild both texts", () => {
    const before = "The tax on each dog is 100 francs a year.";
    const after = "The tax on each dog is 50 francs a year.";
    const parts = redline(before, after);
    expect(parts.filter((p) => p.kind === "removed").map((p) => p.text.trim())).toEqual(["100"]);
    expect(parts.filter((p) => p.kind === "added").map((p) => p.text.trim())).toEqual(["50"]);
    expect(
      parts
        .filter((p) => p.kind !== "added")
        .map((p) => p.text)
        .join(""),
    ).toBe(before);
    expect(
      parts
        .filter((p) => p.kind !== "removed")
        .map((p) => p.text)
        .join(""),
    ).toBe(after);
  });
});

describe("standing", () => {
  const changes: Change[] = [
    { op: "replace", path: "art_2", baseHash: hashOf("art_2"), text: "50 francs." },
  ];

  it("is current while the law still says what the change was written against", () => {
    expect(standing(base, changes)).toEqual({ state: "current" });
  });

  it("is outdated once the publisher changes the provision", () => {
    const now = base.map((p) =>
      p.path === "art_2" ? { ...p, text: "The tax is 120 francs." } : p,
    );
    expect(standing(now, changes)).toEqual({
      state: "outdated",
      problems: [{ change: 0, kind: "stale_base", path: "art_2" }],
    });
  });

  it("is outdated once the provision is gone", () => {
    expect(
      standing(
        base.filter((p) => p.path !== "art_2"),
        changes,
      ),
    ).toMatchObject({
      state: "outdated",
      problems: [{ kind: "unknown_path" }],
    });
  });
});

describe("ChangesSchema", () => {
  it("takes the three operations and refuses anything else", () => {
    expect(
      ChangesSchema.safeParse([{ op: "repeal", path: "a", baseHash: hashOf("art_1") }]).success,
    ).toBe(true);
    expect(ChangesSchema.safeParse([{ op: "rewrite", path: "a", text: "x" }]).success).toBe(false);
    expect(ChangesSchema.safeParse([]).success).toBe(false);
    expect(
      ChangesSchema.safeParse([{ op: "repeal", path: "a", baseHash: "not-a-hash" }]).success,
    ).toBe(false);
  });
});
