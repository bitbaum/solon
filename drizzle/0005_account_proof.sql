-- A Bitcoin key becomes one way to take part, not the price of a seat.
--
-- A member may now hold a seat with only their OrangeCat identity, and file or
-- vote simply by being signed in (proof ACCOUNT). Signed acts keep working
-- exactly as before (proof BIP137, the default for every existing row).
-- Only relaxes and adds: every existing row already satisfies the new check.
CREATE TYPE "public"."Proof" AS ENUM('BIP137', 'ACCOUNT');--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "key_custody" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "bitcoin_address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ALTER COLUMN "proposer_signature" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ALTER COLUMN "signature" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "proof" "Proof" DEFAULT 'BIP137' NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "proof" "Proof" DEFAULT 'BIP137' NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_credential_check" CHECK ("members"."bitcoin_address" IS NOT NULL OR "members"."oc_actor_id" IS NOT NULL);