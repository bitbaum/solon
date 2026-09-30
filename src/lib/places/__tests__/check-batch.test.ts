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

  it("refuses postcodes a pack has no format for, that do not match it, or that repeat", () => {
    const row = {
      postcode: "8053",
      locality: "Zürich",
      place: { scheme: "bfs_municipality", value: "261" },
      share: 1,
      validFrom: null,
      validTo: null,
    };
    const swiss = {
      pack: "switzerland",
      jurisdictions: [],
      relations: [],
      facts: [],
      postcodes: [row, { ...row, postcode: "80530" }, row],
      areas: [],
      geometry: null,
    };
    expect(checkBatch(swiss, config, "swisstopo-postcode-localities").problems).toEqual([
      `postcode 80530 Zürich bfs_municipality:261 -: "80530" does not match pack "switzerland"'s postcode format`,
      "postcode 8053 Zürich bfs_municipality:261 - appears twice",
    ]);
    const testland = { ...testlandBatch(), postcodes: [{ ...row, place: register("T110") }] };
    expect(checkBatch(testland, config, SOURCE).problems).toEqual([
      'postcode 8053 Zürich testland_register:T110 -: pack "testland" has no postcode format',
    ]);
  });

  it("refuses areas without their file, of an unknown level, or naming features it lacks", () => {
    const parishes = (ids: string[]) =>
      JSON.stringify({
        type: "Topology",
        arcs: [],
        objects: {
          parish: { type: "GeometryCollection", geometries: ids.map((id) => ({ type: null, id })) },
        },
      });
    const area = (value: string, feature: string) => ({
      place: register(value),
      feature,
      validFrom: null,
      validTo: null,
    });
    const batch = {
      ...testlandBatch(),
      areas: [area("T110", "a"), area("T111", "b")],
      geometry: { levelKey: "parish", datasetVersion: "1", topology: parishes(["a", "b"]) },
    };
    expect(checkBatch(batch, config, SOURCE).problems).toEqual([]);

    expect(checkBatch({ ...batch, geometry: null }, config, SOURCE).problems).toEqual([
      "the batch states areas without the geometry file they are in",
    ]);
    expect(
      checkBatch(
        {
          ...batch,
          areas: [area("T110", "a"), area("T111", "a"), area("X1", "c")],
          geometry: { ...batch.geometry, levelKey: "county", topology: parishes(["a"]) },
        },
        config,
        SOURCE,
      ).problems,
    ).toEqual([
      'geometry: level "county" is not a level of pack "testland"',
      'geometry: the file is not a TopoJSON topology with an object named "county"',
    ]);
    expect(
      checkBatch(
        {
          ...batch,
          areas: [area("T110", "a"), area("T111", "a"), area("X1", "c")],
          geometry: { ...batch.geometry, topology: parishes(["a"]) },
        },
        config,
        SOURCE,
      ).problems,
    ).toEqual([
      "area testland_register:T111 (feature a): the feature is stated twice",
      "area testland_register:X1 (feature c): the geometry file has no such feature",
      'area testland_register:X1 (feature c): "X1" does not match scheme "testland_register"',
    ]);
    expect(
      checkBatch({ ...batch, geometry: { ...batch.geometry, topology: "{" } }, config, SOURCE)
        .problems,
    ).toEqual(["geometry: the file is not JSON"]);
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
