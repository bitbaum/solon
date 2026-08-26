/**
 * SSOT for the contribution-allocation policy key and the split that governs
 * before an organization has voted on one of its own.
 *
 * The premise is subsidiarity taken literally: a person's contribution is not
 * an undifferentiated payment to "the government", it is a payment to several
 * governments at once, and which of them gets what share is a question the
 * person paying has standing to answer. Solon splits that question in two.
 *
 * The **bounds** belong to the organization: which tiers exist, what each may
 * be raised to and floored at, and what applies to someone who has not spoken.
 * They are policy content under `CONTRIBUTION_POLICY_KEY`, so they move only
 * through an approved ALLOCATION_POLICY session and every version is on the
 * record with the vote that produced it.
 *
 * The **split inside those bounds** belongs to the person, and no vote reaches
 * it — see `src/lib/domain/allocation`.
 *
 * The default below is deliberately the widest legal policy: three tiers,
 * every floor at zero, every ceiling at 100. An organization that has never
 * voted on this constrains nobody, because a floor nobody enacted is a floor
 * nobody consented to. Narrowing it is a decision the members have to take.
 */
import type { ContributionPolicy } from "@/lib/domain/allocation/policy";

/** Policy key the contribution bounds live under, in `policies`. */
export const CONTRIBUTION_POLICY_KEY = "contribution_allocation";

/**
 * The tiers in force until an organization votes otherwise: the three levels
 * nearly every federal system has, under the names a citizen would use for
 * them. `label` is what a person reads while deciding; a policy version may
 * rename them (Gemeinde / Kanton / Bund) without any code change, which is the
 * point of holding them in policy content rather than in an enum.
 */
export const DEFAULT_CONTRIBUTION_POLICY: ContributionPolicy = {
  tiers: [
    {
      key: "local",
      label: "Local",
      description: "The municipality, commune or town you live in.",
      minPercent: 0,
      maxPercent: 100,
    },
    {
      key: "state",
      label: "State",
      description: "The state, canton, province or region above it.",
      minPercent: 0,
      maxPercent: 100,
    },
    {
      key: "federal",
      label: "Federal",
      description: "The federal or national government.",
      minPercent: 0,
      maxPercent: 100,
    },
  ],
  // Even thirds, with the odd point to the tier closest to the person paying.
  // Something has to apply to a member who has not declared, and this is a
  // stated default rather than a silent one: it is published, it is what the
  // aggregate counts them at, and one signature replaces it.
  fallback: { local: 34, state: 33, federal: 33 },
};
