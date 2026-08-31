import { DecisionCategory, Electorate, VoteThreshold } from "@prisma/client";
import type { MethodId } from "@/lib/domain/methods/types";
import { CATEGORY_ELECTORATE } from "./governance";

/**
 * SSOT for how different kinds of organization decide things.
 *
 * A profile answers, for each category of decision: by what method, at what
 * threshold, with what quorum. It deliberately does NOT answer "who may vote" —
 * see HUMANS_ONLY below.
 *
 * One organization, one profile. An organization changing its profile is a
 * GOVERNANCE_RULES decision like any other: humans-only, supermajority. That is
 * why profiles live in code and ship through review rather than sitting in a
 * settings table where one admin could quietly restructure the constitution
 * between two votes.
 */

/** What a profile may decide for one category. */
export interface CategoryRule {
  method: MethodId;
  threshold: VoteThreshold;
  /** Percent of eligible weight that must cast a ballot for the result to bind. */
  quorumPercent: number;
}

export type GovernanceProfileId = "TOWN" | "ASSOCIATION" | "COOPERATIVE" | "COLLECTIVE" | "COMPANY";

export interface GovernanceProfile {
  id: GovernanceProfileId;
  label: string;
  /** Who this is for, in one sentence a non-lawyer can act on. */
  suitedTo: string;
  rules: Record<DecisionCategory, CategoryRule>;
}

const decision = (
  method: MethodId,
  threshold: VoteThreshold,
  quorumPercent: number,
): CategoryRule => ({ method, threshold, quorumPercent });

const SIMPLE = VoteThreshold.SIMPLE_MAJORITY;
const SUPER = VoteThreshold.SUPERMAJORITY;

export const GOVERNANCE_PROFILES: Record<GovernanceProfileId, GovernanceProfile> = {
  /**
   * The profile Solon shipped with — preserved exactly, so every organization
   * created before profiles existed keeps deciding the way it always has.
   */
  TOWN: {
    id: "TOWN",
    label: "Town",
    suitedTo: "A civic body deciding by majority, with the bar raised for its own rules.",
    rules: {
      ALLOCATION_POLICY: decision("single_choice", SIMPLE, 50),
      TREASURY_SPEND: decision("single_choice", SIMPLE, 50),
      OPERATIONS: decision("single_choice", SIMPLE, 30),
      AID_DISBURSEMENT: decision("single_choice", SIMPLE, 50),
      MEMBERSHIP: decision("single_choice", SUPER, 50),
      SAFETY: decision("single_choice", SUPER, 50),
      GOVERNANCE_RULES: decision("single_choice", SUPER, 60),
    },
  },

  /**
   * Swiss Verein (Art. 60 ZGB) and comparable member associations: day-to-day
   * work runs on consent so a single member can stop something harmful, while
   * the statutes and the member roll need a supermajority of the assembly.
   */
  ASSOCIATION: {
    id: "ASSOCIATION",
    label: "Association (Verein)",
    suitedTo:
      "A member association where the assembly is sovereign and the statutes are hard to change.",
    rules: {
      ALLOCATION_POLICY: decision("dot", SIMPLE, 40),
      TREASURY_SPEND: decision("consent", SIMPLE, 40),
      OPERATIONS: decision("consent", SIMPLE, 25),
      AID_DISBURSEMENT: decision("consent", SIMPLE, 40),
      MEMBERSHIP: decision("single_choice", SUPER, 50),
      SAFETY: decision("single_choice", SUPER, 50),
      GOVERNANCE_RULES: decision("single_choice", SUPER, 60),
    },
  },

  /**
   * Cooperative: one member one vote, and a high floor for participation —
   * a co-op that decides with a tenth of its members in the room is a board
   * wearing a co-op's name.
   */
  COOPERATIVE: {
    id: "COOPERATIVE",
    label: "Cooperative",
    suitedTo: "A co-op where every member counts equally and turnout has to be real.",
    rules: {
      ALLOCATION_POLICY: decision("dot", SIMPLE, 50),
      TREASURY_SPEND: decision("single_choice", SIMPLE, 50),
      OPERATIONS: decision("approval", SIMPLE, 40),
      AID_DISBURSEMENT: decision("single_choice", SIMPLE, 50),
      MEMBERSHIP: decision("single_choice", SUPER, 60),
      SAFETY: decision("single_choice", SUPER, 60),
      GOVERNANCE_RULES: decision("single_choice", SUPER, 66),
    },
  },

  /**
   * Sociocratic collective: consent throughout. Nothing passes while anyone
   * can articulate harm, which is slow by design and the reason it holds.
   */
  COLLECTIVE: {
    id: "COLLECTIVE",
    label: "Collective",
    suitedTo: "A sociocratic group that moves on consent rather than counting heads.",
    rules: {
      ALLOCATION_POLICY: decision("dot", SIMPLE, 40),
      TREASURY_SPEND: decision("consent", SIMPLE, 40),
      OPERATIONS: decision("consent", SIMPLE, 25),
      AID_DISBURSEMENT: decision("consent", SIMPLE, 40),
      MEMBERSHIP: decision("consent", SIMPLE, 50),
      SAFETY: decision("consent", SIMPLE, 50),
      GOVERNANCE_RULES: decision("consent", SIMPLE, 60),
    },
  },

  /**
   * Company or foundation board: weighted votes, small quorum, fast operations.
   * Members carry different voting weight; the method layer is unchanged, the
   * weights do the work.
   */
  COMPANY: {
    id: "COMPANY",
    label: "Company board",
    suitedTo: "A board with weighted shareholdings that needs to decide quickly.",
    rules: {
      ALLOCATION_POLICY: decision("score", SIMPLE, 30),
      TREASURY_SPEND: decision("single_choice", SIMPLE, 30),
      OPERATIONS: decision("single_choice", SIMPLE, 20),
      AID_DISBURSEMENT: decision("single_choice", SIMPLE, 30),
      MEMBERSHIP: decision("single_choice", SUPER, 50),
      SAFETY: decision("single_choice", SUPER, 50),
      GOVERNANCE_RULES: decision("single_choice", SUPER, 66),
    },
  },
};

export const DEFAULT_PROFILE: GovernanceProfileId = "TOWN";

export function profileFor(id: string | null | undefined): GovernanceProfile {
  const key = (id ?? DEFAULT_PROFILE) as GovernanceProfileId;
  return GOVERNANCE_PROFILES[key] ?? GOVERNANCE_PROFILES[DEFAULT_PROFILE];
}

/**
 * Who may vote is NOT a profile's decision.
 *
 * A profile picks methods and thresholds. It cannot widen an electorate,
 * because the four HUMANS_ONLY categories — aid to people, membership, safety,
 * and the governance rules themselves — are the product's red lines. Reading
 * eligibility from `CATEGORY_ELECTORATE` here rather than from the profile is
 * what makes "an organization votes to let its agents vote on their own
 * suffrage" unexpressible rather than merely discouraged.
 */
export function electorateFor(category: DecisionCategory): Electorate {
  return CATEGORY_ELECTORATE[category];
}

export function ruleFor(
  profileId: string | null | undefined,
  category: DecisionCategory,
): CategoryRule {
  return profileFor(profileId).rules[category];
}
