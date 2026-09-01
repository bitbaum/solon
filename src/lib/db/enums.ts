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

export const MEMBER_TYPES = ["HUMAN", "AGENT"] as const;
export const MemberType = enumLike(MEMBER_TYPES);
export type MemberType = (typeof MEMBER_TYPES)[number];

export const KEY_CUSTODIES = ["SELF", "SERVICE"] as const;
export const KeyCustody = enumLike(KEY_CUSTODIES);
export type KeyCustody = (typeof KEY_CUSTODIES)[number];

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
] as const;
export const AuditEventType = enumLike(AUDIT_EVENT_TYPES);
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];
