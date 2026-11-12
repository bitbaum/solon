/**
 * Whether a retrieval has already been applied: its bytes are those of the
 * source's last applied retrieval from the same address AND it was read by
 * the same importer. "The same importer" is the adapter's key and version and
 * a hash of the source's options and packs: a new metric, a changed divisor or
 * a fixed mapping reads the same bytes again, or the fix would reach
 * production only the next time the publisher changed a figure.
 */
import { createHash } from "node:crypto";

export interface LastApplied {
  sha256: string;
  /** As `importerVersion` writes it. */
  importerVersion: string;
}

export function alreadyApplied(
  last: LastApplied | null,
  sha256: string,
  importerVersion: string,
): boolean {
  return last !== null && last.sha256 === sha256 && last.importerVersion === importerVersion;
}

/** JSON with sorted keys, so equal options hash equal whatever order config writes them in. */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );

/** `<adapter>@<version>#<12 hex of the options and packs>`: what read a retrieval, recorded on its `sources` row. */
export function importerVersion(
  adapter: { key: string; version: string },
  source: { options?: unknown; packs: readonly string[] },
): string {
  const hash = createHash("sha256")
    .update(canonical({ options: source.options ?? null, packs: source.packs }))
    .digest("hex")
    .slice(0, 12);
  return `${adapter.key}@${adapter.version}#${hash}`;
}

/**
 * The version recorded on a retrieval whose figures were not all applied (a batch of figures
 * alone leaves out places not held here yet). It never equals an importer's version, so the next
 * run reads the same bytes again instead of skipping them as applied, and the figures arrive
 * once their place does.
 */
export const partialVersion = (version: string): string => `${version}+partial`;
