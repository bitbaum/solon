CREATE TABLE "proposal_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"proposal_id" text NOT NULL,
	"view_sha256" varchar(64) NOT NULL,
	"attached_by" text NOT NULL,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statistic_records" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"record_key" text NOT NULL,
	"state" text NOT NULL,
	"metric_key" text,
	"jurisdiction_id" text,
	"body" jsonb NOT NULL,
	"asserted_by" text NOT NULL,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "statistic_records_kind_check" CHECK ("statistic_records"."kind" IN ('law_link', 'event', 'enforcement')),
	CONSTRAINT "statistic_records_state_check" CHECK ("statistic_records"."state" IN ('asserted', 'retracted'))
);
--> statement-breakpoint
CREATE TABLE "statistic_views" (
	"sha256" varchar(64) PRIMARY KEY NOT NULL,
	"spec" jsonb NOT NULL,
	"created_by" text,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "statistic_views_sha256_check" CHECK ("statistic_views"."sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "proposal_evidence" ADD CONSTRAINT "proposal_evidence_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "proposal_evidence" ADD CONSTRAINT "proposal_evidence_view_sha256_fkey" FOREIGN KEY ("view_sha256") REFERENCES "public"."statistic_views"("sha256") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "statistic_records" ADD CONSTRAINT "statistic_records_metric_key_fkey" FOREIGN KEY ("metric_key") REFERENCES "public"."place_metrics"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "statistic_records" ADD CONSTRAINT "statistic_records_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "proposal_evidence_proposal_view_key" ON "proposal_evidence" USING btree ("proposal_id","view_sha256");--> statement-breakpoint
CREATE INDEX "statistic_records_key_idx" ON "statistic_records" USING btree ("record_key","recorded_at");--> statement-breakpoint
CREATE INDEX "statistic_records_metric_idx" ON "statistic_records" USING btree ("metric_key");--> statement-breakpoint
-- Hand-written: what the schema file cannot say. Every row of the statistics record, a saved
-- view and an attachment of evidence is written once; a change or a withdrawal is a new row
-- (design: docs/design/2026-11-freedom-laws-statistics.md).
CREATE FUNCTION "statistics_refuse_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% rows are never changed or deleted; add a row instead', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "statistic_records_append_only" BEFORE UPDATE OR DELETE ON "statistic_records" FOR EACH ROW EXECUTE FUNCTION "statistics_refuse_change"();--> statement-breakpoint
CREATE TRIGGER "statistic_views_append_only" BEFORE UPDATE OR DELETE ON "statistic_views" FOR EACH ROW EXECUTE FUNCTION "statistics_refuse_change"();--> statement-breakpoint
CREATE TRIGGER "proposal_evidence_append_only" BEFORE UPDATE OR DELETE ON "proposal_evidence" FOR EACH ROW EXECUTE FUNCTION "statistics_refuse_change"();
