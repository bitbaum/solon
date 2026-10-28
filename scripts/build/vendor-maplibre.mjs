/**
 * Serves MapLibre GL's own files from public/vendor/maplibre-gl/<version>/.
 * The library starts its worker from a file beside itself, found at runtime
 * from its own URL, which no bundler follows; loaded from one folder, the page
 * and the worker also share one copy of the code they both import. The folder
 * is named by version, so it can be cached forever. Run before dev and build.
 */
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const root = dirname(require.resolve("maplibre-gl/package.json"));
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const target = join(process.cwd(), "public", "vendor", "maplibre-gl", version);
mkdirSync(target, { recursive: true });
for (const file of ["maplibre-gl.mjs", "maplibre-gl-shared.mjs", "maplibre-gl-worker.mjs"]) {
  copyFileSync(join(root, "dist", file), join(target, file));
}
copyFileSync(join(root, "LICENSE.txt"), join(target, "LICENSE.txt"));
