-- Who decides becomes part of an organization's structure, not only how votes
-- are counted.
--
-- Two new profiles, SOLE ("one person decides") and DELEGATED ("elected
-- delegates decide"), join the governance_profile CHECK. A profile may now give
-- a category to the members holding a mandate; sessions snapshot who decided
-- and, for mandate sessions, which seats; proposals may carry an effect (a
-- mandate change or a profile switch) applied when they pass.
-- Only adds and widens: every existing row keeps deciding exactly as before
-- (no mandates, decided_by MEMBERS, no effect, profile unchanged).
CREATE TYPE "public"."DecisionBody" AS ENUM('MEMBERS', 'MANDATE');--> statement-breakpoint
ALTER TYPE "public"."AuditEventType" ADD VALUE 'MANDATE_CHANGED';--> statement-breakpoint
ALTER TYPE "public"."AuditEventType" ADD VALUE 'PROFILE_CHANGED';--> statement-breakpoint
ALTER TABLE "organizations" DROP CONSTRAINT "organizations_governance_profile_check";--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "holds_mandate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "mandate_until" timestamp (3);--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "effect" jsonb;--> statement-breakpoint
ALTER TABLE "voting_sessions" ADD COLUMN "decided_by" "DecisionBody" DEFAULT 'MEMBERS' NOT NULL;--> statement-breakpoint
ALTER TABLE "voting_sessions" ADD COLUMN "mandate_roll" jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_governance_profile_check" CHECK ("organizations"."governance_profile" IN ('SOLE', 'TOWN', 'DELEGATED', 'ASSOCIATION', 'COOPERATIVE', 'COLLECTIVE', 'COMPANY'));