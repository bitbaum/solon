/**
 * Every generated dataset, refreshed in the order they build on each other:
 * one command instead of five run in an order nobody wrote down. Each
 * generator is a package script. One that fails keeps its old files (they are
 * restored from git) and is reported, and the rest still run.
 *
 *   pnpm run data:refresh [--only world-profiles,photos] [--list]
 *
 * `.github/workflows/data-refresh.yml` runs it every month and opens a pull
 * request when anything changed; the fleet's sweep merges it when CI is green,
 * and the deploy's places-data job imports what changed. A new generator is
 * one entry below.
 */
import { spawnSync } from "node:child_process";

interface Generator {
  key: string;
  /** The package script that writes it. */
  script: string;
  args?: string[];
  /** The files it writes, restored when it fails. */
  writes: string[];
  /** Why it is where it is in the order. */
  why: string;
}

export const GENERATORS: readonly Generator[] = [
  {
    key: "world-profiles",
    script: "world:profiles",
    writes: ["data/world/profiles.json", "src/lib/config/world/extras.json"],
    why: "every place's Wikidata facts and the UN's list; the world list reads extras.json, so it is first",
  },
  {
    key: "world-countries",
    script: "places:world-countries",
    writes: ["data/places/world/countries.json"],
    why: "the world pack's countries, from the registry and the packs (offline)",
  },
  {
    key: "world-subdivisions",
    script: "places:world-subdivisions",
    writes: ["data/places/world/subdivisions.json"],
    why: "every country's ISO 3166-2 subdivisions, from Wikidata",
  },
  {
    key: "photos",
    script: "places:photos",
    writes: ["data/world/photos.json"],
    why: "the world list's photographs and their licences; after the profiles it reads",
  },
  {
    key: "law-plan",
    script: "law:plan",
    args: ["seed"],
    writes: ["data/law/plan.json"],
    why: "the plan for every country's law, keeping every choice a person made; after the world list",
  },
];

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1]?.split(",") : undefined;

function main(): number {
  if (args.includes("--list")) {
    for (const g of GENERATORS) console.log(`${g.key}: pnpm run ${g.script} — ${g.why}`);
    return 0;
  }
  const unknown = (only ?? []).filter((key) => !GENERATORS.some((g) => g.key === key));
  if (unknown.length > 0) {
    console.error(`no generator ${unknown.join(", ")}; pnpm run data:refresh --list`);
    return 2;
  }
  const failed: string[] = [];
  for (const g of GENERATORS) {
    if (only && !only.includes(g.key)) continue;
    console.log(`\n== ${g.key}: pnpm run ${g.script} ${(g.args ?? []).join(" ")}`);
    const run = spawnSync("pnpm", ["run", g.script, ...(g.args ?? [])], { stdio: "inherit" });
    if (run.status !== 0) {
      failed.push(g.key);
      spawnSync("git", ["checkout", "--", ...g.writes], { stdio: "inherit" });
      console.log(`${g.key} failed: its files are as they were`);
    }
  }
  console.log(failed.length > 0 ? `\nFAILED: ${failed.join(", ")}` : "\nevery generator ran");
  return failed.length > 0 ? 1 : 0;
}

process.exit(main());
