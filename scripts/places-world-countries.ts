/**
 * Writes the world pack's places: every country in the country registry
 * (src/lib/config/world/countries.ts) that no country pack holds in depth, as
 * the nation level, by its ISO 3166-1 alpha-2 code, named in five languages
 * by Unicode CLDR (Intl.DisplayNames). A country that gets its own pack moves
 * out of this file by running the script again.
 *
 *   pnpm run places:world-countries           write data/places/world/countries.json
 *   pnpm run places:world-countries --check   fail when the file is out of date
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

const jurisdictions = COUNTRIES.filter((c) => !held.has(c.a2)).map((c) => ({
  ref: { scheme: "iso_3166_1", value: c.a2 },
  levelKey: "nation",
  names: names.flatMap(([locale, display]) => {
    const name = display.of(c.a2);
    return name && name !== c.a2 ? [{ locale, name, nameType: "common" }] : [];
  }),
}));

async function main() {
  // the repository formats its data with Prettier, so the generator does too
  const body = await format(JSON.stringify({ pack: "world", jurisdictions }), { parser: "json" });
  if (process.argv.includes("--check")) {
    let was = "";
    try {
      was = readFileSync(FILE, "utf8");
    } catch {
      // Missing: out of date.
    }
    if (was !== body) {
      console.error(
        "data/places/world/countries.json is out of date: run pnpm run places:world-countries",
      );
      process.exit(1);
    }
  } else {
    mkdirSync(dirname(FILE), { recursive: true });
    writeFileSync(FILE, body);
    console.log(`${jurisdictions.length} countries written (${held.size} held by country packs)`);
  }
}

void main();
