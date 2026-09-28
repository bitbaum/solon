/**
 * Governance enums — the domain vocabulary, dependency-free.
 *
 * These const objects mirror the Postgres enum types one-to-one (the pgEnum
 * definitions in ./schema.ts are built from these tuples, so the two cannot
 * drift). They live apart from the schema so that client components and the
 * voter's browser can use the vocabulary without pulling a database layer
 * into the bundle — the same reason the old Prisma-enum bridge existed.
 *
 * Value semantics are identical to the Prisma client's generated enums:
 * `MemberType.HUMAN === "HUMAN"`, and the type is the union of the values.
 */

function enumLike<const T extends readonly [string, ...string[]]>(values: T) {
  return Object.fromEntries(values.map((v) => [v, v])) as { [K in T[number]]: K };
}

/**
 * How an organization decides — the ids of the governance profiles in
 * src/lib/config/governance-profiles.ts. The rules live there; the ids live
 * here so the schema can CHECK the column and the browser can list the choice
 * without pulling the rule tables in. Adding a profile = adding an id here and
 * its rules there; a test fails if either half is missing.
 */
export const GOVERNANCE_PROFILE_IDS = [
  // The three structures first — who decides — then the house styles of
  // "everyone decides". This is also the order every list renders.
  "SOLE",
  "TOWN",
  "DELEGATED",
  "ASSOCIATION",
  "COOPERATIVE",
  "COLLECTIVE",
  "COMPANY",
] as const;
export type GovernanceProfileId = (typeof GOVERNANCE_PROFILE_IDS)[number];
/** What an organization decides by when its founder did not say. */
export const DEFAULT_GOVERNANCE_PROFILE: GovernanceProfileId = "TOWN";

/**
 * What kind of body an organization is — a town, an association, a company, a
 * local fund. One list for OrangeCat, Loki and Solon, vendored from
 * bitbaum/orangecat packages/collective-kinds (src/lib/collective-kinds). The
 * kind is a different axis from the governance profile: an association may
 * decide by delegates, a town by one person. The kind says WHAT the body is;
 * the profile says HOW it decides; KIND_DEFAULT_PROFILE in
 * config/governance-profiles.ts is the suggested pairing.
 */
export { COLLECTIVE_KIND_IDS, LEGAL_STATUSES } from "@/lib/collective-kinds";
export type { CollectiveKindId, LegalStatus } from "@/lib/collective-kinds";
/** What an organization founded before kinds existed is: people who trust each other. */
export const DEFAULT_COLLECTIVE_KIND = "circle" as const;

export const MEMBER_TYPES = ["HUMAN", "AGENT"] as const;
export const MemberType = enumLike(MEMBER_TYPES);
export type MemberType = (typeof MEMBER_TYPES)[number];

export const KEY_CUSTODIES = ["SELF", "SERVICE"] as const;
export const KeyCustody = enumLike(KEY_CUSTODIES);
export type KeyCustody = (typeof KEY_CUSTODIES)[number];

/**
 * What proves that a member really did an act (filed a proposal, cast a vote).
 *
 * - BIP137: a Bitcoin signed message from the member's own key. Anyone can
 *   re-verify it without trusting Solon.
 * - ACCOUNT: the member was signed in with their OrangeCat identity and pressed
 *   the button. Nothing is signed; the record is Solon's word that the seat
 *   holding that identity acted. It is the easy default, and it is labelled as
 *   exactly what it is wherever it is published.
 */
export const PROOFS = ["BIP137", "ACCOUNT"] as const;
export const Proof = enumLike(PROOFS);
export type Proof = (typeof PROOFS)[number];

export const MEMBER_STATUSES = ["ACTIVE", "SUSPENDED", "RETIRED"] as const;
export const MemberStatus = enumLike(MEMBER_STATUSES);
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const DECISION_CATEGORIES = [
  "ALLOCATION_POLICY",
  "TREASURY_SPEND",
  "OPERATIONS",
  "AID_DISBURSEMENT",
  "MEMBERSHIP",
  "SAFETY",
  "GOVERNANCE_RULES",
] as const;
export const DecisionCategory = enumLike(DECISION_CATEGORIES);
export type DecisionCategory = (typeof DECISION_CATEGORIES)[number];

export const ELECTORATES = ["ALL_MEMBERS", "HUMANS_ONLY"] as const;
export const Electorate = enumLike(ELECTORATES);
export type Electorate = (typeof ELECTORATES)[number];

/**
 * WHO within the electorate decides a category.
 *
 * - MEMBERS: every eligible member votes.
 * - MANDATE: only members holding a live mandate vote — one founder who keeps
 *   every decision, or delegates the members elected for a term.
 *
 * This narrows the electorate and never widens it: a mandate holder who is an
 * agent still cannot vote on a HUMANS_ONLY category.
 */
export const DECISION_BODIES = ["MEMBERS", "MANDATE"] as const;
export const DecisionBody = enumLike(DECISION_BODIES);
export type DecisionBody = (typeof DECISION_BODIES)[number];

export const VOTE_THRESHOLDS = ["SIMPLE_MAJORITY", "SUPERMAJORITY"] as const;
export const VoteThreshold = enumLike(VOTE_THRESHOLDS);
export type VoteThreshold = (typeof VOTE_THRESHOLDS)[number];

export const PROPOSAL_STATUSES = ["DRAFT", "OPEN", "CLOSED"] as const;
export const ProposalStatus = enumLike(PROPOSAL_STATUSES);
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const SESSION_STATUSES = ["ACTIVE", "CLOSED"] as const;
export const SessionStatus = enumLike(SESSION_STATUSES);
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_OUTCOMES = ["APPROVED", "REJECTED", "EXPIRED"] as const;
export const SessionOutcome = enumLike(SESSION_OUTCOMES);
export type SessionOutcome = (typeof SESSION_OUTCOMES)[number];

/**
 * The shape of the question. See src/lib/domain/methods — each value there
 * owns its ballot schema, its signed encoding, and how it is counted.
 */
export const VOTING_METHODS = [
  "SINGLE_CHOICE",
  "CONSENT",
  "APPROVAL",
  "DOT",
  "SCORE",
  "RANKED",
] as const;
export const VotingMethod = enumLike(VOTING_METHODS);
export type VotingMethod = (typeof VOTING_METHODS)[number];

export const POLICY_STATUSES = ["ACTIVE", "SUPERSEDED"] as const;
export const PolicyStatus = enumLike(POLICY_STATUSES);
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

export const AUDIT_EVENT_TYPES = [
  "ORG_CREATED",
  "MEMBER_ADDED",
  "MEMBER_STATUS_CHANGED",
  "PROPOSAL_CREATED",
  "SESSION_OPENED",
  "VOTE_CAST",
  "SESSION_CLOSED",
  "POLICY_ACTIVATED",
  "MANDATE_CHANGED",
  "PROFILE_CHANGED",
] as const;
export const AuditEventType = enumLike(AUDIT_EVENT_TYPES);
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];
