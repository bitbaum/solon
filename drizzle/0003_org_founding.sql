DROP INDEX "members_oc_actor_id_key";--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "claimed_project" text;--> statement-breakpoint
CREATE UNIQUE INDEX "members_organization_id_oc_actor_id_key" ON "members" USING btree ("organization_id","oc_actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_claimed_project_key" ON "organizations" USING btree ("claimed_project");