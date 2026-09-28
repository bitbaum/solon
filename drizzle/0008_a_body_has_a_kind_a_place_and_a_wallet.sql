-- An organization says what kind of body it is, where it belongs, what it
-- legally is, and — when its founder bound the two — which OrangeCat
-- organisation it IS.
--
-- The kind list is the one shared with OrangeCat (src/lib/collective-kinds,
-- vendored from bitbaum/orangecat packages/collective-kinds). A town or a
-- local fund cannot exist without a place; that rule is a CHECK here because it
-- is a fact about the body, not a preference of the form. Legal status is one
-- of three states the app admits only with evidence.
-- Only adds: every existing row becomes an informal circle nowhere in
-- particular, which is what it was.
ALTER TABLE "organizations" ADD COLUMN "kind" text DEFAULT 'circle' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "country_code" varchar(2);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "region" varchar(80);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "locality" varchar(80);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "legal_status" text DEFAULT 'informal' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "legal_form" varchar(120);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "jurisdiction" varchar(2);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "register_id" varchar(60);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "recognised_on" date;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "orangecat_group_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_orangecat_group_key" ON "organizations" USING btree ("orangecat_group_id");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_kind_check" CHECK ("organizations"."kind" IN ('circle', 'family', 'association', 'cooperative', 'collective', 'company', 'guild', 'dao', 'town', 'network_state', 'local_fund'));--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_place_bound_kinds_have_a_place" CHECK ("organizations"."kind" NOT IN ('town', 'local_fund') OR ("organizations"."country_code" IS NOT NULL AND "organizations"."region" IS NOT NULL AND "organizations"."locality" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_legal_status_check" CHECK ("organizations"."legal_status" IN ('informal', 'registered', 'tax_exempt'));