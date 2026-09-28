#!/usr/bin/env node
/**
 * The kinds of collective are SSOT in bitbaum/orangecat
 * packages/collective-kinds. Solon carries a byte-for-byte copy in
 * src/lib/collective-kinds until that package has a repository or an npm
 * release of its own. A copy drifts; this gate makes the copy safe: it fetches
 * the package's source from OrangeCat's main and fails when any file here
 * differs from it (the four-line VENDORED header aside).
 *
 * Runs in CI (network). Locally: `pnpm run check:kinds-drift`.
 * To update: copy the files from OrangeCat, keep the header, commit.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILES = ["kinds.ts", "place.ts", "legal.ts", "index.ts"];
const SOURCE =
  process.env.COLLECTIVE_KINDS_SOURCE ??
  "https://raw.githubusercontent.com/bitbaum/orangecat/main/packages/collective-kinds/src";
const LOCAL = join(process.cwd(), "src", "lib", "collective-kinds");
const HEADER_LINES = 4;

const stripHeader = (text) => {
  const lines = text.split("\n");
  return lines[0]?.startsWith("// VENDORED") ? lines.slice(HEADER_LINES).join("\n") : text;
};

let drifted = 0;
for (const file of FILES) {
  const res = await fetch(`${SOURCE}/${file}`);
  if (!res.ok) {
    console.error(`❌ could not fetch ${SOURCE}/${file}: ${res.status}`);
    process.exit(2);
  }
  const upstream = (await res.text()).trim();
  const local = stripHeader(readFileSync(join(LOCAL, file), "utf8")).trim();
  if (upstream !== local) {
    drifted += 1;
    console.error(`❌ src/lib/collective-kinds/${file} differs from OrangeCat's ${file}`);
  }
}
if (drifted) {
  console.error(
    `\n${drifted} file(s) drifted. Copy packages/collective-kinds/src/* from bitbaum/orangecat main, keep the VENDORED header, commit.`,
  );
  process.exit(1);
}
console.log(`✅ collective-kinds: ${FILES.length} files identical to bitbaum/orangecat main`);
