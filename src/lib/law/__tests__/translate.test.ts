import { describe, expect, it } from "vitest";
import { passagesOf } from "../act-translation";
import { BATCH, batches, numbersOf, readTranslation, translationPrompt } from "../translate";
import type { ActView } from "../view";

describe("checking a model's translation", () => {
  const passages = [
    "Статья 228. Налоговая ставка устанавливается в размере 12 процентов.",
    "Статья 1",
  ];

  it("keeps one translation per passage, in order", () => {
    const answer = 'Here: ["Article 228. The tax rate is set at 12 percent.", "Article 1"]';
    expect(readTranslation(answer, passages)).toEqual([
      "Article 228. The tax rate is set at 12 percent.",
      "Article 1",
    ]);
  });

  it("refuses an answer that is not a list of as many passages, or leaves one empty", () => {
    expect(readTranslation("I cannot do that.", passages)).toBeNull();
    expect(readTranslation('["only one"]', passages)).toBeNull();
    expect(readTranslation('["Article 228. 12 percent.", ""]', passages)).toBeNull();
    expect(readTranslation('["Article 228. 12 percent.", 7]', passages)).toBeNull();
  });

  it("refuses a translation that loses, changes or invents a number", () => {
    expect(
      readTranslation('["Article 228. The rate is 13 percent.", "Article 1"]', passages),
    ).toBeNull();
    expect(
      readTranslation('["Article 228. The rate is twelve percent.", "Article 1"]', passages),
    ).toBeNull();
    expect(
      readTranslation('["Article 228. The rate is 12 percent.", "Article 1 of 2023"]', passages),
    ).toBeNull();
  });

  it("refuses a translation many times longer or shorter than its passage", () => {
    const long = "Статья 5. ".concat("Слово ".repeat(40));
    expect(readTranslation(JSON.stringify(["Article 5. Word."]), [long])).toBeNull();
  });

  it("reads numbers however a language groups them", () => {
    expect(numbersOf("9 108 338,6")).toEqual(numbersOf("9,108,338.6"));
  });
});

describe("asking for a translation", () => {
  it("names both languages and asks for the passages as JSON", () => {
    const [system, user] = translationPrompt(["Статья 1"], "ru", "en");
    expect(system?.content).toMatch(/from Russian into English/);
    expect(user?.content).toBe('["Статья 1"]');
  });

  it("asks in batches small enough to come back whole", () => {
    const many = Array.from({ length: 30 }, (_, i) => `passage ${i}`);
    const out = batches(many);
    expect(out.every((b) => b.length <= BATCH.items)).toBe(true);
    expect(out.flat()).toEqual(many);
    const big = ["x".repeat(BATCH.chars), "y"];
    expect(batches(big)).toEqual([[big[0]], ["y"]]);
  });

  it("translates a page's title, headings and texts, nothing empty", () => {
    const act = {
      title: "Налоговый кодекс",
      provisions: [
        { path: "art_1", heading: "Статья 1", text: "Текст" },
        { path: "x", heading: "", text: "Ещё" },
      ],
    } as unknown as ActView;
    expect(passagesOf(act)).toEqual(["Налоговый кодекс", "Статья 1", "Текст", "Ещё"]);
  });
});
