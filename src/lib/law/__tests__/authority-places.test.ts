import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LAW_AUTHORITIES, countryOf } from "@/lib/config/law";
import { placesConfig } from "@/lib/config/places";
import { PLACES_REPO_FILES } from "@/lib/config/places/repo-files";
import { fixtureAdapter } from "@/lib/places/adapters/fixture";
import { holdersOf, resolveAuthority, type Holder } from "@/lib/places/authority-places";
import { WORLD } from "@/lib/config/world";

/**
 * Law authorities are a second tree beside Places (design:
 * docs/design/2026-11-place-navigation.md). They join it only through the
 * code in `place`, so these checks keep that join honest without a database;
 * `law-authorities.integration.test.ts` checks it against the rows.
 */
const placed = LAW_AUTHORITIES.flatMap((a) => (a.place ? [{ ...a, place: a.place }] : []));

describe("law authorities and places", () => {
  it("name a place by a registered identifier scheme, with a value that fits it in full", () => {
    for (const a of placed) {
      const scheme = placesConfig.identifierSchemes.find((s) => s.key === a.place.scheme);
      expect(scheme, `${a.key}: scheme ${a.place.scheme}`).toBeDefined();
      expect(scheme!.retired, `${a.key}: retired scheme`).toBeUndefined();
      expect(
        new RegExp(`^(?:${scheme!.pattern})$`).test(a.place.value),
        `${a.key}: ${a.place.value} against ${scheme!.pattern}`,
      ).toBe(true);
    }
  });

  it("never name the same place twice", () => {
    const seen = new Map<string, string>();
    for (const a of placed) {
      const id = `${a.place.scheme}:${a.place.value}`;
      expect(seen.get(id), `${a.key} and ${seen.get(id)} both name ${id}`).toBeUndefined();
      seen.set(id, a.key);
    }
  });

  it("name a place some pack can carry, in the country the authority's tree puts it", () => {
    for (const a of placed.filter((x) => x.place.scheme !== "iso_3166_1")) {
      const packs = placesConfig.packs.filter((p) => p.identifierSchemes.includes(a.place.scheme));
      expect(packs.length, `${a.key}: no pack carries ${a.place.scheme}`).toBeGreaterThan(0);
      const country = countryOf(a.key);
      // A place in no country has no region to compare: it resolves through its identifier, below.
      if (country === null) continue;
      expect(
        packs.some((p) => p.region === country),
        `${a.key}: its tree says ${country}, the packs carrying ${a.place.scheme} say ${packs.map((p) => p.region).join(", ")}`,
      ).toBe(true);
    }
  });

  it("name a country by a code of the world's countries", () => {
    const regions = new Set(WORLD.map((w) => w.code));
    for (const a of placed.filter((x) => x.place.scheme === "iso_3166_1")) {
      expect(regions.has(a.place.value), `${a.key}: ${a.place.value}`).toBe(true);
    }
  });

  const holders: Holder[] = holdersOf(
    PLACES_REPO_FILES.filter(
      (r) => placesConfig.sources.find((x) => x.key === r.source)?.adapter === "fixture",
    ).map((r) => fixtureAdapter.schema.parse(JSON.parse(readFileSync(r.file, "utf8")))),
  );

  it("never resolve to two jurisdictions, in any data the repository holds", () => {
    for (const a of placed) {
      expect(resolveAuthority(a.place, holders).length, a.key).toBeLessThanOrEqual(1);
    }
  });

  it("a place in no country resolves through its identifier to exactly one jurisdiction: the root of its own pack", () => {
    const stateless = placed.filter((a) => countryOf(a.key) === null);
    expect(stateless.length).toBeGreaterThan(0);
    for (const a of stateless) {
      const found = resolveAuthority(a.place, holders);
      expect(found, `${a.key}: ${a.place.scheme}:${a.place.value}`).toHaveLength(1);
      const pack = placesConfig.packs.find((p) => p.key === found[0]!.pack)!;
      expect(pack.region, `${a.key}'s pack has an ISO region to use instead`).toBeUndefined();
      expect(pack.levels.find((l) => l.key === found[0]!.levelKey)?.parent, a.key).toBeNull();
    }
  });

  it("the Republic of South Ossetia's authority is the root of the south_ossetia pack", () => {
    const rso = placed.find((a) => a.key === "rso")!;
    expect(resolveAuthority(rso.place, holders).map((h) => h.pack)).toEqual(["south_ossetia"]);
  });
});

/**
 * The disputed case. Two authorities over one area each resolve to exactly one
 * jurisdiction of their own, and never the same one: the Republic's authority
 * to the Republic's own root, and (added with Georgia) Georgia's own unit for
 * the area to a unit part of Georgia. Whose view is right is not decided here:
 * both are rows, and the area has both as claimants (design §7.1).
 */
describe("two authorities over one area", () => {
  const made: Holder[] = holdersOf([
    {
      pack: "republic",
      jurisdictions: [{ ref: { scheme: "wikidata", value: "Q1" }, levelKey: "nation" }],
    },
    {
      pack: "neighbour",
      jurisdictions: [
        { ref: { scheme: "wikidata", value: "Q2" }, levelKey: "nation" },
        {
          ref: { scheme: "wikidata", value: "Q3" },
          identifiers: [{ scheme: "wikidata", value: "Q4" }],
          levelKey: "unit",
        },
      ],
    },
  ]);
  // Both claim area "x": one row each, as area assertions state it.
  const claims = [
    { authority: "republic", place: { scheme: "wikidata", value: "Q1" }, area: "x" },
    { authority: "neighbours-unit", place: { scheme: "wikidata", value: "Q3" }, area: "x" },
  ];

  it("each resolves to exactly one jurisdiction, and not the same one", () => {
    const resolved = claims.map((c) => resolveAuthority(c.place, made));
    expect(resolved.map((r) => r.length)).toEqual([1, 1]);
    expect(resolved[0]![0]).not.toBe(resolved[1]![0]);
    expect(resolved.map((r) => r[0]!.pack)).toEqual(["republic", "neighbour"]);
  });

  it("the area keeps both claimants", () => {
    expect(claims.filter((c) => c.area === "x")).toHaveLength(2);
  });

  it("a place resolves through any identifier it carries, still to one jurisdiction", () => {
    expect(resolveAuthority({ scheme: "wikidata", value: "Q4" }, made)).toHaveLength(1);
  });

  it("an identifier nobody holds resolves to none", () => {
    expect(resolveAuthority({ scheme: "wikidata", value: "Q9" }, made)).toEqual([]);
  });
});
