import { describe, expect, it } from "vitest";
import { LAW_AUTHORITIES, countryOf } from "@/lib/config/law";
import { placesConfig } from "@/lib/config/places";
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
});
