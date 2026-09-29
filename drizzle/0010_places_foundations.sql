-- Places: every jurisdiction, official and founded — the empty tables of
-- docs/design/2026-09-places-and-jurisdictions.md §4 (schema:
-- src/lib/db/places-schema.ts). Only adds; no existing table changes.
--
-- Registries (place_*) are projections of src/lib/config/places, written by
-- places:sync-config. Everything else is written by importers and, later, by
-- Register decisions. Nothing is deleted: rows end (valid_to) or are
-- superseded (superseded_at), and the triggers at the end enforce it.
CREATE TABLE "area_assertions" (
	"id" text PRIMARY KEY NOT NULL,
	"jurisdiction_id" text NOT NULL,
	"area_id" text NOT NULL,
	"assertion" text NOT NULL,
	"asserted_by_id" text,
	"source_id" text NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	"superseded_at" timestamp (3),
	CONSTRAINT "area_assertions_assertion_check" CHECK ("area_assertions"."assertion" IN ('claims', 'administers', 'proposes')),
	CONSTRAINT "area_assertions_valid_period" CHECK ("area_assertions"."valid_to" IS NULL OR "area_assertions"."valid_from" IS NULL OR "area_assertions"."valid_to" > "area_assertions"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "areas" (
	"id" text PRIMARY KEY NOT NULL,
	"geometry_ref" text NOT NULL,
	"source_id" text NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	"superseded_at" timestamp (3),
	CONSTRAINT "areas_valid_period" CHECK ("areas"."valid_to" IS NULL OR "areas"."valid_from" IS NULL OR "areas"."valid_to" > "areas"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "facts" (
	"id" text PRIMARY KEY NOT NULL,
	"jurisdiction_id" text NOT NULL,
	"metric_key" text NOT NULL,
	"variant" text,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"value_numeric" numeric,
	"value_json" jsonb,
	"unit" text,
	"currency" varchar(3),
	"source_id" text NOT NULL,
	"method" text NOT NULL,
	"corrected_by_proposal_id" text,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	"superseded_at" timestamp (3),
	CONSTRAINT "facts_method_check" CHECK ("facts"."method" IN ('imported', 'derived', 'corrected')),
	CONSTRAINT "facts_one_value" CHECK (("facts"."value_numeric" IS NULL) <> ("facts"."value_json" IS NULL)),
	CONSTRAINT "facts_currency_check" CHECK ("facts"."currency" IS NULL OR "facts"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "facts_correction_names_its_decision" CHECK (("facts"."method" = 'corrected') = ("facts"."corrected_by_proposal_id" IS NOT NULL)),
	CONSTRAINT "facts_valid_period" CHECK ("facts"."valid_to" IS NULL OR "facts"."valid_from" IS NULL OR "facts"."valid_to" > "facts"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" text PRIMARY KEY NOT NULL,
	"jurisdiction_id" text NOT NULL,
	"kind" text NOT NULL,
	"eligibility" jsonb NOT NULL,
	"requirements" jsonb NOT NULL,
	"how_key" text,
	"official_url" text,
	"source_id" text NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	"superseded_at" timestamp (3),
	CONSTRAINT "instruments_valid_period" CHECK ("instruments"."valid_to" IS NULL OR "instruments"."valid_from" IS NULL OR "instruments"."valid_to" > "instruments"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "jurisdiction_identifiers" (
	"id" text PRIMARY KEY NOT NULL,
	"jurisdiction_id" text NOT NULL,
	"scheme" text NOT NULL,
	"value" text NOT NULL,
	"source_id" text NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	"superseded_at" timestamp (3),
	CONSTRAINT "jurisdiction_identifiers_valid_period" CHECK ("jurisdiction_identifiers"."valid_to" IS NULL OR "jurisdiction_identifiers"."valid_from" IS NULL OR "jurisdiction_identifiers"."valid_to" > "jurisdiction_identifiers"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "jurisdiction_names" (
	"id" text PRIMARY KEY NOT NULL,
	"jurisdiction_id" text NOT NULL,
	"locale" text NOT NULL,
	"script" varchar(4),
	"name" text NOT NULL,
	"name_type" text NOT NULL,
	"used_by_id" text,
	"source_id" text NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	"superseded_at" timestamp (3),
	CONSTRAINT "jurisdiction_names_name_type_check" CHECK ("jurisdiction_names"."name_type" IN ('self', 'official_other', 'common', 'historical')),
	CONSTRAINT "jurisdiction_names_script_check" CHECK ("jurisdiction_names"."script" IS NULL OR "jurisdiction_names"."script" ~ '^[A-Z][a-z]{3}$'),
	CONSTRAINT "jurisdiction_names_valid_period" CHECK ("jurisdiction_names"."valid_to" IS NULL OR "jurisdiction_names"."valid_from" IS NULL OR "jurisdiction_names"."valid_to" > "jurisdiction_names"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "jurisdiction_relations" (
	"id" text PRIMARY KEY NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"relation" text NOT NULL,
	"source_id" text,
	"valid_from" date,
	"valid_to" date,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	"superseded_at" timestamp (3),
	CONSTRAINT "jurisdiction_relations_relation_check" CHECK ("jurisdiction_relations"."relation" IN ('part_of', 'overlaps', 'succeeds', 'located_in', 'federated_with', 'recognises', 'member_of')),
	CONSTRAINT "jurisdiction_relations_not_self" CHECK ("jurisdiction_relations"."from_id" <> "jurisdiction_relations"."to_id"),
	CONSTRAINT "jurisdiction_relations_sourced" CHECK ("jurisdiction_relations"."source_id" IS NOT NULL OR "jurisdiction_relations"."relation" IN ('located_in', 'federated_with')),
	CONSTRAINT "jurisdiction_relations_valid_period" CHECK ("jurisdiction_relations"."valid_to" IS NULL OR "jurisdiction_relations"."valid_from" IS NULL OR "jurisdiction_relations"."valid_to" > "jurisdiction_relations"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "jurisdictions" (
	"id" text PRIMARY KEY NOT NULL,
	"origin" text NOT NULL,
	"country_pack" text,
	"level_key" text,
	"organization_id" text,
	"slug_path" text,
	"valid_from" date,
	"valid_to" date,
	"recorded_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "jurisdictions_origin_check" CHECK ("jurisdictions"."origin" IN ('state', 'founded', 'proposed')),
	CONSTRAINT "jurisdictions_origin_shape" CHECK (("jurisdictions"."origin" = 'state' AND "jurisdictions"."organization_id" IS NULL AND "jurisdictions"."slug_path" IS NOT NULL)
        OR ("jurisdictions"."origin" IN ('founded', 'proposed') AND "jurisdictions"."organization_id" IS NOT NULL
            AND "jurisdictions"."level_key" IS NULL AND "jurisdictions"."country_pack" IS NULL AND "jurisdictions"."slug_path" IS NULL)),
	CONSTRAINT "jurisdictions_level_needs_pack" CHECK ("jurisdictions"."level_key" IS NULL OR "jurisdictions"."country_pack" IS NOT NULL),
	CONSTRAINT "jurisdictions_valid_period" CHECK ("jurisdictions"."valid_to" IS NULL OR "jurisdictions"."valid_from" IS NULL OR "jurisdictions"."valid_to" > "jurisdictions"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "place_config_syncs" (
	"id" text PRIMARY KEY NOT NULL,
	"config_sha256" text NOT NULL,
	"git_sha" text,
	"changes" jsonb NOT NULL,
	"synced_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "place_country_packs" (
	"key" text PRIMARY KEY NOT NULL,
	"retired_at" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "place_identifier_schemes" (
	"key" text PRIMARY KEY NOT NULL,
	"reserved" boolean NOT NULL,
	"retired_at" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "place_import_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"source_key" text NOT NULL,
	"source_id" text,
	"status" text NOT NULL,
	"report" jsonb NOT NULL,
	"started_at" timestamp (3) DEFAULT now() NOT NULL,
	"finished_at" timestamp (3),
	CONSTRAINT "place_import_runs_status_check" CHECK ("place_import_runs"."status" IN ('running', 'applied', 'dry_run', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "place_instrument_kinds" (
	"key" text PRIMARY KEY NOT NULL,
	"retired_at" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "place_levels" (
	"pack_key" text NOT NULL,
	"key" text NOT NULL,
	"parent_key" text,
	"retired_at" timestamp (3),
	CONSTRAINT "place_levels_pkey" PRIMARY KEY("pack_key","key")
);
--> statement-breakpoint
CREATE TABLE "place_metrics" (
	"key" text PRIMARY KEY NOT NULL,
	"value_type" text NOT NULL,
	"retired_at" timestamp (3),
	CONSTRAINT "place_metrics_value_type_check" CHECK ("place_metrics"."value_type" IN ('number', 'tariff'))
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"source_key" text NOT NULL,
	"retrieved_at" timestamp (3) NOT NULL,
	"url" text,
	"content_sha256" varchar(64) NOT NULL,
	"snapshot_key" text NOT NULL,
	"importer_version" text NOT NULL,
	"licence_spdx" text NOT NULL,
	CONSTRAINT "sources_content_sha256_check" CHECK ("sources"."content_sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "area_assertions" ADD CONSTRAINT "area_assertions_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "area_assertions" ADD CONSTRAINT "area_assertions_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "area_assertions" ADD CONSTRAINT "area_assertions_asserted_by_id_fkey" FOREIGN KEY ("asserted_by_id") REFERENCES "public"."jurisdictions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "area_assertions" ADD CONSTRAINT "area_assertions_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_metric_key_fkey" FOREIGN KEY ("metric_key") REFERENCES "public"."place_metrics"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_corrected_by_proposal_id_fkey" FOREIGN KEY ("corrected_by_proposal_id") REFERENCES "public"."proposals"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_kind_fkey" FOREIGN KEY ("kind") REFERENCES "public"."place_instrument_kinds"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "jurisdiction_identifiers" ADD CONSTRAINT "jurisdiction_identifiers_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "jurisdiction_identifiers" ADD CONSTRAINT "jurisdiction_identifiers_scheme_fkey" FOREIGN KEY ("scheme") REFERENCES "public"."place_identifier_schemes"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "jurisdiction_identifiers" ADD CONSTRAINT "jurisdiction_identifiers_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "jurisdiction_names" ADD CONSTRAINT "jurisdiction_names_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdictions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "jurisdiction_names" ADD CONSTRAINT "jurisdiction_names_used_by_id_fkey" FOREIGN KEY ("used_by_id") REFERENCES "public"."jurisdictions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "jurisdiction_names" ADD CONSTRAINT "jurisdiction_names_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "jurisdiction_relations" ADD CONSTRAINT "jurisdiction_relations_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "public"."jurisdictions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "jurisdiction_relations" ADD CONSTRAINT "jurisdiction_relations_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "public"."jurisdictions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "jurisdiction_relations" ADD CONSTRAINT "jurisdiction_relations_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "jurisdictions" ADD CONSTRAINT "jurisdictions_country_pack_fkey" FOREIGN KEY ("country_pack") REFERENCES "public"."place_country_packs"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "jurisdictions" ADD CONSTRAINT "jurisdictions_level_fkey" FOREIGN KEY ("country_pack","level_key") REFERENCES "public"."place_levels"("pack_key","key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "jurisdictions" ADD CONSTRAINT "jurisdictions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "place_import_runs" ADD CONSTRAINT "place_import_runs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "place_levels" ADD CONSTRAINT "place_levels_pack_key_fkey" FOREIGN KEY ("pack_key") REFERENCES "public"."place_country_packs"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "area_assertions_area_id_idx" ON "area_assertions" USING btree ("area_id");--> statement-breakpoint
CREATE INDEX "area_assertions_jurisdiction_id_idx" ON "area_assertions" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "facts_jurisdiction_id_metric_key_valid_from_idx" ON "facts" USING btree ("jurisdiction_id","metric_key","valid_from");--> statement-breakpoint
CREATE UNIQUE INDEX "facts_one_current_per_key" ON "facts" USING btree ("jurisdiction_id","metric_key",coalesce("variant", ''),"valid_from") WHERE "facts"."superseded_at" IS NULL;--> statement-breakpoint
CREATE INDEX "instruments_jurisdiction_id_idx" ON "instruments" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jurisdiction_identifiers_scheme_value_valid_from_key" ON "jurisdiction_identifiers" USING btree ("scheme","value",coalesce("valid_from", '-infinity'::date)) WHERE "jurisdiction_identifiers"."superseded_at" IS NULL;--> statement-breakpoint
CREATE INDEX "jurisdiction_identifiers_jurisdiction_id_idx" ON "jurisdiction_identifiers" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "jurisdiction_names_jurisdiction_id_idx" ON "jurisdiction_names" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jurisdiction_relations_one_current_parent" ON "jurisdiction_relations" USING btree ("from_id") WHERE "jurisdiction_relations"."relation" = 'part_of' AND "jurisdiction_relations"."valid_to" IS NULL AND "jurisdiction_relations"."superseded_at" IS NULL;--> statement-breakpoint
CREATE INDEX "jurisdiction_relations_from_id_relation_idx" ON "jurisdiction_relations" USING btree ("from_id","relation");--> statement-breakpoint
CREATE INDEX "jurisdiction_relations_to_id_relation_idx" ON "jurisdiction_relations" USING btree ("to_id","relation");--> statement-breakpoint
CREATE UNIQUE INDEX "jurisdictions_organization_id_key" ON "jurisdictions" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jurisdictions_slug_path_key" ON "jurisdictions" USING btree ("slug_path");--> statement-breakpoint
CREATE INDEX "sources_source_key_retrieved_at_idx" ON "sources" USING btree ("source_key","retrieved_at");--> statement-breakpoint
-- A reserved scheme (a state's statistics code, ISO 3166) on a founded or
-- proposed place would let anyone impersonate a state. The database refuses it.
CREATE FUNCTION "places_refuse_reserved_identifier"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "place_identifier_schemes" s, "jurisdictions" j
    WHERE s."key" = NEW."scheme" AND s."reserved"
      AND j."id" = NEW."jurisdiction_id" AND j."origin" <> 'state'
  ) THEN
    RAISE EXCEPTION 'identifier scheme % is reserved for state authorities', NEW."scheme"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "jurisdiction_identifiers_reserved_scheme"
  BEFORE INSERT OR UPDATE ON "jurisdiction_identifiers"
  FOR EACH ROW EXECUTE FUNCTION "places_refuse_reserved_identifier"();--> statement-breakpoint
-- Where a place comes from is what it is. A state row never becomes founded,
-- which would also slip its reserved identifiers past the trigger above.
CREATE FUNCTION "places_refuse_origin_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."origin" IS DISTINCT FROM OLD."origin" THEN
    RAISE EXCEPTION 'a jurisdiction''s origin never changes (% -> %)', OLD."origin", NEW."origin"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "jurisdictions_origin_is_permanent"
  BEFORE UPDATE OF "origin" ON "jurisdictions"
  FOR EACH ROW EXECUTE FUNCTION "places_refuse_origin_change"();--> statement-breakpoint
-- Time is a dimension, not an update: a row ends or is superseded, never removed.
CREATE FUNCTION "places_refuse_delete"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% rows are never deleted; end them (valid_to) or supersede them', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "place_country_packs_no_delete" BEFORE DELETE ON "place_country_packs" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE TRIGGER "place_levels_no_delete" BEFORE DELETE ON "place_levels" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE TRIGGER "place_metrics_no_delete" BEFORE DELETE ON "place_metrics" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE TRIGGER "place_identifier_schemes_no_delete" BEFORE DELETE ON "place_identifier_schemes" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE TRIGGER "place_instrument_kinds_no_delete" BEFORE DELETE ON "place_instrument_kinds" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE TRIGGER "place_config_syncs_no_delete" BEFORE DELETE ON "place_config_syncs" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE TRIGGER "place_import_runs_no_delete" BEFORE DELETE ON "place_import_runs" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE TRIGGER "sources_no_delete" BEFORE DELETE ON "sources" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE TRIGGER "jurisdictions_no_delete" BEFORE DELETE ON "jurisdictions" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE TRIGGER "jurisdiction_names_no_delete" BEFORE DELETE ON "jurisdiction_names" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE TRIGGER "jurisdiction_identifiers_no_delete" BEFORE DELETE ON "jurisdiction_identifiers" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE TRIGGER "areas_no_delete" BEFORE DELETE ON "areas" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE TRIGGER "area_assertions_no_delete" BEFORE DELETE ON "area_assertions" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE TRIGGER "jurisdiction_relations_no_delete" BEFORE DELETE ON "jurisdiction_relations" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE TRIGGER "facts_no_delete" BEFORE DELETE ON "facts" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE TRIGGER "instruments_no_delete" BEFORE DELETE ON "instruments" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();
