CREATE TABLE "law_amendment_events" (
	"seq" bigint PRIMARY KEY NOT NULL,
	"prev_hash" text NOT NULL,
	"hash" text NOT NULL,
	"type" text NOT NULL,
	"amendment_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "law_amendment_events_seq_check" CHECK ("law_amendment_events"."seq" >= 1)
);
--> statement-breakpoint
CREATE TABLE "law_amendment_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"amendment_id" text NOT NULL,
	"revision" integer NOT NULL,
	"lang" text NOT NULL,
	"base_version_id" text NOT NULL,
	"title" text NOT NULL,
	"rationale" text NOT NULL,
	"changes" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"author" text NOT NULL,
	"proof" text NOT NULL,
	"signature" text,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "law_amendment_revisions_revision_check" CHECK ("law_amendment_revisions"."revision" >= 1),
	CONSTRAINT "law_amendment_revisions_proof_check" CHECK ("law_amendment_revisions"."proof" IN ('ACCOUNT', 'BIP137')),
	CONSTRAINT "law_amendment_revisions_signature_check" CHECK (("law_amendment_revisions"."proof" = 'BIP137') = ("law_amendment_revisions"."signature" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "law_amendment_supports" (
	"id" text PRIMARY KEY NOT NULL,
	"revision_id" text NOT NULL,
	"supporter" text NOT NULL,
	"kind" text NOT NULL,
	"proof" text NOT NULL,
	"signature" text,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "law_amendment_supports_kind_check" CHECK ("law_amendment_supports"."kind" IN ('support', 'withdraw')),
	CONSTRAINT "law_amendment_supports_proof_check" CHECK ("law_amendment_supports"."proof" IN ('ACCOUNT', 'BIP137')),
	CONSTRAINT "law_amendment_supports_signature_check" CHECK (("law_amendment_supports"."proof" = 'BIP137') = ("law_amendment_supports"."signature" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "law_amendments" (
	"id" text PRIMARY KEY NOT NULL,
	"authority" text NOT NULL,
	"act_id" text NOT NULL,
	"author" text NOT NULL,
	"forked_from_revision_id" text,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "law_amendment_revisions" ADD CONSTRAINT "law_amendment_revisions_amendment_id_fkey" FOREIGN KEY ("amendment_id") REFERENCES "public"."law_amendments"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "law_amendment_revisions" ADD CONSTRAINT "law_amendment_revisions_base_version_id_fkey" FOREIGN KEY ("base_version_id") REFERENCES "public"."legal_act_versions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "law_amendment_supports" ADD CONSTRAINT "law_amendment_supports_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "public"."law_amendment_revisions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "law_amendments" ADD CONSTRAINT "law_amendments_act_id_fkey" FOREIGN KEY ("act_id") REFERENCES "public"."legal_acts"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "law_amendment_events_hash_key" ON "law_amendment_events" USING btree ("hash");--> statement-breakpoint
CREATE UNIQUE INDEX "law_amendment_events_prev_hash_key" ON "law_amendment_events" USING btree ("prev_hash");--> statement-breakpoint
CREATE INDEX "law_amendment_events_amendment_idx" ON "law_amendment_events" USING btree ("amendment_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "law_amendment_revisions_amendment_revision_key" ON "law_amendment_revisions" USING btree ("amendment_id","revision");--> statement-breakpoint
CREATE INDEX "law_amendment_supports_revision_idx" ON "law_amendment_supports" USING btree ("revision_id","supporter");--> statement-breakpoint
CREATE INDEX "law_amendments_act_idx" ON "law_amendments" USING btree ("act_id");--> statement-breakpoint
CREATE INDEX "law_amendments_authority_idx" ON "law_amendments" USING btree ("authority");--> statement-breakpoint
-- Hand-written: what the schema file cannot say. A fork points at the revision it came from.
ALTER TABLE "law_amendments" ADD CONSTRAINT "law_amendments_forked_from_revision_id_fkey" FOREIGN KEY ("forked_from_revision_id") REFERENCES "public"."law_amendment_revisions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
-- Append-only is enforced by the database, not by convention: no row of an amendment, a revision,
-- a support or an event is ever changed or removed (design: docs/design/2026-11-amending-the-law.md).
CREATE FUNCTION "law_amendments_refuse_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% rows are never changed or deleted; add a row instead', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "law_amendments_append_only" BEFORE UPDATE OR DELETE ON "law_amendments" FOR EACH ROW EXECUTE FUNCTION "law_amendments_refuse_change"();--> statement-breakpoint
CREATE TRIGGER "law_amendment_revisions_append_only" BEFORE UPDATE OR DELETE ON "law_amendment_revisions" FOR EACH ROW EXECUTE FUNCTION "law_amendments_refuse_change"();--> statement-breakpoint
CREATE TRIGGER "law_amendment_supports_append_only" BEFORE UPDATE OR DELETE ON "law_amendment_supports" FOR EACH ROW EXECUTE FUNCTION "law_amendments_refuse_change"();--> statement-breakpoint
CREATE TRIGGER "law_amendment_events_append_only" BEFORE UPDATE OR DELETE ON "law_amendment_events" FOR EACH ROW EXECUTE FUNCTION "law_amendments_refuse_change"();
