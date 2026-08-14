import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

/**
 * Canonical JSON: recursively key-sorted, no whitespace, `undefined` object
 * values dropped. This is the cross-system contract behind `contentHash` —
 * OrangeCat re-hashes proposed policy content with the same rules to check a
 * decision document, so any change here is a breaking protocol change
 * (guarded by a golden-hash unit test).
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

/** sha256 hex of a UTF-8 string. */
export function sha256Hex(text: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(text)));
}

/** The contentHash voters sign over: sha256 of the canonical JSON. */
export function contentHashOf(content: unknown): string {
  return sha256Hex(canonicalJson(content));
}
