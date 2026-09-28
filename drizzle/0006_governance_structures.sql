-- Who decides becomes part of an organization's structure, not only how votes
-- are counted.
--
-- A profile may now give a category to the members holding a mandate — the
-- founder under "one person decides", delegates elected for a term under
-- "elected delegates decide". Sessions snapshot who decided and, for mandate
-- sessions, which seats; proposals may carry an effect (a mandate change or a
-- profile switch) applied when they pass.
-- Only adds: every existing row keeps deciding exactly as before (no mandates,
-- decided_by MEMBERS, no effect).
CREATE TYPE "public"."DecisionBody" AS ENUM('MEMBERS', 'MANDATE');--> statement-breakpoint
ALTER TYPE "public"."AuditEventType" ADD VALUE 'MANDATE_CHANGED';--> statement-breakpoint
ALTER TYPE "public"."AuditEventType" ADD VALUE 'PROFILE_CHANGED';--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "holds_mandate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "mandate_until" timestamp (3);--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "effect" jsonb;--> statement-breakpoint
ALTER TABLE "voting_sessions" ADD COLUMN "decided_by" "DecisionBody" DEFAULT 'MEMBERS' NOT NULL;--> statement-breakpoint
ALTER TABLE "voting_sessions" ADD COLUMN "mandate_roll" jsonb;