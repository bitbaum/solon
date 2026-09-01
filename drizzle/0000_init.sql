CREATE TYPE "public"."AuditEventType" AS ENUM('ORG_CREATED', 'MEMBER_ADDED', 'MEMBER_STATUS_CHANGED', 'PROPOSAL_CREATED', 'SESSION_OPENED', 'VOTE_CAST', 'SESSION_CLOSED', 'POLICY_ACTIVATED');--> statement-breakpoint
CREATE TYPE "public"."DecisionCategory" AS ENUM('ALLOCATION_POLICY', 'TREASURY_SPEND', 'OPERATIONS', 'AID_DISBURSEMENT', 'MEMBERSHIP', 'SAFETY', 'GOVERNANCE_RULES');--> statement-breakpoint
CREATE TYPE "public"."Electorate" AS ENUM('ALL_MEMBERS', 'HUMANS_ONLY');--> statement-breakpoint
CREATE TYPE "public"."KeyCustody" AS ENUM('SELF', 'SERVICE');--> statement-breakpoint
CREATE TYPE "public"."MemberStatus" AS ENUM('ACTIVE', 'SUSPENDED', 'RETIRED');--> statement-breakpoint
CREATE TYPE "public"."MemberType" AS ENUM('HUMAN', 'AGENT');--> statement-breakpoint
CREATE TYPE "public"."PolicyStatus" AS ENUM('ACTIVE', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."ProposalStatus" AS ENUM('DRAFT', 'OPEN', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."SessionOutcome" AS ENUM('APPROVED', 'REJECTED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."SessionStatus" AS ENUM('ACTIVE', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."VoteThreshold" AS ENUM('SIMPLE_MAJORITY', 'SUPERMAJORITY');--> statement-breakpoint
CREATE TYPE "public"."VotingMethod" AS ENUM('SINGLE_CHOICE', 'CONSENT', 'APPROVAL', 'DOT', 'SCORE', 'RANKED');--> statement-breakpoint
CREATE TABLE "agent_api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"revoked_at" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"event_type" "AuditEventType" NOT NULL,
	"actor_member_id" text,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"display_name" text NOT NULL,
	"member_type" "MemberType" NOT NULL,
	"key_custody" "KeyCustody" NOT NULL,
	"bitcoin_address" varchar(90) NOT NULL,
	"public_key_hex" text,
	"voting_weight" numeric(10, 2) DEFAULT 1 NOT NULL,
	"status" "MemberStatus" DEFAULT 'ACTIVE' NOT NULL,
	"oc_actor_id" text,
	"system" text,
	"joined_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"governance_profile" text DEFAULT 'TOWN' NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"key" text NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"status" "PolicyStatus" NOT NULL,
	"approved_by_session_id" text,
	"activated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"category" "DecisionCategory" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"policy_key" text,
	"proposed_content" jsonb,
	"target" text,
	"content_hash" text,
	"method" "VotingMethod",
	"options" jsonb,
	"proposer_member_id" text NOT NULL,
	"proposer_signature" text NOT NULL,
	"status" "ProposalStatus" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treasury_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"label" text NOT NULL,
	"address" varchar(90) NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"member_id" text NOT NULL,
	"ballot" jsonb NOT NULL,
	"weight" numeric(10, 2) NOT NULL,
	"signed_message" text NOT NULL,
	"signature" text NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voting_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"proposal_id" text NOT NULL,
	"status" "SessionStatus" DEFAULT 'ACTIVE' NOT NULL,
	"opens_at" timestamp (3) DEFAULT now() NOT NULL,
	"closes_at" timestamp (3) NOT NULL,
	"electorate" "Electorate" NOT NULL,
	"method" "VotingMethod" DEFAULT 'SINGLE_CHOICE' NOT NULL,
	"options" jsonb,
	"dot_budget" integer,
	"threshold" "VoteThreshold" NOT NULL,
	"quorum_percent" integer NOT NULL,
	"eligible_count" integer NOT NULL,
	"eligible_weight" numeric(12, 2) NOT NULL,
	"outcome" "SessionOutcome",
	"winning_option_key" text,
	"closed_at" timestamp (3)
);
--> statement-breakpoint
ALTER TABLE "agent_api_keys" ADD CONSTRAINT "agent_api_keys_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_approved_by_session_id_fkey" FOREIGN KEY ("approved_by_session_id") REFERENCES "public"."voting_sessions"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_proposer_member_id_fkey" FOREIGN KEY ("proposer_member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "treasury_sources" ADD CONSTRAINT "treasury_sources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."voting_sessions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "voting_sessions" ADD CONSTRAINT "voting_sessions_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_api_keys_key_hash_key" ON "agent_api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "audit_events_organization_id_created_at_idx" ON "audit_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "members_oc_actor_id_key" ON "members" USING btree ("oc_actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_organization_id_bitcoin_address_key" ON "members" USING btree ("organization_id","bitcoin_address");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "policies_organization_id_key_version_key" ON "policies" USING btree ("organization_id","key","version");--> statement-breakpoint
CREATE UNIQUE INDEX "treasury_sources_organization_id_address_key" ON "treasury_sources" USING btree ("organization_id","address");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_session_id_member_id_key" ON "votes" USING btree ("session_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "voting_sessions_proposal_id_key" ON "voting_sessions" USING btree ("proposal_id");