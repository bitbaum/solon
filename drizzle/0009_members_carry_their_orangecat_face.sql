-- A seat points at a person, and the person lives on OrangeCat. A member row
-- now carries the handle and picture OrangeCat shows for them, refreshed from
-- the id token on each sign-in (src/lib/domain/member-identity.ts), so a
-- roster reader can get from a seat to the human behind it. display_name is
-- deliberately not touched: it is the name chosen for THIS roster, and a
-- rename on OrangeCat must never silently rewrite a governance record.
ALTER TABLE "members" ADD COLUMN "oc_username" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "avatar_url" text;