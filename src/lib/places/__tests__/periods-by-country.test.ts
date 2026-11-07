import { describe, expect, it } from "vitest";
import { periodsByCountry } from "../compare";

/** Which days each place has every figure for, as the published data would say. */
const published: Record<string, string[]> = {
  geneve: ["2026", "2025", "2024"],
  zurich: ["2026", "2025"],
  vaduz: ["2025", "2024"], // Liechtenstein's 2026 communal rates are not out yet.
  eschen: ["2025"],
  appenzell: [], // A commune whose figures stand in its localities: no day is complete.
};

const run = (places: { name: string; country: string }[]) =>
  periodsByCountry({
    countries: places.map((p) => p.country),
    days: ["2026", "2025", "2024"],
    load: async (i, day) => ({ name: places[i]!.name, day }),
    complete: (p) => published[p.name]!.includes(p.day),
  });

describe("periodsByCountry", () => {
  it("lets each country use its own latest complete year: Liechtenstein beside Geneva", async () => {
    expect(
      await run([
        { name: "vaduz", country: "liechtenstein" },
        { name: "geneve", country: "switzerland" },
      ]),
    ).toEqual([
      { name: "vaduz", day: "2025" },
      { name: "geneve", day: "2026" },
    ]);
  });

  it("keeps the places of one country on one year, the latest they all have", async () => {
    expect(
      await run([
        { name: "geneve", country: "switzerland" },
        { name: "vaduz", country: "liechtenstein" },
        { name: "zurich", country: "switzerland" },
        { name: "eschen", country: "liechtenstein" },
      ]),
    ).toEqual([
      { name: "geneve", day: "2026" },
      { name: "vaduz", day: "2025" },
      { name: "zurich", day: "2026" },
      { name: "eschen", day: "2025" },
    ]);
  });

  it("falls back to the newest day when no year is complete, rather than inventing one", async () => {
    expect(await run([{ name: "appenzell", country: "switzerland" }])).toEqual([
      { name: "appenzell", day: "2026" },
    ]);
  });
});
