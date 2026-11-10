/**
 * Whether a file kept in the repository has already been applied: its bytes are those of the source's last
 * retrieval AND the adapter that read it is the version that read that retrieval. A file whose bytes did not
 * change is still read again when its adapter did (a new option, a fixed mapping), or the fix would reach
 * production only the next time somebody edited the data.
 */
export interface LastApplied {
  sha256: string;
  /** `${adapter.key}@${adapter.version}`, as the importer records it. */
  importerVersion: string;
}

export function alreadyApplied(
  last: LastApplied | null,
  sha256: string,
  importerVersion: string,
): boolean {
  return last !== null && last.sha256 === sha256 && last.importerVersion === importerVersion;
}
