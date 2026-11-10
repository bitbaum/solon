import { describe, expect, it } from "vitest";
import { CONTEST_TOPICS, CONTESTS } from "@/lib/config/places/contested";
import { placesConfig } from "@/lib/config/places";
import { NEUTRAL_COPY_TERMS } from "@/lib/config/places/neutral-terms";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { WORLD } from "@/lib/config/world";
import { locales } from "@/i18n/routing";
import { contestProblems, contestSchema, type ContestInput } from "../contested";
import {
  claimedRegions,
  contestNote,
  contestSlugForPack,
  contestSummaries,
  contestView,
} from "../contest-view";

const contest = (input: ContestInput) => contestSchema.parse(input);
const ev = { publisher: "p", url: "https://example.org/a", read: "2026-11-10" };
const quote = (lang = "en") => ({
  text: "words",
  lang,
  ...(lang === "en" ? {} : { translation: { en: "words" } }),
  evidence: [ev],
});

describe("the contested places as configured", () => {
  it("name only places the world list says another state claims, each with one claimant", () => {
    for (const c of CONTESTS) {
      const region = WORLD.find((w) => w.slug === c.place);
      expect(region?.claimedBy, c.place).toBeTruthy();
      expect(
        c.sides.filter((s) => s.role === "claims"),
        c.place,
      ).toHaveLength(1);
    }
  });

  it("name law authorities the register knows", () => {
    const keys = new Set(LAW_AUTHORITIES.map((a) => a.key));
    for (const side of CONTESTS.flatMap((c) => c.sides)) {
      if (side.lawAuthority) expect(keys.has(side.lawAuthority), side.lawAuthority).toBe(true);
    }
  });

  it("ask every question in every language the site speaks", () => {
    for (const topic of CONTEST_TOPICS) {
      for (const locale of locales) {
        expect(topic.label[locale], `${topic.key} ${locale}`).toBeTruthy();
        expect(topic.question[locale], `${topic.key} ${locale}`).toBeTruthy();
      }
    }
  });

  it("take no side in Solon's own words (quotations are the sources' words)", () => {
    const own = [
      ...CONTEST_TOPICS.flatMap((t) => [t.label, t.question]),
      ...CONTESTS.flatMap((c) => (c.open ? [c.open] : [])),
    ];
    const hits = own.flatMap((text) =>
      Object.entries(text).flatMap(([locale, words]) =>
        (NEUTRAL_COPY_TERMS[locale] ?? [])
          .filter((term) => words.toLowerCase().includes(term.toLowerCase()))
          .map((term) => `${locale}: "${term}"`),
      ),
    );
    expect(hits).toEqual([]);
  });

  it("quote without the page's soft hyphens, so a quote reads as the text and not its typesetting", () => {
    for (const p of CONTESTS.flatMap((c) => c.provisions)) {
      expect(p.quote.text.includes("­"), p.label).toBe(false);
      for (const e of p.quote.evidence) {
        for (const word of e.expect) expect(word.includes("­"), word).toBe(false);
      }
    }
  });
});

describe("contestProblems", () => {
  const topics = CONTEST_TOPICS;
  const sides = [
    { key: "a", role: "governs" as const, lawAuthority: "aa" },
    { key: "b", role: "claims" as const, lawAuthority: null },
  ];

  it("passes a sound contest", () => {
    const c = contest({
      place: "x",
      sides,
      provisions: [
        {
          topic: "territory",
          side: "a",
          label: "Art. 1",
          act: { authority: "aa", scheme: "publisher_ref", value: "p:1" },
          provision: "art_1",
          quote: quote("ru"),
        },
      ],
    });
    expect(contestProblems(topics, [c])).toEqual([]);
  });

  it("refuses an unknown question, an unknown side, another authority's act and an untranslated quote", () => {
    const c = contest({
      place: "x",
      sides,
      provisions: [
        { topic: "nope", side: "a", label: "1", act: null, provision: null, quote: quote() },
        { topic: "territory", side: "z", label: "2", act: null, provision: null, quote: quote() },
        {
          topic: "territory",
          side: "b",
          label: "3",
          act: { authority: "aa", scheme: "publisher_ref", value: "p:1" },
          provision: null,
          quote: quote(),
        },
        {
          topic: "territory",
          side: "a",
          label: "4",
          act: null,
          provision: null,
          quote: { text: "слова", lang: "ru", evidence: [ev] },
        },
      ],
    });
    const problems = contestProblems(topics, [c]).join("\n");
    expect(problems).toMatch(/topic "nope"/);
    expect(problems).toMatch(/side "z"/);
    expect(problems).toMatch(/"3" cites an act of "aa"/);
    expect(problems).toMatch(/"4" is quoted without an English translation/);
  });

  it("puts the side that governs first, and has exactly one", () => {
    const reversed = contest({ place: "x", sides: [sides[1]!, sides[0]!] });
    expect(contestProblems(topics, [reversed]).join()).toMatch(/governs comes first/);
    const none = contest({ place: "x", sides: [sides[1]!, { ...sides[1]!, key: "c" }] });
    expect(contestProblems(topics, [none]).join()).toMatch(/exactly one side governs/);
  });
});

describe("contestView", () => {
  it("South Ossetia: its own side first, then Georgia, every question quoted for both", () => {
    const view = contestView("south-ossetia", "en")!;
    expect(view.sides.map((s) => [s.name, s.role])).toEqual([
      ["South Ossetia", "governs"],
      ["Georgia", "claims"],
    ]);
    expect(view.sides[0]!.lawAuthority).toBe("rso");
    expect(view.compared).toBe(CONTEST_TOPICS.length);
    expect(view.rows.map((r) => r.key)).toEqual(CONTEST_TOPICS.map((t) => t.key));
    expect(view.open).toBeTruthy();
  });

  it("names the sides in the reader's language", () => {
    const view = contestView("south-ossetia", "ru")!;
    expect(view.name).toBe("Южная Осетия");
    expect(view.rows[0]!.label).toBe("Территория");
  });

  it("a claimed place nobody has read yet has its page, every question a gap", () => {
    const unread = claimedRegions().find((r) => !CONTESTS.some((c) => c.place === r.slug))!;
    const view = contestView(unread.slug, "en")!;
    expect(view.compared).toBe(0);
    expect(view.sides.map((s) => s.role)).toEqual(["governs", "claims"]);
    expect(view.rows.every((r) => r.cells.every((c) => c.provisions.length === 0))).toBe(true);
  });

  it("a place no one claims has no comparison", () => {
    expect(contestView("switzerland", "en")).toBeNull();
    expect(contestView("nowhere", "en")).toBeNull();
  });

  it("lists every claimed place once", () => {
    const listed = contestSummaries("en").map((s) => s.slug);
    expect(listed).toEqual(claimedRegions().map((r) => r.slug));
    expect(listed).toContain("south-ossetia");
  });
});

describe("a pack the world list marks as claimed", () => {
  it("is found by its slug when it has no ISO code, and every page of it links its comparison", () => {
    const pack = placesConfig.packs.find((p) => p.key === "south_ossetia")!;
    expect(contestSlugForPack(pack)).toBe("south-ossetia");
    expect(contestNote(contestSlugForPack(pack), "en")).toEqual({
      claimant: { name: "Georgia", href: "/places/georgia" },
      href: "/places/contested/south-ossetia",
    });
  });

  it("is not found for a pack no one claims", () => {
    for (const pack of placesConfig.packs.filter((p) => p.key !== "south_ossetia")) {
      expect(contestSlugForPack(pack), pack.key).toBeNull();
    }
  });
});
