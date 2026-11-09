import { describe, expect, it } from "vitest";
import { ASSESSMENT_RECORDS } from "@/lib/config/statistics/assessments";
import { EXIT_ASSESSMENTS } from "@/lib/config/statistics/assessments-exit";
import { HEALTH_ASSESSMENTS } from "@/lib/config/statistics/assessments-health";
import { DIMENSIONS } from "@/lib/config/statistics/dimensions";
import { RUBRICS } from "@/lib/config/statistics/rubrics";
import { STATISTIC_RECORDS } from "@/lib/config/statistics/records";
import { defineRubrics, pointOf } from "../assessments";
import { defineDimensions } from "../dimensions";
import { defineCuratedRecords, reviewStatus, type CuratedRecordInput } from "../records";
import { collectEvidence } from "../verify-sources";

const evidence = {
  publisher: "P",
  url: "https://example.org/law",
  read: "2026-11-09",
  expect: ["the words"],
};
const known = {
  metrics: new Set<string>(),
  authorities: new Set(["ch"]),
  schemes: new Set(["systematic_number"]),
  rubrics: new Map([["r.x", { version: 2, values: [0, 1, 2] }]]),
};
const coding = (over: Record<string, unknown> = {}): CuratedRecordInput => ({
  key: "assessment:ch:r.x",
  kind: "assessment",
  metric: null,
  body: {
    place: { scheme: "iso_3166_1", value: "CH" },
    rubric: "r.x",
    rubricVersion: 2,
    value: 1,
    validFrom: "2024-01-01",
    validTo: null,
    method: "coded",
    confidence: "high",
    confidenceNote: { en: "why" },
    reading: { en: "what it says" },
    provisions: [
      {
        act: { authority: "ch", scheme: "systematic_number", value: "101" },
        provision: "art_59",
        label: "Art. 59",
      },
    ],
    quotes: [{ text: "the words", lang: "de", evidence: [evidence] }],
    codedBy: "A",
    reviewedBy: [],
    evidence: [evidence],
    ...over,
  },
});

describe("rubrics", () => {
  it("ships rubrics whose every point has a definition, with the edge cases decided so far", () => {
    expect(RUBRICS.length).toBeGreaterThan(0);
    for (const r of RUBRICS) {
      expect(r.scale.length).toBeGreaterThanOrEqual(2);
      for (const p of r.scale) expect(p.definition.en, `${r.key} ${p.value}`).toBeTruthy();
      expect(pointOf(r, r.scale[0]!.value)).toBeDefined();
      expect(pointOf(r, 999)).toBeUndefined();
    }
  });

  it("refuses a scale that names a point twice, and a rubric declared twice", () => {
    const point = (value: number) => ({ value, label: { en: "l" }, definition: { en: "d" } });
    const base = {
      key: "a.b",
      version: 1,
      label: { en: "L" },
      question: { en: "Q?" },
      author: "x",
    };
    expect(() => defineRubrics([{ ...base, scale: [point(0), point(0)] }])).toThrow(
      /same point twice/,
    );
    expect(() =>
      defineRubrics([
        { ...base, scale: [point(0), point(1)] },
        { ...base, scale: [point(0), point(1)] },
      ]),
    ).toThrow(/declared twice/);
  });
});

describe("a coding is checked against its rubric", () => {
  it("accepts a coding on the current version and a point of the scale", () => {
    expect(defineCuratedRecords([coding()], known)).toHaveLength(1);
  });

  it("refuses a feature with no rubric, an old version and a value off the scale", () => {
    expect(() => defineCuratedRecords([coding({ rubric: "r.none" })], known)).toThrow(
      /a feature with no rubric is refused/,
    );
    expect(() => defineCuratedRecords([coding({ rubricVersion: 1 })], known)).toThrow(
      /current one is 2/,
    );
    expect(() => defineCuratedRecords([coding({ value: 7 })], known)).toThrow(
      /not a point of the rubric's scale/,
    );
  });

  it("refuses unknown provisions' authorities, a coding that ends before it begins, and a coder who reviews themself", () => {
    expect(() =>
      defineCuratedRecords(
        [
          coding({
            provisions: [
              {
                act: { authority: "xx", scheme: "systematic_number", value: "1" },
                provision: null,
                label: "L",
              },
            ],
          }),
        ],
        known,
      ),
    ).toThrow(/unknown authority "xx"/);
    expect(() => defineCuratedRecords([coding({ validTo: "2023-01-01" })], known)).toThrow(
      /ends before it begins/,
    );
    expect(() => defineCuratedRecords([coding({ reviewedBy: ["A"] })], known)).toThrow(
      /cannot be the one who reviews/,
    );
  });

  it("needs words and a source on every quote", () => {
    expect(() => defineCuratedRecords([coding({ quotes: [] })], known)).toThrow();
    expect(() =>
      defineCuratedRecords([coding({ quotes: [{ text: "x", lang: "de", evidence: [] }] })], known),
    ).toThrow();
  });
});

describe("who has checked a coding", () => {
  it("is settled only when a person other than the coder is named", () => {
    expect(reviewStatus({ codedBy: "A", reviewedBy: [] })).toBe("awaiting_review");
    expect(reviewStatus({ codedBy: "A", reviewedBy: ["A"] })).toBe("awaiting_review");
    expect(reviewStatus({ codedBy: "A", reviewedBy: ["B"] })).toBe("settled");
  });

  it("shows no shipped coding as settled until someone else has read it", () => {
    for (const r of STATISTIC_RECORDS) {
      if (r.kind !== "assessment") continue;
      const settled = reviewStatus(r.body) === "settled";
      expect(settled, `${r.key} is settled with ${r.body.reviewedBy.join(", ") || "nobody"}`).toBe(
        r.body.reviewedBy.some((n) => n !== r.body.codedBy),
      );
    }
  });
});

describe("the shipped codings", () => {
  const codings = STATISTIC_RECORDS.flatMap((r) => (r.kind === "assessment" ? [r] : []));

  it("are on the current version of a rubric that exists, one per place and rubric", () => {
    expect(codings.length).toBe(
      ASSESSMENT_RECORDS.length + HEALTH_ASSESSMENTS.length + EXIT_ASSESSMENTS.length,
    );
    const seen = new Set<string>();
    for (const c of codings) {
      const rubric = RUBRICS.find((r) => r.key === c.body.rubric)!;
      expect(rubric, c.key).toBeDefined();
      expect(c.body.rubricVersion).toBe(rubric.version);
      const id = `${c.body.place.value}:${c.body.rubric}:${c.body.validFrom}`;
      expect(seen.has(id), `${id} coded twice`).toBe(false);
      seen.add(id);
    }
  });

  it("each say what they leave open when they are not high confidence, and cite pages a program checks", () => {
    for (const c of codings) {
      if (c.body.confidence !== "high") expect(c.body.open, c.key).toBeDefined();
    }
    const checked = collectEvidence(codings).filter((e) => !e.unchecked);
    expect(checked.length).toBeGreaterThan(0);
    for (const e of checked) expect(e.expect.length, e.url).toBeGreaterThan(0);
  });
});

describe("dimensions that hold coded features", () => {
  const layer = (rubrics: string[]) => ({
    metrics: [],
    rubrics,
    wanted: { en: "what would fill it" },
  });
  const dim = (de_jure: ReturnType<typeof layer>) => ({
    key: "d",
    version: 1,
    label: { en: "D" },
    summary: { en: "S" },
    author: "x",
    layers: { de_jure, de_facto: layer([]), outcome: layer([]) },
  });

  it("refuses a rubric that does not exist and a rubric on two layers", () => {
    expect(() => defineDimensions([dim(layer(["nope.x"]))], new Set(), new Set(["a.b"]))).toThrow(
      /rubric "nope.x" does not exist/,
    );
    expect(() =>
      defineDimensions(
        [
          {
            ...dim(layer(["a.b"])),
            layers: { de_jure: layer(["a.b"]), de_facto: layer(["a.b"]), outcome: layer([]) },
          },
        ],
        new Set(),
        new Set(["a.b"]),
      ),
    ).toThrow(/on two layers/);
  });

  it("ships the compulsion dimension with its de jure layer filled by a rubric and the rest stated as wanted", () => {
    const d = DIMENSIONS.find((x) => x.key === "compulsion")!;
    expect(d.layers.de_jure.rubrics).toEqual([
      "compulsion.military_service",
      "compulsion.health_insurance",
    ]);
    expect(d.layers.de_facto.metrics).toEqual([]);
    expect(d.layers.de_facto.wanted?.en).toBeTruthy();
  });
});
