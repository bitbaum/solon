CREATE TABLE "legal_act_identifiers" (
	"id" text PRIMARY KEY NOT NULL,
	"act_id" text NOT NULL,
	"scheme" text NOT NULL,
	"value" text NOT NULL,
	"source_id" text NOT NULL,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	"superseded_at" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "legal_act_names" (
	"id" text PRIMARY KEY NOT NULL,
	"act_id" text NOT NULL,
	"locale" text NOT NULL,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"source_id" text NOT NULL,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	"superseded_at" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "legal_acts" (
	"id" text PRIMARY KEY NOT NULL,
	"authority" text NOT NULL,
	"jurisdiction_id" text,
	"kind" text NOT NULL,
	"in_force" boolean NOT NULL,
	"source_id" text NOT NULL,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legal_act_identifiers" ADD CONSTRAINT "legal_act_identifiers_act_id_fkey" FOREIGN KEY ("act_id") REFERENCES "public"."legal_acts"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "legal_act_identifiers" ADD CONSTRAINT "legal_act_identifiers_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "legal_act_names" ADD CONSTRAINT "legal_act_names_act_id_fkey" FOREIGN KEY ("act_id") REFERENCES "public"."legal_acts"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "legal_act_names" ADD CONSTRAINT "legal_act_names_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "legal_acts" ADD CONSTRAINT "legal_acts_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "legal_acts" ADD CONSTRAINT "legal_acts_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "legal_act_identifiers_act_scheme_key" ON "legal_act_identifiers" USING btree ("act_id","scheme") WHERE "legal_act_identifiers"."superseded_at" IS NULL;--> statement-breakpoint
CREATE INDEX "legal_act_identifiers_scheme_value_idx" ON "legal_act_identifiers" USING btree ("scheme","value");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_act_names_act_locale_kind_key" ON "legal_act_names" USING btree ("act_id","locale","kind") WHERE "legal_act_names"."superseded_at" IS NULL;--> statement-breakpoint
CREATE INDEX "legal_acts_authority_idx" ON "legal_acts" USING btree ("authority");