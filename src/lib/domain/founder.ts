/**
 * Who may take a founding seat that was never claimed.
 *
 * An organization founded through /orgs/new gets its founder's seat in the
 * same transaction, so the question never arises. An organization that was
 * SEEDED — organization #1, written by a migration with only its two agents —
 * has no human seat, and until 2026-09-29 its founding seat went to the first
 * signed-in person to press the button. That was a bootstrap shortcut, and with
 * sign-up now one emailed code away it was a race anyone could win.
 *
 * The rule now: a seeded organization's founding seat belongs to the identity
 * the deployment names — SOLON_FOUNDER_ACTOR_ID, an OrangeCat actor id set on
 * the box, the same way the deployment names its OAuth client. Unset, the seat
 * is closed to everyone, and /join says so and says what would open it. This
 * module is pure so the API and the page cannot disagree about who qualifies.
 */

export interface FounderRule {
  /** The actor who may claim a seeded organization's founding seat, if any is named. */
  founderActorId: string | null;
}

export function founderRule(env: Record<string, string | undefined> = process.env): FounderRule {
  const raw = env.SOLON_FOUNDER_ACTOR_ID?.trim();
  return { founderActorId: raw ? raw : null };
}

export type GenesisVerdict =
  /** This identity may claim the seat. */
  | { allowed: true }
  /** Nobody may: the deployment has not named a founder. */
  | { allowed: false; reason: "unnamed" }
  /** Someone else is the named founder. */
  | { allowed: false; reason: "not_founder" };

/** May `actorId` take the founding seat of a seeded organization? */
export function genesisVerdict(actorId: string, rule: FounderRule): GenesisVerdict {
  if (!rule.founderActorId) return { allowed: false, reason: "unnamed" };
  if (rule.founderActorId !== actorId) return { allowed: false, reason: "not_founder" };
  return { allowed: true };
}

/** The sentence /join shows for a refused verdict — the way forward, never a wall. */
export function genesisRefusalCopy(verdict: Exclude<GenesisVerdict, { allowed: true }>): string {
  return verdict.reason === "unnamed"
    ? "This organization was set up before founding had a form, and no founder has been named for it yet. Until the deployment names one (SOLON_FOUNDER_ACTOR_ID), nobody can take the seat. Everything on the record is open to you meanwhile."
    : "This organization was set up before founding had a form, and its founding seat is reserved for the identity the deployment named as its founder. Once that person is seated, admission is by a membership vote. Everything on the record is open to you meanwhile.";
}
