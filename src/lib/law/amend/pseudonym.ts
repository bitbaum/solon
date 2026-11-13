/**
 * How a signed-in person is named in the public record of proposals: by a
 * pseudonym of their own for each proposal, never by their account.
 *
 * The record is public and kept for good, and where proposing is risky a
 * stable name across every proposal a person files or supports is a gift to
 * whoever later learns, by compulsion or breach, which account is whose
 * (design: docs/design/2026-11-from-comparison-to-change.md §5). So the name
 * is `anon:` and a keyed hash of the account and the proposal: the same
 * person on the same proposal is always the same name (one standing each, a
 * withdrawal finds its support, the author can revise), and two proposals
 * cannot be linked by anyone who does not hold the key.
 *
 * The key is `SOLON_PSEUDONYM_SECRET`, else the session secret. It must
 * never change: a new key gives everyone new names, and a person could then
 * support a revision a second time. Rows written before this carry
 * `actor:<id>`; they are recognised as the same person, never rewritten
 * (the chain of events keeps them as they were).
 */
import { createHmac } from "node:crypto";
import type { Actor } from "@/lib/domain/proof";

const DEV_KEY = "solon-development-pseudonym-key-not-for-production";

function key(): string {
  const configured =
    process.env.SOLON_PSEUDONYM_SECRET || process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SOLON_PSEUDONYM_SECRET (or AUTH_SECRET) must be set to name people in proposals",
    );
  }
  return DEV_KEY;
}

/** A person's name on one proposal: the same for them on it, unlinkable to their name on any other. */
export function pseudonym(actorId: string, amendmentId: string): string {
  const mac = createHmac("sha256", key())
    .update(`solon/amendment-pseudonym/v1\0${amendmentId}\0${actorId}`)
    .digest("hex");
  return `anon:${mac.slice(0, 32)}`;
}

/**
 * How this person is named on this proposal: the name to write first, then
 * every name an earlier row may carry for them. A key signs as its address,
 * which is public and theirs to choose afresh for each proposal.
 */
export function namesOn(actor: Actor, amendmentId: string): [string, ...string[]] {
  return actor.via === "key"
    ? [`btc:${actor.address}`]
    : [pseudonym(actor.actorId, amendmentId), `actor:${actor.actorId}`];
}
