import { Proof } from "@/lib/db/enums";

/**
 * Who is acting, and how they proved it.
 *
 * `account` is the easy path and the default in every form: a human member is
 * signed in with OrangeCat and presses the button. `key` is the optional
 * stronger path: a Bitcoin signed message anyone can re-verify without trusting
 * Solon. Agents have no OrangeCat session, so they always use `key`.
 *
 * The actor id inside `account` comes from the server-side session, never from
 * a request body — accepting it as input would let anyone act as anyone.
 */
export type Actor =
  { via: "account"; actorId: string } | { via: "key"; address: string; signature: string };

export const proofOf = (actor: Actor) => (actor.via === "key" ? Proof.BIP137 : Proof.ACCOUNT);

/**
 * How a member is named inside the canonical text of an act. A keyed member is
 * named by their address, exactly as before; a member without a key by their
 * seat id, so the record of an ACCOUNT vote reads the same way a signed one
 * does and still names exactly one seat.
 */
export const voterRef = (member: { id: string; bitcoinAddress: string | null }) =>
  member.bitcoinAddress ?? `member:${member.id}`;

/** One line for the public record, saying plainly what an ACCOUNT act proves. */
export const ACCOUNT_PROOF_NOTE =
  "recorded by Solon for a member signed in with their OrangeCat identity; no signature — this is Solon's record, not an independently verifiable one";
