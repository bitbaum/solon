/**
 * Solon governance schema v2 — the SSOT for all types (inferred from here).
 *
 * Ported 1:1 from prisma/schema.prisma when the fleet standardized on Drizzle;
 * the live database was shaped by Prisma's migrations, so every table, column,
 * enum, index and constraint name here matches that SQL byte-for-byte
 * (`organizations_slug_key`, `members_organization_id_fkey`, …). Nothing in
 * this file may rename or reshape an existing object — that would be a schema
 * change wearing a refactor's clothes.
 *
 * Design invariants (unchanged from v2):
 * - Solon never holds private keys: members (human OR agent) register a Bitcoin
 *   address; every vote and proposal carries a Bitcoin signed-message signature.
 * - VotingSession snapshots its rules (electorate/threshold/quorum/eligibility)
 *   at open, so a past decision stays explainable after policy changes.
 * - AuditEvent is append-only: no code path may update or delete rows.
 * - Policy versions: v1 is the seeded bootstrap; every later version requires an
 *   APPROVED voting session (enforced in src/lib/domain/voting.ts).
 *
 * Ids are minted in the app (crypto.randomUUID), exactly as Prisma's
 * `@default(uuid())` was — the columns carry no database default.
 */
import { relations, sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import {
  AUDIT_EVENT_TYPES,
  DECISION_CATEGORIES,
  ELECTORATES,
  KEY_CUSTODIES,
  MEMBER_STATUSES,
  MEMBER_TYPES,
  POLICY_STATUSES,
  PROPOSAL_STATUSES,
  SESSION_OUTCOMES,
  SESSION_STATUSES,
  VOTE_THRESHOLDS,
  VOTING_METHODS,
} from "./enums";

export * from "./enums";

// Postgres enum type names are the Prisma-era PascalCase ones — they already
// exist in the live database under exactly these names.
export const memberTypeEnum = pgEnum("MemberType", MEMBER_TYPES);
export const keyCustodyEnum = pgEnum("KeyCustody", KEY_CUSTODIES);
export const memberStatusEnum = pgEnum("MemberStatus", MEMBER_STATUSES);
export const decisionCategoryEnum = pgEnum("DecisionCategory", DECISION_CATEGORIES);
export const electorateEnum = pgEnum("Electorate", ELECTORATES);
export const voteThresholdEnum = pgEnum("VoteThreshold", VOTE_THRESHOLDS);
export const proposalStatusEnum = pgEnum("ProposalStatus", PROPOSAL_STATUSES);
export const sessionStatusEnum = pgEnum("SessionStatus", SESSION_STATUSES);
export const sessionOutcomeEnum = pgEnum("SessionOutcome", SESSION_OUTCOMES);
export const votingMethodEnum = pgEnum("VotingMethod", VOTING_METHODS);
export const policyStatusEnum = pgEnum("PolicyStatus", POLICY_STATUSES);
export const auditEventTypeEnum = pgEnum("AuditEventType", AUDIT_EVENT_TYPES);

const uuid = () => randomUUID();

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /**
     * Which structure this organization decides by — see
     * src/lib/config/governance-profiles.ts. Changing it is itself a
     * GOVERNANCE_RULES decision.
     */
    governanceProfile: text("governance_profile").notNull().default("TOWN"),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("organizations_slug_key").on(t.slug)],
);

export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    organizationId: text("organization_id").notNull(),
    displayName: text("display_name").notNull(),
    memberType: memberTypeEnum("member_type").notNull(),
    /** Who holds the member's private key. Never Solon — SELF is a human's own
     * wallet, SERVICE is an agent system's own environment (OC box, FC box). */
    keyCustody: keyCustodyEnum("key_custody").notNull(),
    /** The address votes must recover to. The only voting credential there is. */
    bitcoinAddress: varchar("bitcoin_address", { length: 90 }).notNull(),
    publicKeyHex: text("public_key_hex"),
    votingWeight: numeric("voting_weight", { precision: 10, scale: 2 })
      .notNull()
      .default(sql`1`),
    status: memberStatusEnum("status").notNull().default("ACTIVE"),
    /** OrangeCat actor id once the member linked via OIDC login (humans only). */
    ocActorId: text("oc_actor_id"),
    /** For agents: which system runs them, e.g. "orangecat:cat", "fleetcrown:loki". */
    system: text("system"),
    joinedAt: timestamp("joined_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("members_oc_actor_id_key").on(t.ocActorId),
    uniqueIndex("members_organization_id_bitcoin_address_key").on(
      t.organizationId,
      t.bitcoinAddress,
    ),
    foreignKey({
      columns: [t.organizationId],
      foreignColumns: [organizations.id],
      name: "members_organization_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const proposals = pgTable(
  "proposals",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    organizationId: text("organization_id").notNull(),
    category: decisionCategoryEnum("category").notNull(),
    title: text("title").notNull(),
    /** Markdown rationale — what is proposed and why. */
    body: text("body").notNull(),
    /** For policy proposals: which policy key this would change… */
    policyKey: text("policy_key"),
    /** …the exact proposed content… */
    proposedContent: jsonb("proposed_content"),
    /** …an external target ("orangecat:allocation_policy:<key>")… */
    target: text("target"),
    /** …and sha256 of the canonical JSON of proposedContent — what voters sign over. */
    contentHash: text("content_hash"),
    /**
     * How this proposal should be decided. Null falls back to the organization's
     * governance profile for this category — the profile is the default, this is
     * the deliberate override.
     */
    method: votingMethodEnum("method"),
    /**
     * The answer space for multi-option methods: [{key, label}, …]. Null for
     * yes/no questions, which carry their answers in the method itself.
     */
    options: jsonb("options"),
    proposerMemberId: text("proposer_member_id").notNull(),
    /** Bitcoin signed-message signature over proposalMessage() by the proposer. */
    proposerSignature: text("proposer_signature").notNull(),
    status: proposalStatusEnum("status").notNull().default("DRAFT"),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.organizationId],
      foreignColumns: [organizations.id],
      name: "proposals_organization_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.proposerMemberId],
      foreignColumns: [members.id],
      name: "proposals_proposer_member_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const votingSessions = pgTable(
  "voting_sessions",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    proposalId: text("proposal_id").notNull(),
    status: sessionStatusEnum("status").notNull().default("ACTIVE"),
    opensAt: timestamp("opens_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
    closesAt: timestamp("closes_at", { precision: 3, mode: "date" }).notNull(),

    // Snapshot at open — a past decision must stay explainable after the
    // governance config changes.
    electorate: electorateEnum("electorate").notNull(),
    method: votingMethodEnum("method").notNull().default("SINGLE_CHOICE"),
    /**
     * The exact options put to the members, frozen at open. Editing the
     * proposal afterwards cannot change what was voted on.
     */
    options: jsonb("options"),
    /**
     * Dots each member was given, for DOT sessions. Snapshotted for the same
     * reason as everything else here: a count run next year must use the budget
     * these voters actually had.
     */
    dotBudget: integer("dot_budget"),
    threshold: voteThresholdEnum("threshold").notNull(),
    quorumPercent: integer("quorum_percent").notNull(),
    eligibleCount: integer("eligible_count").notNull(),
    eligibleWeight: numeric("eligible_weight", { precision: 12, scale: 2 }).notNull(),

    outcome: sessionOutcomeEnum("outcome"),
    /** For ranking methods: the option that won. Null for yes/no decisions. */
    winningOptionKey: text("winning_option_key"),
    closedAt: timestamp("closed_at", { precision: 3, mode: "date" }),
  },
  (t) => [
    uniqueIndex("voting_sessions_proposal_id_key").on(t.proposalId),
    foreignKey({
      columns: [t.proposalId],
      foreignColumns: [proposals.id],
      name: "voting_sessions_proposal_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const votes = pgTable(
  "votes",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    sessionId: text("session_id").notNull(),
    memberId: text("member_id").notNull(),
    /**
     * The ballot as cast, in the shape its method admits. The single source of
     * truth for what this member voted: `signedMessage` carries the canonical
     * encoding of exactly this value, so the two can always be checked against
     * each other.
     */
    ballot: jsonb("ballot").notNull(),
    /** Member's weight snapshotted at cast time. */
    weight: numeric("weight", { precision: 10, scale: 2 }).notNull(),
    /** The exact canonical message that was signed — stored so anyone can re-verify. */
    signedMessage: text("signed_message").notNull(),
    signature: text("signature").notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("votes_session_id_member_id_key").on(t.sessionId, t.memberId),
    foreignKey({
      columns: [t.sessionId],
      foreignColumns: [votingSessions.id],
      name: "votes_session_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.memberId],
      foreignColumns: [members.id],
      name: "votes_member_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const policies = pgTable(
  "policies",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    organizationId: text("organization_id").notNull(),
    key: text("key").notNull(),
    version: integer("version").notNull(),
    content: jsonb("content").notNull(),
    status: policyStatusEnum("status").notNull(),
    /**
     * Null only for the seeded bootstrap version. Every later version must
     * reference the APPROVED session that legitimated it.
     */
    approvedBySessionId: text("approved_by_session_id"),
    activatedAt: timestamp("activated_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("policies_organization_id_key_version_key").on(t.organizationId, t.key, t.version),
    foreignKey({
      columns: [t.organizationId],
      foreignColumns: [organizations.id],
      name: "policies_organization_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.approvedBySessionId],
      foreignColumns: [votingSessions.id],
      name: "policies_approved_by_session_id_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);

/**
 * Watch-only treasury source. Solon never holds funds — it points at
 * independently verifiable on-chain addresses.
 */
export const treasurySources = pgTable(
  "treasury_sources",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    organizationId: text("organization_id").notNull(),
    label: text("label").notNull(),
    address: varchar("address", { length: 90 }).notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("treasury_sources_organization_id_address_key").on(t.organizationId, t.address),
    foreignKey({
      columns: [t.organizationId],
      foreignColumns: [organizations.id],
      name: "treasury_sources_organization_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/** Append-only public audit log. No update or delete path exists in code. */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    organizationId: text("organization_id").notNull(),
    eventType: auditEventTypeEnum("event_type").notNull(),
    actorMemberId: text("actor_member_id"),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_events_organization_id_created_at_idx").on(t.organizationId, t.createdAt),
    foreignKey({
      columns: [t.organizationId],
      foreignColumns: [organizations.id],
      name: "audit_events_organization_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/**
 * Transport auth for agent members calling the write API. The API key gets a
 * request in the door; the Bitcoin signature is the authorization artifact.
 */
export const agentApiKeys = pgTable(
  "agent_api_keys",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    memberId: text("member_id").notNull(),
    /** sha256 hex of the plaintext key (plaintext shown once at mint). */
    keyHash: text("key_hash").notNull(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { precision: 3, mode: "date" }),
  },
  (t) => [
    uniqueIndex("agent_api_keys_key_hash_key").on(t.keyHash),
    foreignKey({
      columns: [t.memberId],
      foreignColumns: [members.id],
      name: "agent_api_keys_member_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

// ---------------------------------------------------------------------------
// Relations (for db.query relational reads)
// ---------------------------------------------------------------------------

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(members),
  proposals: many(proposals),
  policies: many(policies),
  treasurySources: many(treasurySources),
  auditEvents: many(auditEvents),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [members.organizationId],
    references: [organizations.id],
  }),
  proposals: many(proposals),
  votes: many(votes),
  apiKeys: many(agentApiKeys),
}));

export const proposalsRelations = relations(proposals, ({ one }) => ({
  organization: one(organizations, {
    fields: [proposals.organizationId],
    references: [organizations.id],
  }),
  proposer: one(members, {
    fields: [proposals.proposerMemberId],
    references: [members.id],
  }),
  session: one(votingSessions, {
    fields: [proposals.id],
    references: [votingSessions.proposalId],
  }),
}));

export const votingSessionsRelations = relations(votingSessions, ({ one, many }) => ({
  proposal: one(proposals, {
    fields: [votingSessions.proposalId],
    references: [proposals.id],
  }),
  votes: many(votes),
  policies: many(policies),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  session: one(votingSessions, {
    fields: [votes.sessionId],
    references: [votingSessions.id],
  }),
  member: one(members, {
    fields: [votes.memberId],
    references: [members.id],
  }),
}));

export const policiesRelations = relations(policies, ({ one }) => ({
  organization: one(organizations, {
    fields: [policies.organizationId],
    references: [organizations.id],
  }),
  approvedBySession: one(votingSessions, {
    fields: [policies.approvedBySessionId],
    references: [votingSessions.id],
  }),
}));

export const treasurySourcesRelations = relations(treasurySources, ({ one }) => ({
  organization: one(organizations, {
    fields: [treasurySources.organizationId],
    references: [organizations.id],
  }),
}));

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditEvents.organizationId],
    references: [organizations.id],
  }),
}));

export const agentApiKeysRelations = relations(agentApiKeys, ({ one }) => ({
  member: one(members, {
    fields: [agentApiKeys.memberId],
    references: [members.id],
  }),
}));

// ---------------------------------------------------------------------------
// Row types (what the ORM client used to generate as model types)
// ---------------------------------------------------------------------------

export type Organization = typeof organizations.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type VotingSession = typeof votingSessions.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type Policy = typeof policies.$inferSelect;
export type TreasurySource = typeof treasurySources.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type AgentApiKey = typeof agentApiKeys.$inferSelect;
