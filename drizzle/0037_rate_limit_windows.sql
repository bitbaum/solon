-- The assistants' rate-limit windows, shared by every instance and kept across deploys.
-- Additive: an empty table means everyone starts with a full allowance, as after any deploy before it.
CREATE TABLE "rate_limit_windows" (
	"key" text PRIMARY KEY NOT NULL,
	"hits" jsonb NOT NULL,
	"touched_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limit_windows_touched_at_idx" ON "rate_limit_windows" USING btree ("touched_at");