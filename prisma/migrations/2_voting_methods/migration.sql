-- Voting methods: the ballot becomes a typed, signed payload.
--
-- Before this, a vote could only be YES/NO/ABSTAIN and the column `choice`
-- held it. Now the ballot is JSON whose shape its method defines, and the
-- canonical encoding of that JSON is what the member's signature covers.
--
-- The backfill is the careful part. Every historical vote's stored
-- `signed_message` ends in `choice:yes|no|abstain`, and that text is what the
-- stored signature actually signs. Rewriting `choice` into a
-- `{"method":"single_choice","choice":"yes"}` ballot has to preserve that
-- exactly, because `single_choice.canonical()` returns the bare word and so
-- reproduces the identical message. No historical signature changes meaning,
-- and every one of them still verifies. Dropping `choice` afterwards removes a
-- second copy of a fact the ballot now owns.

-- 1. The method enum.
CREATE TYPE "VotingMethod" AS ENUM ('SINGLE_CHOICE', 'CONSENT', 'APPROVAL', 'DOT', 'SCORE', 'RANKED');

-- 1b. Each organization decides by one structure. Existing organizations keep
--     deciding exactly as they did: TOWN reproduces the pre-profile rules.
ALTER TABLE "organizations"
  ADD COLUMN "governance_profile" TEXT NOT NULL DEFAULT 'TOWN';

-- 2. Proposals may state the question's shape and its answer space.
ALTER TABLE "proposals"
  ADD COLUMN "method"  "VotingMethod",
  ADD COLUMN "options" JSONB;

-- 3. Sessions snapshot method, options and dot budget alongside the existing
--    rules, and record which option won for ranking methods.
ALTER TABLE "voting_sessions"
  ADD COLUMN "method"             "VotingMethod" NOT NULL DEFAULT 'SINGLE_CHOICE',
  ADD COLUMN "options"            JSONB,
  ADD COLUMN "dot_budget"         INTEGER,
  ADD COLUMN "winning_option_key" TEXT;

-- 4. Votes carry a ballot. Added nullable so the backfill can populate it
--    before the NOT NULL constraint is applied.
ALTER TABLE "votes" ADD COLUMN "ballot" JSONB;

-- 5. Backfill: every existing vote is a single-choice ballot. lower() because
--    the ballot form is the lowercase word that appears in the signed message.
UPDATE "votes"
SET "ballot" = jsonb_build_object('method', 'single_choice', 'choice', lower("choice"::text))
WHERE "ballot" IS NULL;

-- 6. Refuse to proceed if any vote failed to backfill — a vote without a
--    ballot is a vote whose meaning we cannot state, and silently defaulting
--    it would forge one.
DO $$
DECLARE orphaned INTEGER;
BEGIN
  SELECT count(*) INTO orphaned FROM "votes" WHERE "ballot" IS NULL;
  IF orphaned > 0 THEN
    RAISE EXCEPTION 'aborting: % vote(s) have no ballot after backfill', orphaned;
  END IF;
END $$;

ALTER TABLE "votes" ALTER COLUMN "ballot" SET NOT NULL;

-- 7. The old column and its type are now a second source of truth. Remove them.
ALTER TABLE "votes" DROP COLUMN "choice";
DROP TYPE "VoteChoice";
