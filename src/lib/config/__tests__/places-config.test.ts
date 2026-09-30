import { describe, expect, it } from "vitest";
import {
  placesConfig,
  placesConfigProblems,
  placesConfigSchema,
  type PlacesConfig,
} from "@/lib/config/places";
import {
  TESTLAND_PACK,
  TESTLAND_TAX,
  withTestland,
} from "@/lib/places/__tests__/fixtures/testland/config";

/**
 * The Places config is the contract between the engine and the world (§5).
 * Its guard (§12, "config is valid") is this file: Solon's own config loads,
 * a contributed pack loads, and each way a pack can be wrong is named.
 */
describe("Solon's Places config", () => {
  it("loads and has no problems", () => {
    expect(placesConfigProblems(placesConfig)).toEqual([]);
  });

  it("accepts only licences that are not share-alike", () => {
    expect(placesConfig.licences.every((licence) => !licence.shareAlike)).toBe(true);
    expect(() =>
      placesConfigSchema.parse({
        ...placesConfig,
        licences: [{ spdx: "ODbL-1.0", requiresAttribution: true, shareAlike: true }],
      }),
    ).toThrow();
  });
});

describe("a contributed pack (Testland)", () => {
  const testland = withTestland(placesConfig);

  it("loads with no engine change", () => {
    expect(placesConfigProblems(testland)).toEqual([]);
    expect(testland.packs.map((pack) => pack.key)).toContain("testland");
  });

  it("fills in defaults", () => {
    const pack = testland.packs.find((p) => p.key === "testland")!;
    expect(pack.levels.find((l) => l.key === "realm")!.coverage).toBe("full");
    expect(pack.instrumentKinds).toEqual([]);
  });
});

/** Testland, broken in one way. */
function broken(change: (config: PlacesConfig) => void): string[] {
  const config = structuredClone(withTestland(placesConfig));
  change(config);
  return placesConfigProblems(config);
}
const pack = (config: PlacesConfig) => config.packs.find((p) => p.key === TESTLAND_PACK.key)!;

describe("placesConfigProblems names what is wrong", () => {
  it("a level declared twice", () => {
    expect(
      broken((c) => {
        pack(c).levels.push({ ...pack(c).levels[1]! });
      }),
    ).toContain('pack "testland": level "shire" is declared twice');
  });

  it("two roots, or none", () => {
    expect(
      broken((c) => {
        pack(c).levels[1]!.parent = null;
      }),
    ).toContain('pack "testland": needs exactly one root level, has 2');
  });

  it("a level whose parent does not exist", () => {
    expect(
      broken((c) => {
        pack(c).levels[2]!.parent = "county";
      }),
    ).toContain('pack "testland": level "parish" refers to unknown level "county"');
  });

  it("a hierarchy that loops", () => {
    expect(
      broken((c) => {
        pack(c).levels[0]!.parent = "parish";
      }),
    ).toEqual(
      expect.arrayContaining([
        'pack "testland": needs exactly one root level, has 0',
        'pack "testland": level "realm" is its own ancestor',
      ]),
    );
  });

  it("a currency that is not ISO 4217", () => {
    expect(
      broken((c) => {
        pack(c).currency = "QQQ";
      }),
    ).toContain('pack "testland": "QQQ" is not an ISO 4217 currency');
  });

  it("a scheme, source or instrument kind nobody declared", () => {
    const problems = broken((c) => {
      pack(c).identifierSchemes.push("nowhere_code");
      pack(c).sources.push("nowhere-register");
      pack(c).instrumentKinds.push("duel");
    });
    expect(problems).toEqual(
      expect.arrayContaining([
        'pack "testland": unknown identifier scheme "nowhere_code"',
        'pack "testland": unknown source "nowhere-register"',
        'pack "testland": unknown instrument kind "duel"',
      ]),
    );
  });

  it("a source whose licence is not on the policy", () => {
    expect(
      broken((c) => {
        c.sources.find((s) => s.key === "testland-register")!.licence = "CC-BY-NC-4.0";
      }),
    ).toContain('source "testland-register": licence "CC-BY-NC-4.0" is not on the licence policy');
  });

  it("a tax model that reads a level or metric the pack does not have", () => {
    const problems = broken((c) => {
      pack(c).taxModel = {
        ...TESTLAND_TAX,
        components: [
          { key: "crown", tariff: { level: "empire", metric: "test.income.tariff" } },
          { key: "levy", tariff: { level: "realm", metric: "test.levy" } },
        ],
      };
    });
    expect(problems).toEqual(
      expect.arrayContaining([
        'pack "testland" tax model: "crown" reads unknown level "empire"',
        'pack "testland" tax model: "levy" reads unknown metric "test.levy"',
      ]),
    );
  });

  it("a tax model that reads a number as a tariff", () => {
    expect(
      broken((c) => {
        pack(c).taxModel = {
          ...TESTLAND_TAX,
          components: [{ key: "crown", tariff: { level: "realm", metric: "test.multiplier" } }],
        };
      }),
    ).toContain(
      'pack "testland" tax model: "crown" reads "test.multiplier" as a tariff, but it holds a number',
    );
  });

  it("the tax model's own problems, from the shared evaluator", () => {
    expect(
      broken((c) => {
        pack(c).taxModel = { ...TESTLAND_TAX, inputs: ["guild_member"] };
      }),
    ).toContain('pack "testland" tax model: base "taxable_income" is not listed in inputs');
  });

  it("a tax model a reader could not read: no labels, or a variant without one", () => {
    expect(
      broken((c) => {
        pack(c).taxLabels = undefined;
      }),
    ).toContain('pack "testland" tax model: no taxLabels');
    expect(
      broken((c) => {
        delete pack(c).taxLabels!.variants.together;
      }),
    ).toContain('pack "testland" tax model: variant "together" has no label');
    expect(
      broken((c) => {
        pack(c).taxModel = undefined;
      }),
    ).toContain('pack "testland": tax labels without a tax model');
  });

  it("an identifier pattern that does not compile", () => {
    expect(
      broken((c) => {
        c.identifierSchemes.find((s) => s.key === "testland_register")!.pattern = "T[0-9";
      }),
    ).toContain('identifier scheme "testland_register": pattern does not compile');
  });
});
