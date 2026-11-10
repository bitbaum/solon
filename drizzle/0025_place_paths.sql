-- Every path a place's page has ever had, so a link keeps working after a name
-- or a form changes: one canonical path per target, the rest answer with a
-- redirect to it. A path points at a jurisdiction or at an area (an area page,
-- such as land with several claimants and no authority of its own, lives in the
-- same /places namespace), never both, and the primary key makes a path unique
-- across the two. Rows are never deleted; only `canonical` may change.
CREATE TABLE "place_paths" (
  "path" text PRIMARY KEY NOT NULL,
  "jurisdiction_id" text,
  "area_id" text,
  "canonical" boolean NOT NULL,
  "recorded_at" timestamp (3) DEFAULT now() NOT NULL,
  CONSTRAINT "place_paths_one_target" CHECK (("jurisdiction_id" IS NULL) <> ("area_id" IS NULL)),
  CONSTRAINT "place_paths_shape" CHECK ("path" ~ '^[^/]+(/[^/]+)*$')
);--> statement-breakpoint
ALTER TABLE "place_paths" ADD CONSTRAINT "place_paths_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "place_paths" ADD CONSTRAINT "place_paths_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "place_paths_one_canonical_jurisdiction" ON "place_paths" ("jurisdiction_id") WHERE "canonical" AND "jurisdiction_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "place_paths_one_canonical_area" ON "place_paths" ("area_id") WHERE "canonical" AND "area_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "place_paths_jurisdiction_id_idx" ON "place_paths" ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "place_paths_area_id_idx" ON "place_paths" ("area_id");--> statement-breakpoint
CREATE TRIGGER "place_paths_no_delete" BEFORE DELETE ON "place_paths" FOR EACH ROW EXECUTE FUNCTION "places_refuse_delete"();--> statement-breakpoint
CREATE FUNCTION "place_paths_only_canonical_changes"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.path IS DISTINCT FROM OLD.path
     OR NEW.jurisdiction_id IS DISTINCT FROM OLD.jurisdiction_id
     OR NEW.area_id IS DISTINCT FROM OLD.area_id THEN
    RAISE EXCEPTION 'a place path never moves to another place; add a path and make it canonical'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "place_paths_target_is_permanent" BEFORE UPDATE ON "place_paths" FOR EACH ROW EXECUTE FUNCTION "place_paths_only_canonical_changes"();--> statement-breakpoint
-- Backfill. The canonical form writes the pack's root segment with hyphens
-- (united_states becomes united-states); the path a place has today stays as a
-- path that redirects to it. `jurisdictions.slug_path` is unchanged here: pages
-- keep reading it until they are moved onto this table.
INSERT INTO "place_paths" ("path", "jurisdiction_id", "canonical")
SELECT replace(split_part(j.slug_path, '/', 1), '_', '-') || substr(j.slug_path, length(split_part(j.slug_path, '/', 1)) + 1),
       j.id, true
FROM "jurisdictions" j
WHERE j.slug_path IS NOT NULL;--> statement-breakpoint
INSERT INTO "place_paths" ("path", "jurisdiction_id", "canonical")
SELECT j.slug_path, j.id, false
FROM "jurisdictions" j
WHERE j.slug_path IS NOT NULL
  AND j.slug_path <> replace(split_part(j.slug_path, '/', 1), '_', '-') || substr(j.slug_path, length(split_part(j.slug_path, '/', 1)) + 1);

--> statement-breakpoint
-- From now on every state place gets its paths when it is recorded, whatever
-- writes it: the canonical form (the pack's root segment with hyphens), and the
-- path it was recorded under when that differs, as a path that redirects.
CREATE FUNCTION "place_paths_record"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  root text := split_part(NEW.slug_path, '/', 1);
  canonical text;
BEGIN
  IF NEW.slug_path IS NULL THEN
    RETURN NEW;
  END IF;
  canonical := replace(root, '_', '-') || substr(NEW.slug_path, length(root) + 1);
  INSERT INTO "place_paths" ("path", "jurisdiction_id", "canonical") VALUES (canonical, NEW.id, true);
  IF canonical <> NEW.slug_path THEN
    INSERT INTO "place_paths" ("path", "jurisdiction_id", "canonical") VALUES (NEW.slug_path, NEW.id, false);
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "jurisdictions_record_paths" AFTER INSERT ON "jurisdictions" FOR EACH ROW EXECUTE FUNCTION "place_paths_record"();
