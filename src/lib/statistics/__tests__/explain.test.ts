import { describe, expect, it, vi } from "vitest";
import type { Metric } from "@/lib/config/places/schema";
import { buildBrief, type BriefFact } from "../brief";
import { checkExplanation, explainMessages, factText, numberReadings } from "../explain";
import { explain } from "../explain-run";
import type { PlaceSeries } from "../read";

const metric = {
  key: "tax.income.top_rate",
  unit: "ratio",
  label: { en: "Top income tax rate" },
  statistic: {
    definition: { en: "The highest statutory rate on personal income." },
    scope: { en: "Central and sub-central government combined." },
    series: { publisher: "OECD", code: "PIT", url: "https://example.org/series" },
  },
} as unknown as Metric;

const series = (name: string, code: string, pts: [number, number][]): PlaceSeries => ({
  jurisdictionId: code,
  code,
  name,
  slugPath: null,
  points: pts.map(([year, value]) => ({ year, value, quality: "normal" as const })),
  source: { key: "oecd_sdmx", url: null, retrievedAt: "2026-11-09" },
});

const facts: BriefFact[] = buildBrief(
  {
    metric,
    shown: [
      series("Estonia", "EE", [
        [2020, 0.2],
        [2025, 0.22],
      ]),
      series("Switzerland", "CH", [
        [2020, 0.4],
        [2025, 0.414],
      ]),
    ],
    years: { from: null, to: null },
    events: [],
    sanity: [],
    thisYear: 2026,
  },
  "en",
);

describe("the brief", () => {
  it("numbers its facts and states each figure as the page shows it", () => {
    expect(facts.map((f) => f.id)).toEqual(facts.map((_, i) => `F${i + 1}`));
    const text = facts.map(factText).join("\n");
    expect(text).toContain("Estonia, 2025: 22%");
    expect(text).toContain("Switzerland: 40% in 2020, 41.4% in 2025; up 1.4 percentage points.");
    expect(text).toContain(
      "From highest to lowest at each place's latest year: Switzerland 41.4% (2025); Estonia 22% (2025).",
    );
  });

  it("gives the model every fact and the reader's question, and names earlier problems", () => {
    const [system, user] = explainMessages(facts, "de", "Why?", [
      "it cites F99, which is not a fact",
    ]);
    expect(system!.content).toContain("[F2] Estonia, 2025: 22%");
    expect(system!.content).toContain("German");
    expect(user!.content).toContain("The reader asks: Why?");
    expect(user!.content).toContain("it cites F99");
  });
});

describe("number readings", () => {
  it("reads a separator both ways where the language is not known", () => {
    expect(numberReadings("41.4")).toContain(41.4);
    expect(numberReadings("41,4")).toContain(41.4);
    expect(numberReadings("1,234")).toEqual(expect.arrayContaining([1234, 1.234]));
    expect(numberReadings("1’000")).toEqual([1000]);
    expect(numberReadings("1.234,5")).toEqual([1234.5]);
  });
});

describe("checking an explanation against its facts", () => {
  const good =
    "Estonia's top rate was 22% in 2025 [F2]. Switzerland's was 41.4%, up 1.4 percentage points since 2020 [F3,F4].";

  it("accepts one that stays inside its facts", () => {
    const check = checkExplanation(good, facts);
    expect(check.problems).toEqual([]);
    expect(check.cited).toEqual(["F2", "F3", "F4"]);
  });

  it("accepts a number written the German way", () => {
    expect(checkExplanation("Die Schweiz lag 2025 bei 41,4 % [F3].", facts).ok).toBe(true);
  });

  it("refuses a number no fact holds", () => {
    const check = checkExplanation("Estonia's rate was 25% in 2025 [F2].", facts);
    expect(check.ok).toBe(false);
    expect(check.problems[0]).toMatch(/numbers that are in no fact: 25/);
  });

  it("refuses a citation that is not a fact and an answer that cites nothing", () => {
    expect(checkExplanation("Estonia's rate was 22% [F99].", facts).problems.join()).toMatch(/F99/);
    expect(checkExplanation("Estonia's rate was 22%.", facts).problems.join()).toMatch(
      /cites no fact/,
    );
  });

  it("refuses a long paragraph with no citation", () => {
    const long = `${good}\n\n${"The two places differ in how their rules are written and in how much of pay they reach. ".repeat(2)}`;
    expect(checkExplanation(long, facts).problems).toContain("a paragraph cites no fact");
  });

  it("refuses a verdict on a place, in any of the five languages", () => {
    for (const word of [
      "an enemy of freedom",
      "ein Feind der Freiheit",
      "un ennemi",
      "un nemico",
      "враг",
    ]) {
      expect(checkExplanation(`Estonia is ${word} [F2].`, facts).problems.join(), word).toMatch(
        /verdict/,
      );
    }
  });

  it("lets small counts through but not a small percentage", () => {
    expect(checkExplanation("Of the two places, one is higher [F5].", facts).problems).toEqual([]);
    expect(checkExplanation("Estonia's rate was 7% [F2].", facts).ok).toBe(false);
  });
});

describe("asking, checking and asking again", () => {
  it("returns the first answer that passes", async () => {
    const ask = vi.fn().mockResolvedValue({ text: "Estonia: 22% in 2025 [F2].", model: "m" });
    const out = await explain(facts, { language: "en", ask });
    expect(out).toMatchObject({ ok: true, attempts: 1, model: "m", cited: ["F2"] });
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it("asks once more with the problems named, and takes the second answer if it passes", async () => {
    const ask = vi
      .fn()
      .mockResolvedValueOnce({ text: "Estonia: 25% in 2025 [F2]." })
      .mockResolvedValueOnce({ text: "Estonia: 22% in 2025 [F2]." });
    const out = await explain(facts, { language: "en", ask });
    expect(out).toMatchObject({ ok: true, attempts: 2 });
    expect(ask.mock.calls[1]![0].at(-1).content).toContain("numbers that are in no fact: 25");
  });

  it("drops an answer that fails twice and never returns its text", async () => {
    const ask = vi.fn().mockResolvedValue({ text: "Estonia: 25% in 2025 [F2]." });
    const out = await explain(facts, { language: "en", ask });
    expect(out.ok).toBe(false);
    expect(JSON.stringify(out)).not.toContain("25%");
    expect(ask).toHaveBeenCalledTimes(2);
  });
});
