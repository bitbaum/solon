import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { PLACES_REPO_FILES } from "@/lib/config/places/repo-files";
import { fixtureAdapter } from "../adapters/fixture";
import { checkBatch } from "../importer/validate";

const SOURCE = "so-constitution-units";
const file = PLACES_REPO_FILES.find((r) => r.source === SOURCE)!.file;
const batch = fixtureAdapter.schema.parse(JSON.parse(readFileSync(file, "utf8")));

describe("South Ossetia's structure (a place with no ISO code)", () => {
  it("passes the importer's checks against the pack, with no problem and nothing quarantined", () => {
    const check = checkBatch(batch, placesConfig, SOURCE);
    expect(check.problems).toEqual([]);
    expect(check.quarantined).toEqual([]);
  });

  it("is identified by Wikidata only: no ISO 3166-1 code exists to borrow", () => {
    const pack = placesConfig.packs.find((p) => p.key === "south_ossetia")!;
    expect(pack.region).toBeUndefined();
    expect(pack.identifierSchemes).toEqual(["wikidata"]);
    const schemes = batch.jurisdictions.flatMap((j) =>
      [j.ref, ...j.identifiers].map((r) => r.scheme),
    );
    expect(new Set(schemes)).toEqual(new Set(["wikidata"]));
  });

  it("holds the five units the Constitution lists, each part of the one nation", () => {
    const units = batch.jurisdictions.filter((j) => j.levelKey === "administrative_unit");
    expect(units).toHaveLength(5);
    const nation = batch.jurisdictions.filter((j) => j.levelKey === "nation");
    expect(nation).toHaveLength(1);
    const parents = batch.relations.filter((r) => r.relation === "part_of");
    expect(parents.map((r) => r.from.value).sort()).toEqual(units.map((u) => u.ref.value).sort());
    expect(new Set(parents.map((r) => r.to.value))).toEqual(new Set([nation[0]!.ref.value]));
  });

  it("names every place by its own authority's name first (Russian, Cyrillic)", () => {
    for (const j of batch.jurisdictions) {
      const own = j.names.filter((n) => n.nameType === "self");
      expect(own.map((n) => [n.locale, n.script])).toEqual([["ru", "Cyrl"]]);
    }
  });

  it("says nothing of who claims, administers or recognises: those rows have their own sources", () => {
    expect(batch.relations.every((r) => r.relation === "part_of")).toBe(true);
    expect(batch.facts).toEqual([]);
  });
});
