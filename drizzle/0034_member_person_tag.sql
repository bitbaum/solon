-- One person, one human seat per organization.
--
-- A person on OrangeCat can hold several identities, each its own account, so a
-- seat per account is several seats per person. `person_tag` is an opaque tag
-- OrangeCat gives per account, keyed to this organization: two seats carry the
-- same tag exactly when one person holds both (src/lib/orangecat-person.ts).
-- The index refuses the second. A retired seat does not block the person from
-- being seated again; a suspended one does, so a suspension cannot be dodged by
-- being seated under another identity. A null tag (an account that cannot be
-- told apart) is never a clash.
ALTER TABLE "members" ADD COLUMN "person_tag" text;--> statement-breakpoint
CREATE UNIQUE INDEX "members_organization_id_person_tag_key" ON "members" USING btree ("organization_id","person_tag") WHERE person_tag IS NOT NULL AND member_type = 'HUMAN' AND status <> 'RETIRED';