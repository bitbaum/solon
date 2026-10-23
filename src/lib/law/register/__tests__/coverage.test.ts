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
    expect(coverage.totals).toEqual({ inForce: 8, notInForce: 2, withText: 0 });
    expect(coverage.retrievedOn).toBe("2026-10-23");
  });

  it("says when the register was never read", () => {
    expect(lawCoverage({ counts: [], retrievedAt: null }).retrievedOn).toBeNull();
  });
});
