/**
 * What a supporter or an author puts their name to, and the chain that keeps
 * the record whole (design: docs/design/2026-11-amending-the-law.md).
 *
 * The content hash uses the same canonical JSON as proposals
 * (src/lib/domain/canonical.ts), so anyone who can check a proposal's hash can
 * check an amendment's.
 */
import { canonicalJson, contentHashOf, sha256Hex } from "@/lib/domain/canonical";
import type { Change } from "./changes";

/** Everything a revision says, and nothing Solon adds to it. */
export interface RevisionContent {
  authority: string;
  act: string;
  baseVersion: string;
  lang: string;
  title: string;
  rationale: string;
  changes: readonly Change[];
}

/** sha256 of the revision's canonical JSON: what support binds to. */
export const revisionHash = (content: RevisionContent): string => contentHashOf(content);

/**
 * The message an author signs to file a revision, or a supporter to support
 * one. Its first line is used by no other Solon message, so a signature can
 * never be replayed as a vote, a proposal or a membership.
 */
export function amendmentMessage(params: {
  act: "file" | "support" | "withdraw";
  amendmentId: string;
  revision: number;
  contentHash: string;
  address: string;
}): string {
  return [
    "Solon amendment",
    `act:${params.act}`,
    `amendment:${params.amendmentId}`,
    `revision:${params.revision}`,
    `content:${params.contentHash}`,
    `signer:${params.address}`,
  ].join("\n");
}

/** The hash a chain starts from: no event before the first. */
export const GENESIS = "0".repeat(64);

/** One event as it is chained. */
export interface ChainedEvent {
  seq: number;
  prevHash: string;
  type: string;
  amendmentId: string;
  payload: unknown;
}

/** The hash of one event: its predecessor's hash, then the event itself, canonically. */
export const eventHash = (event: ChainedEvent): string =>
  sha256Hex(
    `${event.prevHash}\n${canonicalJson({
      amendmentId: event.amendmentId,
      payload: event.payload,
      seq: event.seq,
      type: event.type,
    })}`,
  );

/**
 * Check a run of events as anyone could: sequence numbers without gaps, each
 * pointing at the hash of the one before, each hash recomputed. Give it the
 * hash before the run (GENESIS from the start). Returns the first break.
 */
export function verifyChain(
  events: readonly (ChainedEvent & { hash: string })[],
  before: { seq: number; hash: string } = { seq: 0, hash: GENESIS },
): { ok: true; head: string } | { ok: false; at: number; reason: string } {
  let prev = before;
  for (const event of events) {
    if (event.seq !== prev.seq + 1) {
      return { ok: false, at: event.seq, reason: `expected event ${prev.seq + 1}` };
    }
    if (event.prevHash !== prev.hash) {
      return { ok: false, at: event.seq, reason: "does not point at the event before it" };
    }
    if (eventHash(event) !== event.hash) {
      return { ok: false, at: event.seq, reason: "its hash does not match its content" };
    }
    prev = { seq: event.seq, hash: event.hash };
  }
  return { ok: true, head: prev.hash };
}
