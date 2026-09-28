import { z } from "zod";
import { DecisionCategory } from "@/lib/db/enums";
import { GOVERNANCE_PROFILE_IDS } from "@/lib/config/governance-profiles";

/**
 * What a decision DOES when it passes, beyond being recorded.
 *
 * Two effects, each tied to the one category that may carry it:
 *
 * - `mandate` (MEMBERSHIP): grant or end a member's mandate — electing a
 *   delegate, recalling one, a founder appointing a co-decider. Who holds a
 *   mandate is a question about the roster, so it is decided like one.
 * - `profile` (GOVERNANCE_RULES): switch the organization's governance
 *   profile. Changing who decides is changing the rules.
 *
 * Pure — no database — so the API can refuse a mispaired effect before it is
 * signed, and the tests can pin the pairing.
 */
export const effectSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("mandate"),
    memberId: z.string().min(1).max(64),
    grant: z.boolean(),
    /** ISO end of term. Omitted: the profile's default term, if it has one. */
    until: z.iso.datetime().optional(),
  }),
  z.object({
    kind: z.literal("profile"),
    profile: z.enum(GOVERNANCE_PROFILE_IDS),
  }),
]);

export type Effect = z.infer<typeof effectSchema>;

export const EFFECT_CATEGORY: Record<Effect["kind"], DecisionCategory> = {
  mandate: DecisionCategory.MEMBERSHIP,
  profile: DecisionCategory.GOVERNANCE_RULES,
};

/** Parse a stored or submitted effect; null when absent. Throws on nothing. */
export function parseEffect(
  raw: unknown,
): { ok: true; effect: Effect | null } | { ok: false; error: string } {
  if (raw == null) return { ok: true, effect: null };
  const parsed = effectSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  return { ok: true, effect: parsed.data };
}

/** Why this effect cannot ride on a proposal of this category, or null. */
export function effectPairingProblem(effect: Effect, category: DecisionCategory): string | null {
  const required = EFFECT_CATEGORY[effect.kind];
  if (category === required) return null;
  return `a ${effect.kind} change is a ${required} decision, not ${category}`;
}
