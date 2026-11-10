import { describe, expect, it } from "vitest";
import { placesConfig } from "@/lib/config/places";
import { WORLD } from "@/lib/config/world";

/**
 * A country with a pack has two names for its page: the world list's slug
 * (`/places/south-ossetia`) and the pack's root path. They must be the same
 * place's one path: the pack root's canonical form (its key with hyphens,
 * migration 0025) is the world slug, so the hyphenated address opens the
 * pack and never the world page that says Solon holds no places there.
 * Found live on 2026-11-10: /places/south_ossetia showed the pack,
 * /places/south-ossetia the world page, contradicting it.
 */
const canonical = (key: string) => key.replace(/_/g, "-");

describe("a pack's root and the world list's slug are one path", () => {
  it("the canonical root of every pack that has a world entry is that entry's slug", () => {
    const withEntry = placesConfig.packs.flatMap((pack) => {
      const entry = WORLD.find((w) =>
        pack.region ? w.code === pack.region : w.slug === canonical(pack.key),
      );
      return entry ? [{ pack, entry }] : [];
    });
    expect(withEntry.length).toBeGreaterThan(0);
    for (const { pack, entry } of withEntry) {
      expect(canonical(pack.key), `${pack.key} against world slug ${entry.slug}`).toBe(entry.slug);
    }
  });

  it("South Ossetia, which has no ISO code, is matched by its slug alone", () => {
    const pack = placesConfig.packs.find((p) => p.key === "south_ossetia")!;
    expect(pack.region).toBeUndefined();
    expect(WORLD.some((w) => w.slug === canonical(pack.key))).toBe(true);
  });
});
