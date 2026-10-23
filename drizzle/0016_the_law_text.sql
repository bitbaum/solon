CREATE TABLE "legal_act_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"act_id" text NOT NULL,
	"lang" text NOT NULL,
	"in_force_from" date NOT NULL,
	"in_force_to" date,
	"status" text NOT NULL,
	"format" text NOT NULL,
	"source_id" text NOT NULL,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_provisions" (
	"id" text PRIMARY KEY NOT NULL,
	"version_id" text NOT NULL,
	"path" text NOT NULL,
	"heading" text NOT NULL,
	"text" text NOT NULL,
	"ord" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legal_act_versions" ADD CONSTRAINT "legal_act_versions_act_id_fkey" FOREIGN KEY ("act_id") REFERENCES "public"."legal_acts"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "legal_act_versions" ADD CONSTRAINT "legal_act_versions_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "legal_provisions" ADD CONSTRAINT "legal_provisions_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."legal_act_versions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "legal_act_versions_act_lang_from_key" ON "legal_act_versions" USING btree ("act_id","lang","in_force_from");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_provisions_version_path_key" ON "legal_provisions" USING btree ("version_id","path");