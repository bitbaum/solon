-- Contribution allocation: a member directs their own share across the tiers
-- of government.
--
-- The organization decides the *bounds* — which tiers exist, the floor and
-- ceiling on each, and the split that applies to a member who has not spoken.
-- That is ordinary governed content: it lives in the `policies` table under
-- the key `contribution_allocation` and moves only through an approved
-- ALLOCATION_POLICY session, so this migration adds no table for it.
--
-- What it does add is the half the organization must NOT be able to decide:
-- the individual's split inside those bounds. Hence a row that only a Bitcoin
-- signature can write. There is deliberately no UPDATE path for `splits` —
-- changing your mind inserts version n+1 and marks n SUPERSEDED, so the record
-- of what someone directed, and when, survives them changing it.

-- 1. Versioning states for a member's own declaration. Named apart from
--    PolicyStatus on purpose: a member's split is not a policy, and a reader
--    should not have to work out whether the organization enacted it.
CREATE TYPE "AllocationStatus" AS ENUM ('ACTIVE', 'SUPERSEDED');

-- 2. Declaring is an auditable act like any other.
ALTER TYPE "AuditEventType" ADD VALUE 'ALLOCATION_DECLARED';

-- 3. Treasury sources may say which tier they receive for. Nullable, because
--    every address registered before this knows nothing about tiers and an
--    invented answer would be worse than none. Still watch-only: a label, an
--    address, and now which tier to look under — never an amount.
ALTER TABLE "treasury_sources" ADD COLUMN "tier_key" TEXT;

CREATE INDEX "treasury_sources_organization_id_tier_key_idx"
  ON "treasury_sources" ("organization_id", "tier_key");

-- 4. The declarations themselves.
CREATE TABLE "contribution_allocations" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "member_id"       TEXT NOT NULL,
  "version"         INTEGER NOT NULL,
  "splits"          JSONB NOT NULL,
  "policy_version"  INTEGER,
  "content_hash"    TEXT NOT NULL,
  "signed_message"  TEXT NOT NULL,
  "signature"       TEXT NOT NULL,
  "status"          "AllocationStatus" NOT NULL DEFAULT 'ACTIVE',
  "declared_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contribution_allocations_pkey" PRIMARY KEY ("id")
);

-- One member, one version number. This is the constraint that makes two
-- simultaneous declarations resolve to a loser rather than to two live splits
-- for the same person.
CREATE UNIQUE INDEX "contribution_allocations_member_id_version_key"
  ON "contribution_allocations" ("member_id", "version");

CREATE INDEX "contribution_allocations_organization_id_status_idx"
  ON "contribution_allocations" ("organization_id", "status");

ALTER TABLE "contribution_allocations"
  ADD CONSTRAINT "contribution_allocations_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contribution_allocations"
  ADD CONSTRAINT "contribution_allocations_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "members" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
