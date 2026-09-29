-- A new kind of body, charter_city (@bitbaum/collective-kinds 0.2.0): a city
-- with its own charter, founded by agreement with its host state, or proposed
-- before it. Both checks are derived from the kind list (src/lib/db/schema.ts)
-- and only widen: one more allowed kind, and it must name a place like a town.
ALTER TABLE "organizations" DROP CONSTRAINT "organizations_kind_check";--> statement-breakpoint
ALTER TABLE "organizations" DROP CONSTRAINT "organizations_place_bound_kinds_have_a_place";--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_kind_check" CHECK ("organizations"."kind" IN ('circle', 'family', 'association', 'cooperative', 'collective', 'company', 'guild', 'dao', 'town', 'charter_city', 'network_state', 'local_fund'));--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_place_bound_kinds_have_a_place" CHECK ("organizations"."kind" NOT IN ('town', 'charter_city', 'local_fund') OR ("organizations"."country_code" IS NOT NULL AND "organizations"."region" IS NOT NULL AND "organizations"."locality" IS NOT NULL));