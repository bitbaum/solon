/**
 * Writes the world pack's places: every country in the country registry
 * (src/lib/config/world/countries.ts) that no country pack holds in depth, as
 * the nation level, by its ISO 3166-1 alpha-2 code, named in five languages
 * by Unicode CLDR (Intl.DisplayNames). A country that gets its own pack moves
 * out of this file by running the script again.
 *
 *   pnpm run places:world-countries           write data/places/world/countries.json
 *   pnpm run places:world-countries --check   fail when the file holds other countries than
 *                                             it should (part of `verify`: a new pack's
 *                                             country must leave this file). Names are not
 *                                             compared: they come from the runtime's CLDR,
 *                                             which a Node update may change.
 *
 * Imported by the `world-country-registry` source
 * (src/lib/config/places/sources.ts).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { format } from "prettier";
import { dirname, join } from "node:path";
import { COUNTRY_PACKS } from "@/lib/config/places/countries";
import { COUNTRIES } from "@/lib/config/world/countries";

const LOCALES = ["en", "de", "fr", "it", "ru"] as const;
const FILE = join(process.cwd(), "data/places/world/countries.json");

const held = new Set(
  COUNTRY_PACKS.flatMap((p) => (p.key !== "world" && p.region ? [p.region] : [])),
);
const names = LOCALES.map(
  (l) => [l, new Intl.DisplayNames([l], { type: "region", fallback: "none" })] as const,
);

const EARTH = { scheme: "world_root", value: "earth" };
const nations = COUNTRIES.filter((c) => !held.has(c.a2));
const earth = {
  ref: EARTH,
  levelKey: "world",
  names: names.flatMap(([locale]) => [
    {
      locale,
      name:
        { en: "The world", de: "Die Welt", fr: "Le monde", it: "Il mondo", ru: "Мир" }[locale] ??
        "The world",
      nameType: "common",
    },
  ]),
};
const relations = nations.map((c) => ({
  from: { scheme: "iso_3166_1", value: c.a2 },
  to: EARTH,
  relation: "part_of",
}));
const jurisdictions = nations.map((c) => ({
  ref: { scheme: "iso_3166_1", value: c.a2 },
  levelKey: "nation",
  names: names.flatMap(([locale, display]) => {
    const name = display.of(c.a2);
    return name && name !== c.a2 ? [{ locale, name, nameType: "common" }] : [];
  }),
}));

async function main() {
  // the repository formats its data with Prettier, so the generator does too
  const body = await format(
    JSON.stringify({ pack: "world", jurisdictions: [earth, ...jurisdictions], relations }),
    { parser: "json" },
  );
  if (process.argv.includes("--check")) {
    let held: string[] = [];
    try {
      const file = JSON.parse(readFileSync(FILE, "utf8")) as {
        jurisdictions: { ref: { scheme: string; value: string } }[];
      };
      held = file.jurisdictions
        .filter((j) => j.ref.scheme === "iso_3166_1")
        .map((j) => j.ref.value);
    } catch {
      // Missing or unreadable: out of date.
    }
    const wanted = nations.map((c) => c.a2);
    const extra = held.filter((a2) => !wanted.includes(a2));
    const missing = wanted.filter((a2) => !held.includes(a2));
    if (extra.length > 0 || missing.length > 0) {
      console.error(
        `data/places/world/countries.json is out of date${
          extra.length > 0
            ? `; it holds ${extra.join(", ")}, which a pack holds or the registry lost`
            : ""
        }${missing.length > 0 ? `; it lacks ${missing.join(", ")}` : ""}: run pnpm run places:world-countries`,
      );
      process.exit(1);
    }
    console.log(`${held.length} countries, as the registry and the packs say`);
  } else {
    mkdirSync(dirname(FILE), { recursive: true });
    writeFileSync(FILE, body);
    console.log(`${nations.length} countries written (${held.size} held by country packs)`);
  }
}

void main();
