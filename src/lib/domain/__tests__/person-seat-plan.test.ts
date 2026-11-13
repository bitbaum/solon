/**
 * How fresh person tags become stored ones. Pure, so it runs without a
 * database: the admission check and the backfill both decide with it.
 */
import { describe, expect, it } from "vitest";
import { planPersonTags } from "@/lib/domain/person-seat";

const tagOf = (letter: string) => letter.repeat(64);
const asked = (id: string, personTag: string | null, fresh: string | null) => ({
  id,
  displayName: id.toUpperCase(),
  personTag,
  fresh,
});

describe("planPersonTags", () => {
  it("writes only what changed: a new tag, a changed one, one OrangeCat now leaves out", () => {
    const plan = planPersonTags([
      asked("same", tagOf("a"), tagOf("a")),
      asked("new", null, tagOf("b")),
      asked("handed", tagOf("c"), tagOf("d")),
      asked("gone", tagOf("e"), null),
      asked("never", null, null),
    ]);
    expect(plan.writes).toEqual([
      { id: "new", personTag: tagOf("b") },
      { id: "handed", personTag: tagOf("d") },
      { id: "gone", personTag: null },
    ]);
    expect(plan.clashes).toEqual([]);
    expect(plan.holders.get(tagOf("d"))).toEqual({ memberId: "handed", displayName: "HANDED" });
  });

  it("never gives two seats one tag: the seat that already holds it keeps it", () => {
    const plan = planPersonTags([
      asked("first", null, tagOf("a")),
      asked("keeps", tagOf("a"), tagOf("a")),
    ]);
    expect(plan.writes).toEqual([]);
    expect(plan.clashes).toEqual([
      {
        seats: [
          { memberId: "keeps", displayName: "KEEPS" },
          { memberId: "first", displayName: "FIRST" },
        ],
      },
    ]);
  });

  it("finds two untagged seats of one person without writing either first", () => {
    const plan = planPersonTags([asked("a", null, tagOf("a")), asked("b", null, tagOf("a"))]);
    expect(plan.writes).toEqual([{ id: "a", personTag: tagOf("a") }]);
    expect(plan.clashes).toHaveLength(1);
  });

  it("a seat whose stored tag stands keeps it against one asked about", () => {
    const plan = planPersonTags(
      [asked("asked", tagOf("b"), tagOf("a"))],
      [{ id: "held", displayName: "HELD", personTag: tagOf("a") }],
    );
    expect(plan.writes).toEqual([{ id: "asked", personTag: null }]);
    expect(plan.holders.get(tagOf("a"))?.memberId).toBe("held");
    expect(plan.clashes[0]!.seats.map((s) => s.memberId)).toEqual(["held", "asked"]);
  });
});
