#!/usr/bin/env node
/**
 * Packages whose SSOT is bitbaum/orangecat packages/<name>. Solon carries a
 * byte-for-byte copy in src/lib/<name> until each package has a repository or
 * an npm release of its own. A copy drifts; this gate makes the copy safe: it
 * fetches each package's source from OrangeCat's main and fails when any file
 * here differs from it (the four-line VENDORED header aside).
 *
 * Runs in CI (network). Locally: `pnpm run check:vendored-drift`.
 * To update: copy the files from OrangeCat, keep the header, commit.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PACKAGES = [
  { name: "collective-kinds", files: ["kinds.ts", "place.ts", "legal.ts", "index.ts"] },
  { name: "tax-model", files: ["model.ts", "evaluate.ts", "index.ts"] },
];
const SOURCE =
  process.env.VENDORED_SOURCE ??
  "https://raw.githubusercontent.com/bitbaum/orangecat/main/packages";
const HEADER_LINES = 4;

const stripHeader = (text) => {
  const lines = text.split("\n");
  return lines[0]?.startsWith("// VENDORED") ? lines.slice(HEADER_LINES).join("\n") : text;
};

let drifted = 0;
for (const { name, files } of PACKAGES) {
  for (const file of files) {
    const url = `${SOURCE}/${name}/src/${file}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`❌ could not fetch ${url}: ${res.status}`);
      process.exit(2);
    }
    const upstream = (await res.text()).trim();
    const local = stripHeader(
      readFileSync(join(process.cwd(), "src", "lib", name, file), "utf8"),
    ).trim();
    if (upstream !== local) {
      drifted += 1;
      console.error(
        `❌ src/lib/${name}/${file} differs from OrangeCat's packages/${name}/src/${file}`,
      );
    }
  }
}
if (drifted) {
  console.error(
    `\n${drifted} file(s) drifted. Copy packages/<name>/src/* from bitbaum/orangecat main, keep the VENDORED header, commit.`,
  );
  process.exit(1);
}
for (const { name, files } of PACKAGES) {
  console.log(`✅ ${name}: ${files.length} files identical to bitbaum/orangecat main`);
}
