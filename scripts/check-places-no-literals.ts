/**
 * CI guard (design §12): engine code names no country, level, metric, scheme,
 * source, currency, ISO code or month-day. Scans the Places engine, its page
 * and the vendored tax model; tests and fixtures are where made-up countries
 * live, so they are not scanned.
 *
 *   pnpm run check:places-literals
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { placesConfig } from "@/lib/config/places";
import { findLiterals, registryKeys } from "@/lib/places/guards/no-literals";

const ROOTS = [
  "src/lib/places",
  "src/lib/tax-model",
  "src/components/places",
  "src/app/[locale]/places",
];
const SKIP_DIRS = new Set(["__tests__", "fixtures"]);

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) {
        yield* sourceFiles(path);
      }
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      yield path;
    }
  }
}

const keys = registryKeys(placesConfig);
let files = 0;
let problems = 0;
for (const root of ROOTS) {
  for (const path of sourceFiles(join(process.cwd(), root))) {
    files += 1;
    for (const finding of findLiterals(path, readFileSync(path, "utf8"), keys)) {
      problems += 1;
      console.error(
        `❌ ${relative(process.cwd(), path)}:${finding.line} "${finding.literal}" is ${finding.reason}`,
      );
    }
  }
}
if (problems > 0) {
  console.error(
    `\n${problems} literal(s) name the world in engine code. Mechanism in code, policy in config, facts in data.`,
  );
  process.exit(1);
}
console.log(
  `✅ places engine: ${files} files, no country, code or registry key in the code (${keys.size} registry keys checked)`,
);
