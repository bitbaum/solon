-- Which categories only people may vote on becomes each organization's own
-- rule, not the platform's (owner's decision, 2026-11-01).
--
-- organizations.humans_only_categories holds the list; its default is exactly
-- the four categories that were hard-coded until now, so every existing and
-- new organization keeps deciding as before. An organization changes it with a
-- GOVERNANCE_RULES decision carrying a `humans_only` effect, recorded as an
-- ELECTORATE_CHANGED audit event. Only adds: sessions already snapshot their
-- electorate, so no past decision changes.
ALTER TYPE "public"."AuditEventType" ADD VALUE 'ELECTORATE_CHANGED';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "humans_only_categories" text[] DEFAULT '{"AID_DISBURSEMENT","MEMBERSHIP","SAFETY","GOVERNANCE_RULES"}' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_humans_only_categories_check" CHECK ("organizations"."humans_only_categories" <@ ARRAY['ALLOCATION_POLICY', 'TREASURY_SPEND', 'OPERATIONS', 'AID_DISBURSEMENT', 'MEMBERSHIP', 'SAFETY', 'GOVERNANCE_RULES']::text[]);