import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import {
  configSha256,
  planSync,
  projectConfig,
  type ReferencedKeys,
  type RegistryRows,
} from "../sync-config";
import { withTestland } from "./fixtures/testland/config";

const EMPTY: RegistryRows = {
  packs: [],
  levels: [],
  metrics: [],
  identifierSchemes: [],
  instrumentKinds: [],
};
const NOTHING_USED: ReferencedKeys = {
  packs: new Set(),
  levels: new Set(),
  metrics: new Set(),
  identifierSchemes: new Set(),
  schemesOnNonStatePlaces: new Set(),
  instrumentKinds: new Set(),
};
const testland = projectConfig(withTestland(placesConfig));

describe("planSync — config is the producer, the tables its projection", () => {
  it("inserts every key of a new pack, levels with their parents", () => {
    const { changes, refusals } = planSync(testland, EMPTY, NOTHING_USED);
    expect(refusals).toEqual([]);
    expect(changes).toContainEqual({ registry: "packs", key: "testland", action: "insert" });
    expect(changes).toContainEqual({
      registry: "levels",
      key: "testland/hamlet",
      action: "insert",
    });
    expect(changes).toContainEqual({
      registry: "metrics",
      key: "test.multiplier",
      action: "insert",
    });
    expect(testland.levels.find((l) => l.key === "hamlet")!.parentKey).toBe("parish");
  });

  it("does nothing when the database already agrees", () => {
    expect(planSync(testland, testland, NOTHING_USED)).toEqual({ changes: [], refusals: [] });
  });

  it("retires a key that vanished from config and that nothing uses — never deletes it", () => {
    const { changes } = planSync(EMPTY, testland, NOTHING_USED);
    expect(changes).toContainEqual({ registry: "packs", key: "testland", action: "retire" });
    expect(changes.every((c) => c.action === "retire")).toBe(true);
  });

  it("refuses to pull a key out from under the data that uses it", () => {
    const { refusals } = planSync(EMPTY, testland, {
      ...NOTHING_USED,
      metrics: new Set(["test.multiplier"]),
    });
    expect(refusals).toEqual([
      'metrics "test.multiplier" vanished from config but data still uses it — mark it retired instead',
    ]);
  });

  it("refuses to change the value type of a metric facts already hold", () => {
    const changed: RegistryRows = {
      ...testland,
      metrics: testland.metrics.map((m) =>
        m.key === "test.multiplier" ? { ...m, valueType: "tariff" as const } : m,
      ),
    };
    const used = { ...NOTHING_USED, metrics: new Set(["test.multiplier"]) };
    expect(planSync(changed, testland, used).refusals).toEqual([
      'metric "test.multiplier" changes its value type, but facts already hold it',
    ]);
    expect(planSync(changed, testland, NOTHING_USED).changes).toEqual([
      { registry: "metrics", key: "test.multiplier", action: "update" },
    ]);
  });

  it("refuses to reserve a scheme a founded place already carries", () => {
    const changed: RegistryRows = {
      ...testland,
      identifierSchemes: testland.identifierSchemes.map((s) =>
        s.key === "testland_hamlet" ? { ...s, reserved: true } : s,
      ),
    };
    const used = { ...NOTHING_USED, schemesOnNonStatePlaces: new Set(["testland_hamlet"]) };
    expect(planSync(changed, testland, used).refusals).toEqual([
      'identifier scheme "testland_hamlet" cannot become reserved: a founded place carries it',
    ]);
  });

  it("retires and brings back a key when config says so", () => {
    const retired: RegistryRows = {
      ...testland,
      metrics: testland.metrics.map((m) => ({ ...m, retired: m.key === "test.multiplier" })),
    };
    expect(planSync(retired, testland, NOTHING_USED).changes).toEqual([
      { registry: "metrics", key: "test.multiplier", action: "retire" },
    ]);
    expect(planSync(testland, retired, NOTHING_USED).changes).toEqual([
      { registry: "metrics", key: "test.multiplier", action: "unretire" },
    ]);
  });

  it("inserts a key config already retires, then retires it", () => {
    const retired: RegistryRows = {
      ...EMPTY,
      metrics: [{ key: "test.old", valueType: "number", retired: true }],
    };
    expect(planSync(retired, EMPTY, NOTHING_USED).changes).toEqual([
      { registry: "metrics", key: "test.old", action: "insert" },
      { registry: "metrics", key: "test.old", action: "retire" },
    ]);
  });
});

describe("configSha256", () => {
  it("does not depend on the order entries are declared in", () => {
    const reversed: RegistryRows = {
      ...testland,
      levels: [...testland.levels].reverse(),
      metrics: [...testland.metrics].reverse(),
    };
    expect(configSha256(reversed)).toBe(configSha256(testland));
    expect(configSha256(testland)).not.toBe(configSha256(EMPTY));
  });
});
