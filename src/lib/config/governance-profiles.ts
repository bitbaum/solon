import {
  DEFAULT_GOVERNANCE_PROFILE,
  DECISION_CATEGORIES,
  DecisionBody,
  DecisionCategory,
  Electorate,
  GOVERNANCE_PROFILE_IDS,
  VoteThreshold,
  type CollectiveKindId,
  type GovernanceProfileId,
} from "@/lib/db/enums";
import type { MethodId } from "@/lib/domain/methods/types";
import { CATEGORY_ELECTORATE, CATEGORY_QUORUM_PERCENT, CATEGORY_THRESHOLD } from "./governance";

/**
 * SSOT for how different kinds of organization decide things.
 *
 * A profile answers, for each category of decision: WHO within the electorate
 * decides it (every member, or the members holding a mandate), by what method,
 * at what threshold, with what quorum. It deliberately does NOT answer who is
 * in the electorate at all — see HUMANS_ONLY below.
 *
 * The WHO axis is what lets Solon hold every structure people actually run,
 * named for what it does rather than borrowed from political history:
 *
 * - "One person decides": the founder holds the only mandate and every
 *   category goes to it. Legitimate and common — a sole proprietor, a founder
 *   building in the open — provided it is stated to everyone who joins, which
 *   the organization page does. Exit is the counterweight: the code and the
 *   tools are open, so anyone who wants a different structure can found one.
 * - "Everyone decides": every member votes on everything (TOWN).
 * - "Elected delegates decide": members grant mandates for a term, delegates
 *   decide the day-to-day, and the members keep the roster, safety and the
 *   rules. When a term lapses, those categories come back to the members
 *   until they elect someone again — the organization never stalls.
 *
 * One organization, one profile. Changing it is a GOVERNANCE_RULES decision
 * taken under the profile the organization already has (a proposal carrying a
 * `profile` effect — src/lib/domain/effects.ts). That is why profiles live in
 * code and ship through review rather than sitting in a settings table where
 * one admin could quietly restructure the constitution between two votes.
 */

/** What a profile may decide for one category. */
export interface CategoryRule {
  /** Every eligible member, or only the eligible members holding a live mandate. */
  decidedBy: DecisionBody;
  method: MethodId;
  threshold: VoteThreshold;
  /** Percent of eligible weight that must cast a ballot for the result to bind. */
  quorumPercent: number;
}

export type { GovernanceProfileId };
export { GOVERNANCE_PROFILE_IDS };

export interface GovernanceProfile {
  id: GovernanceProfileId;
  label: string;
  /** Who this is for, in one sentence a non-lawyer can act on. */
  suitedTo: string;
  /**
   * Who holds the decisions, in one plain sentence. This is what the
   * organization page shows a prospective member before they join, so it
   * must be true of the rules below and never flattering.
   */
  whoDecides: string;
  /**
   * How long a mandate lasts when a decision grants one without naming an end.
   * Null: mandates under this profile carry no term.
   */
  mandateTermDays: number | null;
  rules: Record<DecisionCategory, CategoryRule>;
}

const decision = (
  method: MethodId,
  threshold: VoteThreshold,
  quorumPercent: number,
  decidedBy: DecisionBody = DecisionBody.MEMBERS,
): CategoryRule => ({ decidedBy, method, threshold, quorumPercent });

const SIMPLE = VoteThreshold.SIMPLE_MAJORITY;
const SUPER = VoteThreshold.SUPERMAJORITY;
const MANDATE = DecisionBody.MANDATE;

const EVERYONE = "Every member votes on every decision.";

export const GOVERNANCE_PROFILES: Record<GovernanceProfileId, GovernanceProfile> = {
  /**
   * The founder holds the only mandate and decides every category — including
   * who else may hold one and whether to change this profile. The thresholds
   * are still set as if several people held mandates, so a founder who
   * appoints co-deciders gets real rules rather than a blank cheque.
   */
  SOLE: {
    id: "SOLE",
    label: "One person decides",
    suitedTo:
      "A founder or owner who keeps every decision, and says so plainly to everyone who joins.",
    whoDecides:
      "The mandate holder — at founding, the founder alone — decides everything, including these rules. Members can propose; they do not vote.",
    mandateTermDays: null,
    rules: {
      ALLOCATION_POLICY: decision("single_choice", SIMPLE, 50, MANDATE),
      TREASURY_SPEND: decision("single_choice", SIMPLE, 50, MANDATE),
      OPERATIONS: decision("single_choice", SIMPLE, 50, MANDATE),
      AID_DISBURSEMENT: decision("single_choice", SIMPLE, 50, MANDATE),
      MEMBERSHIP: decision("single_choice", SUPER, 50, MANDATE),
      SAFETY: decision("single_choice", SUPER, 50, MANDATE),
      GOVERNANCE_RULES: decision("single_choice", SUPER, 50, MANDATE),
    },
  },

  /**
   * Members elect delegates for a term. Delegates decide the running of the
   * organization; the members keep the three questions that define it — who
   * belongs, safety, and the rules — which is also how they elect and recall.
   */
  DELEGATED: {
    id: "DELEGATED",
    label: "Elected delegates decide",
    suitedTo:
      "Members who want someone to run things day to day, and to answer for it at the next election.",
    whoDecides:
      "Delegates the members elected for a term decide money and operations. The members decide membership, safety and the rules, which is how they elect and recall. While no delegate holds a live mandate, the members decide everything.",
    mandateTermDays: 365,
    rules: {
      ALLOCATION_POLICY: decision("single_choice", SIMPLE, 50, MANDATE),
      TREASURY_SPEND: decision("single_choice", SIMPLE, 50, MANDATE),
      OPERATIONS: decision("single_choice", SIMPLE, 50, MANDATE),
      AID_DISBURSEMENT: decision("single_choice", SIMPLE, 50, MANDATE),
      MEMBERSHIP: decision("single_choice", SUPER, 40),
      SAFETY: decision("single_choice", SUPER, 50),
      GOVERNANCE_RULES: decision("single_choice", SUPER, 60),
    },
  },

  /**
   * The profile Solon shipped with — preserved exactly, so every organization
   * created before profiles existed keeps deciding the way it always has.
   *
   * Its thresholds and quorums ARE the flat tables in ./governance.ts, read
   * from them rather than typed again: those tables still drive the rule
   * matrix, the thresholds page and the proposal form, and a second copy here
   * had already drifted once in spirit (identical today, guaranteed by nothing).
   */
  TOWN: {
    id: "TOWN",
    label: "Everyone decides",
    suitedTo:
      "A town meeting, a network, any group where every member votes directly, with the bar raised for its own rules.",
    whoDecides: EVERYONE,
    mandateTermDays: null,
    rules: Object.fromEntries(
      DECISION_CATEGORIES.map((c) => [
        c,
        decision("single_choice", CATEGORY_THRESHOLD[c], CATEGORY_QUORUM_PERCENT[c]),
      ]),
    ) as Record<DecisionCategory, CategoryRule>,
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
    whoDecides: EVERYONE,
    mandateTermDays: null,
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
    whoDecides: EVERYONE,
    mandateTermDays: null,
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
    whoDecides: EVERYONE,
    mandateTermDays: null,
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
    whoDecides: EVERYONE,
    mandateTermDays: null,
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

export const DEFAULT_PROFILE: GovernanceProfileId = DEFAULT_GOVERNANCE_PROFILE;

/**
 * The profile a kind of body usually decides by — the founding form's default
 * once a kind is picked, never a lock. Keyed by the shared kind list, so a kind
 * added there without a row here fails the build. This is Solon's own table:
 * the kinds package says what a body IS and deliberately nothing about how it
 * decides.
 */
export const KIND_DEFAULT_PROFILE: Record<CollectiveKindId, GovernanceProfileId> = {
  circle: "COLLECTIVE",
  family: "COLLECTIVE",
  association: "ASSOCIATION",
  cooperative: "COOPERATIVE",
  collective: "COLLECTIVE",
  company: "COMPANY",
  guild: "ASSOCIATION",
  dao: "TOWN",
  town: "TOWN",
  network_state: "DELEGATED",
  local_fund: "TOWN",
};

export function defaultProfileForKind(kind: CollectiveKindId): GovernanceProfileId {
  return KIND_DEFAULT_PROFILE[kind];
}

/** The profiles in the order they are declared — the one order every list uses. */
export const GOVERNANCE_PROFILE_LIST: readonly GovernanceProfile[] = GOVERNANCE_PROFILE_IDS.map(
  (id) => GOVERNANCE_PROFILES[id],
);

export function isGovernanceProfileId(value: unknown): value is GovernanceProfileId {
  return typeof value === "string" && (GOVERNANCE_PROFILE_IDS as readonly string[]).includes(value);
}

/** Whether any category under this profile is decided by mandate holders. */
export function usesMandates(profile: GovernanceProfile): boolean {
  return Object.values(profile.rules).some((r) => r.decidedBy === DecisionBody.MANDATE);
}

export function profileFor(id: string | null | undefined): GovernanceProfile {
  const key = (id ?? DEFAULT_PROFILE) as GovernanceProfileId;
  return GOVERNANCE_PROFILES[key] ?? GOVERNANCE_PROFILES[DEFAULT_PROFILE];
}

/**
 * Who may vote is NOT a profile's decision.
 *
 * A profile picks methods, thresholds, and whether the mandate holders or all
 * members decide — a narrowing inside the electorate. It cannot widen one,
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
