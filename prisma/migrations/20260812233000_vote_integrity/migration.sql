-- A Bitcoin address identifies at most one member inside an organization.
-- PostgreSQL permits multiple NULL values in this unique index.
CREATE UNIQUE INDEX "members_organization_id_bitcoin_address_key"
ON "members"("organization_id", "bitcoin_address");

-- Vote counts and weighted tallies are derived from the votes table. Keeping
-- a denormalized integer here caused stale counts and could not represent
-- fractional voting weights.
ALTER TABLE "voting_sessions" DROP COLUMN "total_votes_cast";
