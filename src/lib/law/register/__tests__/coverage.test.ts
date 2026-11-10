import { describe, expect, it } from "vitest";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { lawCoverage } from "../coverage";

describe("lawCoverage", () => {
  it("lists every configured authority, counts from the data, and holds no text yet", () => {
    const coverage = lawCoverage({
      counts: [
        { authority: LAW_AUTHORITIES[0]!.key, inForce: true, acts: 5 },
        { authority: LAW_AUTHORITIES[0]!.key, inForce: false, acts: 2 },
        { authority: LAW_AUTHORITIES[2]!.key, inForce: true, acts: 3 },
      ],
      retrievedAt: new Date("2026-10-23T08:00:00Z"),
    });
    expect(coverage.authorities).toHaveLength(LAW_AUTHORITIES.length);
    expect(coverage.authorities[0]).toMatchObject({ inForce: 5, notInForce: 2, withText: 0 });
    expect(coverage.authorities[1]).toMatchObject({ inForce: 0, notInForce: 0 });
    expect(coverage.totals).toEqual({
      inForce: 8,
      notInForce: 2,
      statusNotStated: 0,
      withText: 0,
    });
    expect(coverage.retrievedOn).toBe("2026-10-23");
  });

  it("counts acts whose publisher states no status apart, in neither in force nor not", () => {
    const key = LAW_AUTHORITIES.find((a) => a.key === "rso")!.key;
    const coverage = lawCoverage({
      counts: [
        { authority: key, inForce: true, statusStated: false, acts: 1849 },
        { authority: "ch", inForce: true, acts: 10 },
      ],
      retrievedAt: null,
    });
    expect(coverage.authorities.find((a) => a.key === key)).toMatchObject({
      inForce: 0,
      notInForce: 0,
      statusNotStated: 1849,
    });
    expect(coverage.totals).toMatchObject({ inForce: 10, statusNotStated: 1849 });
  });

  it("says when the register was never read", () => {
    expect(lawCoverage({ counts: [], retrievedAt: null }).retrievedOn).toBeNull();
  });
});
