import { describe, expect, it } from "vitest";
import { evaluatorFacts, type ChainFact, type ChainPlace } from "../chain";

const place = (id: string, levelKey: string | null, depth: number | null): ChainPlace => ({
  id,
  countryPack: "testland",
  levelKey,
  slugPath: null,
  depth,
  names: [],
});
const fact = (
  jurisdictionId: string,
  value: number,
  validFrom = "2025-04-01",
  variant: string | null = null,
): ChainFact => ({
  jurisdictionId,
  metricKey: "test.multiplier",
  variant,
  validFrom,
  value,
  sourceId: "s",
});

describe("evaluatorFacts", () => {
  it("attributes each fact to the level of the place holding it", () => {
    const chain = [place("mill", "parish", 1), place("north", "shire", 2)];
    expect(
      evaluatorFacts(chain, [fact("mill", 1.2), fact("north", 1, "2025-04-01", "together")]),
    ).toEqual([
      { level: "parish", metric: "test.multiplier", value: 1.2 },
      { level: "shire", metric: "test.multiplier", variant: "together", value: 1 },
    ]);
  });

  it("takes the newest period when several overlap the day, and ignores places outside the chain", () => {
    const chain = [place("mill", "parish", 1)];
    expect(
      evaluatorFacts(chain, [
        fact("mill", 1.2),
        fact("mill", 1.3, "2025-07-01"),
        fact("elsewhere", 9),
      ]),
    ).toEqual([{ level: "parish", metric: "test.multiplier", value: 1.3 }]);
  });
});
