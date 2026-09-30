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

/**
 * What /join tells a visitor who may not take the seat: in plain words, with
 * the way forward. Never the name of a setting — the visitor cannot change it,
 * and the operator is told through /api/health (see `foundingGaps`).
 */
export function genesisRefusalCopy(
  verdict: Exclude<GenesisVerdict, { allowed: true }>,
  orgName: string,
): string {
  return verdict.reason === "unnamed"
    ? `${orgName} doesn't have its first member yet, so nobody can join it for now. Once its founder has joined, you can ask to become a member and the members decide. You can already read everything ${orgName} has decided.`
    : `${orgName} is waiting for its founder to join first. After that, you can ask to become a member and the members decide. You can already read everything ${orgName} has decided.`;
}

/** An organization nobody can join: no member yet, and no founder named to be the first. */
export interface FoundingGap {
  slug: string;
  problem: string;
}

/**
 * The operator's side of the same rule. A seeded organization with no member
 * and no named founder is a dead end for every visitor, so it is reported
 * instead of waiting for someone to hit it.
 */
export function foundingGaps(
  unfounded: readonly { slug: string }[],
  rule: FounderRule,
): FoundingGap[] {
  if (rule.founderActorId) return [];
  return unfounded.map(({ slug }) => ({
    slug,
    problem: `"${slug}" has no member and no founder is named (SOLON_FOUNDER_ACTOR_ID), so nobody can join it.`,
  }));
}
