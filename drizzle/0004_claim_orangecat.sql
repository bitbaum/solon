-- Organization #1 governs the OrangeCat platform, and says so in its own seed
-- description (0001_seed_org1). Record that as its claimed project.
--
-- Every later claim comes from a grant Loki signs for a founder's own identity
-- (src/lib/loki-grant.ts). This one row predates grants: organization #1 was
-- seeded by a migration, not founded, so there was no founder to vouch for. It
-- is written as reference data — the way organization #1 itself was — so Loki's
-- register, which now attributes an organization to a project only through
-- claimed_project, keeps showing OrangeCat on Solon instead of silently
-- dropping the one pairing that already existed.
--
-- Idempotent: it only fills a claim that is empty.
UPDATE "organizations" SET "claimed_project" = 'orangecat'
WHERE "slug" = 'orangecat' AND "claimed_project" IS NULL;
