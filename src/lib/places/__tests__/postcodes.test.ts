import { describe, expect, it } from "vitest";
import { groupPostcodeRows } from "../postcodes";

describe("groupPostcodeRows", () => {
  it("groups a postcode's localities by place, the largest share first", () => {
    const matches = groupPostcodeRows([
      { jurisdictionId: "dubendorf", locality: "Zürich", share: 0.00412 },
      { jurisdictionId: "zurich", locality: "Zürich", share: 0.99588 },
      { jurisdictionId: "zurich", locality: "Altstetten", share: 1 },
    ]);
    expect(matches).toEqual([
      {
        jurisdictionId: "zurich",
        localities: [
          { name: "Altstetten", share: 1 },
          { name: "Zürich", share: 0.99588 },
        ],
      },
      { jurisdictionId: "dubendorf", localities: [{ name: "Zürich", share: 0.00412 }] },
    ]);
  });

  it("puts places without a stated share last and knows no postcode as no match", () => {
    const matches = groupPostcodeRows([
      { jurisdictionId: "b", locality: "B", share: null },
      { jurisdictionId: "a", locality: "A", share: 0.5 },
    ]);
    expect(matches.map((m) => m.jurisdictionId)).toEqual(["a", "b"]);
    expect(groupPostcodeRows([])).toEqual([]);
  });
});
