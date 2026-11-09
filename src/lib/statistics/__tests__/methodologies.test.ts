import { describe, expect, it } from "vitest";
import { METHODOLOGIES } from "@/lib/config/statistics/methodologies";
import { buildMethodBrief } from "../method-brief";
import { defineMethodologies, questionsFor, type Methodology } from "../methodologies";
import { checkExplanation } from "../explain";

const base = {
  key: "x",
  name: "X",
  publisher: "P",
  homepage: "https://example.org",
  claims: { en: "Something." },
  kinds: ["composite"],
  layers: ["de_facto"],
  components: [],
  licence: { verdict: "loadable", terms: "CC BY 4.0", why: { en: "Open." } },
  evidence: [
    { publisher: "P", url: "https://example.org/terms", read: "2026-11-09", expect: ["CC BY"] },
  ],
};

describe("the methods registry", () => {
  it("refuses a method declared twice, and a loadable one built on share-alike data", () => {
    expect(() => defineMethodologies([base, base])).toThrow(/declared twice/);
    expect(() => defineMethodologies([{ ...base, draws_on: ["V-Dem (CC BY-SA)"] }])).toThrow(
      /share-alike/,
    );
  });

  it("asks the same questions of every index of a kind", () => {
    const [m] = defineMethodologies([base]) as [Methodology];
    expect(questionsFor(m)).toEqual(["composite", "weights"]);
    expect(
      questionsFor({
        ...m,
        kinds: ["expert_scoring"],
        layers: ["de_jure", "de_facto"],
        licence: { ...m.licence, verdict: "permission" },
        unread: ["the codebook"],
      }),
    ).toEqual(["experts", "layer", "licence", "unread"]);
  });

  it("describes each shipped index with a source for every page and no licence the doc does not give", () => {
    expect(METHODOLOGIES.length).toBeGreaterThanOrEqual(9);
    for (const m of METHODOLOGIES) {
      for (const e of m.evidence)
        if (!e.unchecked) expect(e.expect.length, `${m.key} ${e.url}`).toBeGreaterThan(0);
      if (m.components.length === 0)
        expect(m.unread.length, `${m.key}: parts unknown, so say what is unread`).toBeGreaterThan(
          0,
        );
    }
    const verdict = Object.fromEntries(METHODOLOGIES.map((m) => [m.key, m.licence.verdict]));
    expect(verdict).toMatchObject({
      wgi: "loadable",
      vdem: "not_loadable",
      freedom_house_fiw: "not_loadable",
      rsf_wpfi: "not_loadable",
    });
  });

  it("gives the AI only what was read, and refuses an answer with a figure from memory", () => {
    const fraser = METHODOLOGIES.find((m) => m.key === "fraser_efw")!;
    const facts = buildMethodBrief(fraser);
    expect(facts.map((f) => f.params.text).join("\n")).toContain("Size of government");
    expect(checkExplanation("It has five areas, among them Sound money [F3].", facts).ok).toBe(
      true,
    );
    expect(checkExplanation("It weights Sound money at 20% [F3].", facts).ok).toBe(false);
  });
});
