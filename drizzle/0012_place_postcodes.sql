-- Postcode localities and the places they lie in (design §8.2, §9.2). One
-- postcode may span several places, so a lookup can return several rows, each
-- with the share of the locality's addresses inside the place. Additive only:
-- a new table, written by importers like relations (superseded, never deleted).
CREATE TABLE "place_postcodes" (
	"id" text PRIMARY KEY NOT NULL,
	"pack_key" text NOT NULL,
	"postcode" text NOT NULL,
	"locality" text NOT NULL,
	"jurisdiction_id" text NOT NULL,
	"share" numeric,
	"source_id" text NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	"superseded_at" timestamp (3),
	CONSTRAINT "place_postcodes_share_range" CHECK ("place_postcodes"."share" IS NULL OR ("place_postcodes"."share" > 0 AND "place_postcodes"."share" <= 1)),
	CONSTRAINT "place_postcodes_valid_period" CHECK ("place_postcodes"."valid_to" IS NULL OR "place_postcodes"."valid_from" IS NULL OR "place_postcodes"."valid_to" > "place_postcodes"."valid_from")
);
--> statement-breakpoint
ALTER TABLE "place_postcodes" ADD CONSTRAINT "place_postcodes_pack_key_fkey" FOREIGN KEY ("pack_key") REFERENCES "public"."place_country_packs"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "place_postcodes" ADD CONSTRAINT "place_postcodes_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "place_postcodes" ADD CONSTRAINT "place_postcodes_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "place_postcodes_one_current_per_key" ON "place_postcodes" USING btree ("pack_key","postcode","locality","jurisdiction_id",coalesce("valid_from", '-infinity'::date)) WHERE "place_postcodes"."superseded_at" IS NULL;--> statement-breakpoint
CREATE INDEX "place_postcodes_pack_key_postcode_idx" ON "place_postcodes" USING btree ("pack_key","postcode");--> statement-breakpoint
CREATE INDEX "place_postcodes_jurisdiction_id_idx" ON "place_postcodes" USING btree ("jurisdiction_id");