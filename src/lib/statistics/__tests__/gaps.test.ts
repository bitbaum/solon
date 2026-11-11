import { describe, expect, it } from "vitest";
import { GAPS } from "@/lib/config/statistics/gaps";
import { countryOf } from "@/lib/config/world/countries";
import { buildGapsBrief } from "../gaps-brief";
import { checkExplanation } from "../explain";
import { defineGaps, findTopic, gapsOf, topicHref, topicSlug } from "../gaps";

const topic = {
  key: "t.x",
  label: { en: "T" },
  question: { en: "Q?" },
  purposes: [{ en: "P" }],
  variants: [
    { key: "a", label: { en: "A" } },
    { key: "b", label: { en: "B" } },
  ],
  cautions: [{ en: "C" }],
  risks: [],
  companions: [],
  author: "x",
};
const ev = { publisher: "P", url: "https://example.org/p", read: "2026-11-10", expect: ["words"] };
const line = (place: string, variant: string, status: string, extra = {}) => ({
  topic: "t.x",
  place: { scheme: "iso_3166_1", value: place },
  variant,
  status,
  publisher: "O",
  summary: { en: "S" },
  evidence: [ev],
  ...extra,
});

describe("defining gaps", () => {
  it("refuses a line for an unknown topic or variant, and one covered twice", () => {
    expect(() =>
      defineGaps({
        topics: [topic],
        coverage: [{ ...line("DK", "a", "published"), topic: "nope" }],
      }),
    ).toThrow(/unknown topic/);
    expect(() =>
      defineGaps({ topics: [topic], coverage: [line("DK", "zzz", "published")] }),
    ).toThrow(/not a variant/);
    expect(() =>
      defineGaps({
        topics: [topic],
        coverage: [line("DK", "a", "published"), line("DK", "a", "restricted")],
      }),
    ).toThrow(/covered twice/);
  });

  it("makes a bar in law quote the law, and every cited page name its words or say a program cannot read it", () => {
    expect(() =>
      defineGaps({ topics: [topic], coverage: [line("FR", "a", "barred_by_law")] }),
    ).toThrow(/quote the law/);
    expect(() =>
      defineGaps({
        topics: [topic],
        coverage: [line("DK", "a", "published", { evidence: [{ ...ev, expect: [] }] })],
      }),
    ).toThrow(/must name the words/);
    expect(
      defineGaps({
        topics: [topic],
        coverage: [
          line("DK", "a", "published", { evidence: [{ ...ev, expect: [], unchecked: true }] }),
        ],
      }).coverage,
    ).toHaveLength(1);
  });
});

describe("where the gaps are", () => {
  const cov = defineGaps({
    topics: [topic],
    coverage: [
      line("DK", "a", "published"),
      line("SE", "a", "published"),
      line("FR", "a", "barred_by_law", { frame: { en: "the law" } }),
      line("DE", "b", "not_collected"),
    ],
  }).coverage;

  it("lists, for a variant someone publishes, the places that do not, with who does", () => {
    expect(gapsOf("t.x", cov)).toEqual([
      { variant: "a", place: "FR", status: "barred_by_law", publishedElsewhere: ["DK", "SE"] },
    ]);
  });

  it("does not call a variant nobody publishes a gap between places", () => {
    expect(gapsOf("t.x", cov).some((g) => g.variant === "b")).toBe(false);
  });
});

describe("the shipped registry", () => {
  it("names real countries, and every line says what it rests on", () => {
    for (const c of GAPS.coverage) {
      expect(countryOf(c.place.value), `${c.place.value}`).toBeDefined();
      expect(c.evidence.length).toBeGreaterThan(0);
    }
  });

  it("lays out the objections beside the purposes, and lists the companions a breakdown needs", () => {
    const t = GAPS.topics[0]!;
    expect(t.risks.length).toBeGreaterThan(0);
    expect(t.cautions.length).toBeGreaterThan(0);
    expect(t.companions.map((c) => c.en).join(" ")).toMatch(/Age and sex/);
  });

  it("gives an AI only what was read: it cannot answer with a figure no line holds", () => {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    const facts = buildGapsBrief(GAPS.topics[0]!, GAPS.coverage, (a) => names.of(a) ?? a);
    expect(facts.map((f) => f.params.text).join("\n")).toContain("Denmark");
    const denmark = facts.find((f) => String(f.params.text).startsWith("Denmark"))!.id;
    expect(checkExplanation(`Denmark lists 80 countries of origin [${denmark}].`, facts).ok).toBe(
      false,
    );
    expect(checkExplanation(`Denmark lists 75 countries of origin [${denmark}].`, facts).ok).toBe(
      true,
    );
    expect(checkExplanation(`France is an enemy of statistics [${denmark}].`, facts).ok).toBe(
      false,
    );
  });
});

describe("a topic's address", () => {
  it("has no dot, so the English page is not mistaken for a file", () => {
    for (const t of GAPS.topics) {
      expect(topicHref(t.key)).not.toContain(".");
      expect(topicHref(t.key)).toMatch(/^\/statistics\/gaps\/[a-z0-9-]+$/);
    }
    expect(topicSlug("crime.by_background")).toBe("crime-by-background");
  });

  it("is one per topic", () => {
    const slugs = GAPS.topics.map((t) => topicSlug(t.key));
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("finds the topic by its slug and by its key, as links already shared name it", () => {
    const [first] = GAPS.topics;
    expect(findTopic(GAPS.topics, topicSlug(first.key))).toBe(first);
    expect(findTopic(GAPS.topics, first.key)).toBe(first);
    expect(findTopic(GAPS.topics, first.key.replace(".", "%2E"))).toBe(first);
    expect(findTopic(GAPS.topics, "no-such-topic")).toBeUndefined();
    expect(findTopic(GAPS.topics, "%E0%A4%A")).toBeUndefined();
  });
});

describe("offices and proposals", () => {
  const office = (extra = {}) => ({
    key: "dk.stat",
    place: { scheme: "iso_3166_1", value: "DK" },
    name: "Stat",
    contacts: [
      { kind: "page", value: "https://example.org/contact" },
      { kind: "email", value: "info@example.org" },
    ],
    evidence: [{ ...ev, expect: ["info@example.org"] }],
    ...extra,
  });
  const proposal = { collect: { en: "Publish X." }, author: "Solon's configuration" };

  it("links a line to an office of its own place, and to a proposal that names one", () => {
    const g = defineGaps({
      topics: [{ ...topic, proposal }],
      offices: [office()],
      coverage: [
        line("DK", "a", "not_collected", {
          office: "dk.stat",
          proposal: { ...proposal, office: "dk.stat" },
        }),
      ],
    });
    expect(g.coverage[0]!.office).toBe("dk.stat");
    expect(g.topics[0]!.proposal?.collect.en).toBe("Publish X.");
  });

  it("refuses an office that is not in the registry, or belongs to another place", () => {
    expect(() =>
      defineGaps({
        topics: [topic],
        offices: [],
        coverage: [line("DK", "a", "published", { office: "gone" })],
      }),
    ).toThrow(/not in the registry/);
    expect(() =>
      defineGaps({
        topics: [topic],
        offices: [office()],
        coverage: [line("SE", "a", "published", { office: "dk.stat" })],
      }),
    ).toThrow(/belongs to DK, not SE/);
  });

  it("refuses an e-mail or telephone no cited page is expected to say", () => {
    expect(() =>
      defineGaps({
        topics: [topic],
        coverage: [],
        offices: [office({ evidence: [{ ...ev, expect: ["something else"] }] })],
      }),
    ).toThrow(/not among the words/);
  });

  it("refuses an office declared twice", () => {
    expect(() =>
      defineGaps({ topics: [topic], coverage: [], offices: [office(), office()] }),
    ).toThrow(/twice/);
  });

  it("holds Statistics Denmark as the first office, with its general channels", () => {
    const dk = GAPS.offices.find((o) => o.key === "dk.statistics-denmark");
    expect(dk?.contacts.map((c) => c.kind)).toEqual(["page", "email", "phone", "postal"]);
    expect(GAPS.coverage.find((c) => c.place.value === "DK")?.office).toBe("dk.statistics-denmark");
  });
});
