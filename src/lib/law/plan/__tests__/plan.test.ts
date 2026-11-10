import { describe, expect, it } from "vitest";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { LICENCES } from "@/lib/config/places/licences";
import { readPlan } from "../load";
import type { CountryPlan } from "../schema";
import { chooseByRule, nameKey, isoOfConstitute, mergeSeed } from "../seed";
import { planStatus, planTotals } from "../status";

const country = (over: Partial<CountryPlan["constitution"]> = {}): CountryPlan => ({
  authority: "xx",
  copyright: null,
  languages: ["ru"],
  constitution: {
    inForce: { title: "t", enacted: 1993, amended: 2014, constitute: "X_2014" },
    candidates: [],
    chosen: null,
    ...over,
  },
  national: { register: null, texts: null, candidates: [] },
});
const page = (wikidata: string, year: number | null, lang = "ru") => ({
  kind: "wikisource" as const,
  url: `https://${lang}.wikisource.org/wiki/${wikidata}`,
  lang,
  wikidata,
  year,
  ended: false,
});

describe("the plan for the law of every country", () => {
  it("holds every country that has an authority, each with a known authority and a licence the policy lists", () => {
    const plan = readPlan();
    const countries = LAW_AUTHORITIES.filter((a) => a.place?.scheme === "iso_3166_1");
    for (const a of countries) {
      const entry = plan.countries[a.place!.value];
      expect(entry, a.place!.value).toBeDefined();
      expect(entry!.authority).toBe(a.key);
    }
    for (const [iso, c] of Object.entries(plan.countries)) {
      if (c.copyright)
        expect(
          LICENCES.some((l) => l.spdx === c.copyright!.spdx),
          iso,
        ).toBe(true);
      // A person's choice says why.
      if (c.constitution.chosen?.by === "person")
        expect(c.constitution.chosen.why, iso).toBeTruthy();
    }
  });

  it("matches Constitute's names to countries", () => {
    expect(nameKey("Gambia__the")).toBe(nameKey("The Gambia"));
    const names = new Map([[nameKey("Ukraine"), "UA"]]);
    expect(isoOfConstitute("Ukraine", names)).toBe("UA");
    expect(isoOfConstitute("Russian_Federation__the", names)).toBe("RU");
    expect(isoOfConstitute("Atlantis", names)).toBeNull();
  });

  it("chooses only by rule: one item, in an official language, of the year enacted or with an official address", () => {
    expect(chooseByRule(country({ candidates: [page("Q1", 1993)] }))?.url).toContain("Q1");
    // No year, no official address: a draft sharing the label is never chosen.
    expect(chooseByRule(country({ candidates: [page("Q2", null)] }))).toBeNull();
    const withAddress = country({
      candidates: [
        page("Q3", null),
        {
          kind: "official",
          url: "https://example.gov/c",
          lang: null,
          wikidata: "Q3",
          year: null,
          ended: false,
        },
      ],
    });
    expect(chooseByRule(withAddress)?.url).toContain("Q3");
    // Not an official language, an ended item, or two items of the same standing: no choice.
    expect(chooseByRule(country({ candidates: [page("Q4", 1993, "en")] }))).toBeNull();
    expect(
      chooseByRule(country({ candidates: [{ ...page("Q5", 1993), ended: true }] })),
    ).toBeNull();
    expect(chooseByRule(country({ candidates: [page("Q6", 1993), page("Q7", 1993)] }))).toBeNull();
  });

  it("keeps what a person decided when the sources are read again", () => {
    const before = {
      seeded: "2026-01-01",
      countries: {
        UA: {
          ...country(),
          copyright: { spdx: "s", basis: "b", url: "https://x.example", readOn: "2026-11-10" },
          constitution: {
            ...country().constitution,
            chosen: {
              kind: "copy" as const,
              url: "https://x.example/c.pdf",
              lang: "uk",
              by: "person" as const,
              why: "w",
            },
            note: "n",
          },
          national: {
            register: "r",
            texts: null,
            candidates: [{ url: "https://y.example", note: "z" }],
          },
        },
      },
    };
    const after = mergeSeed(
      before,
      new Map([["UA", { authority: "ua", languages: ["uk"], inForce: null, candidates: [] }]]),
      "2026-11-10",
    );
    expect(after.countries.UA!.constitution.chosen?.by).toBe("person");
    expect(after.countries.UA!.constitution.note).toBe("n");
    expect(after.countries.UA!.copyright?.spdx).toBe("s");
    expect(after.countries.UA!.national.register).toBe("r");
    expect(after.countries.UA!.authority).toBe("ua");
  });

  it("counts progress from the database, and names the next step", () => {
    const plan = {
      seeded: "x",
      countries: {
        RU: { ...country(), authority: "ru" },
        UA: { ...country({ chosen: null }), authority: "ua" },
      },
    };
    const rows = planStatus(
      plan,
      new Map([
        ["ru", { constitution: { listed: 1, withText: 1 }, national: { listed: 10, withText: 0 } }],
      ]),
    );
    expect(rows.find((r) => r.iso === "RU")).toMatchObject({
      constitution: "text",
      national: "listed",
      next: "find where the national laws' texts can be read",
    });
    expect(rows.find((r) => r.iso === "UA")?.next).toBe("find a copy of the constitution in force");
    expect(planTotals(rows).constitution).toEqual({ text: 1, listed: 0, none: 1 });
  });
});
