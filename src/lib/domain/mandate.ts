import { DecisionBody } from "@/lib/db/enums";

/**
 * Mandates — pure rules, no database, so the org page, the session opener and
 * the tests all read one definition of "who holds a mandate right now".
 */

export interface MandateSeat {
  holdsMandate: boolean;
  mandateUntil: Date | null;
}

/** A mandate decides only while it is held and its term has not run out. */
export function isMandateLive(seat: MandateSeat, now: Date): boolean {
  return seat.holdsMandate && (seat.mandateUntil === null || seat.mandateUntil > now);
}

/**
 * Who actually decides a session, given the profile's rule and whether anyone
 * holds a live mandate.
 *
 * A category given to MANDATE with nobody holding one goes to the members. The
 * alternative — refusing to open the session — would let a lapsed term or a
 * resignation freeze the organization, including the vote that would elect
 * someone new. Decisions come back to the members; they never disappear.
 */
export function resolveDecisionBody(
  rule: DecisionBody,
  liveMandateHolders: number,
): { decidedBy: DecisionBody; fellBack: boolean } {
  if (rule === DecisionBody.MANDATE && liveMandateHolders === 0) {
    return { decidedBy: DecisionBody.MEMBERS, fellBack: true };
  }
  return { decidedBy: rule, fellBack: false };
}

/** When a mandate granted now should end, from an explicit end or the profile's term. */
export function mandateEnd(
  explicitUntil: Date | null | undefined,
  termDays: number | null,
  now: Date,
): Date | null {
  if (explicitUntil) return explicitUntil;
  if (termDays === null) return null;
  return new Date(now.getTime() + termDays * 24 * 60 * 60 * 1000);
}
