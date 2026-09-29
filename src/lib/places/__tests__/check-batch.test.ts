import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { ADAPTERS } from "../adapters";
import { checkBatch } from "../importer/validate";
import { withTestland } from "./fixtures/testland/config";
import { register, testlandBatch } from "./fixtures/testland/batch";

const config = withTestland(placesConfig);
const SOURCE = "testland-register";

describe("checkBatch", () => {
  it("accepts Testland's register as it is", () => {
    const check = checkBatch(testlandBatch(), config, SOURCE);
    expect(check.problems).toEqual([]);
    expect(check.quarantined).toEqual([]);
    expect(check.batch.facts).toHaveLength(testlandBatch().facts.length);
  });

  it("refuses a source that is not registered or does not serve the pack", () => {
    expect(checkBatch(testlandBatch(), config, "nowhere").problems).toEqual([
      'source "nowhere" is not in the source registry',
    ]);
    const other = { ...testlandBatch(), pack: "elsewhere" };
    expect(checkBatch(other, config, SOURCE).problems).toEqual([
      'source "testland-register" does not serve pack "elsewhere"',
      'pack "elsewhere" is not in config',
    ]);
  });

  it("refuses unknown levels, foreign schemes, malformed identifiers and duplicates", () => {
    const batch = testlandBatch();
    batch.jurisdictions[1]!.levelKey = "county";
    batch.jurisdictions[2]!.ref = { scheme: "ch_bfs", value: "261" };
    batch.jurisdictions[3]!.ref = register("X1");
    batch.jurisdictions.push(structuredClone(batch.jurisdictions[4]!));
    const problems = checkBatch(batch, config, SOURCE).problems;
    expect(problems).toEqual([
      'place testland_register:T110: level "county" is not a level of pack "testland"',
      `place ch_bfs:261: scheme "ch_bfs" is not one of pack "testland"'s schemes`,
      'place testland_register:X1: "X1" does not match scheme "testland_register"',
      "place testland_register:T112 appears twice",
    ]);
  });

  it("refuses facts of unknown metrics, of the wrong type, or with a broken tariff", () => {
    const batch = testlandBatch();
    batch.facts[0]!.metricKey = "test.unknown";
    batch.facts[2]!.value = 0.04;
    batch.facts[3]!.value = { kind: "flat", currency: "QQQ", rate: 0.1 };
    batch.facts[4]!.value = { kind: "flat", currency: "XTS", rate: 1 };
    const problems = checkBatch(batch, config, SOURCE).problems;
    expect(problems).toEqual([
      expect.stringContaining('metric "test.unknown" is not in the catalog'),
      expect.stringContaining(
        '"test.income.tariff.basic" holds a tariff, the source gave a number',
      ),
      expect.stringContaining('"QQQ" is not an ISO 4217 currency'),
      expect.stringContaining('"test.multiplier" holds a number, the source gave something else'),
    ]);
  });

  it("quarantines a value outside the metric's plausible band and publishes the rest", () => {
    const batch = testlandBatch();
    const fenwick = batch.facts.find((f) => f.jurisdiction.value === "T121")!;
    fenwick.value = 9.5;
    const check = checkBatch(batch, config, SOURCE);
    expect(check.problems).toEqual([]);
    expect(check.quarantined).toEqual([
      { fact: fenwick, reason: '9.5 is outside the plausible band [0, 5] of "test.multiplier"' },
    ]);
    expect(check.batch.facts).toHaveLength(batch.facts.length - 1);
    expect(check.batch.facts).not.toContain(fenwick);
  });
});

describe("adapters", () => {
  it("every source in config names an adapter that exists", () => {
    for (const source of config.sources) {
      expect(ADAPTERS.get(source.adapter), source.key).toBeDefined();
    }
  });

  it("each adapter is registered under its own key", () => {
    for (const [key, adapter] of ADAPTERS) {
      expect(adapter.key).toBe(key);
    }
  });
});
