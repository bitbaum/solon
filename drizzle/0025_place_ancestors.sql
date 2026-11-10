-- Where every place sits, as a table to join: each state place, and each
-- place it is part of today, with how many steps up (0 is the place itself).
-- Derived from the current `part_of` relations and rebuilt by the importer at
-- the end of every applied run, so it cannot drift and nothing in it is
-- written by hand or deleted. History still uses the recursive query in
-- src/lib/places/chain.ts.
CREATE MATERIALIZED VIEW "place_ancestors" AS
WITH RECURSIVE up (place_id, ancestor_id, depth) AS (
  SELECT j.id, j.id, 0
  FROM "jurisdictions" j
  WHERE j.origin = 'state'
  UNION ALL
  SELECT u.place_id, r.to_id, u.depth + 1
  FROM up u
  JOIN "jurisdiction_relations" r ON r.from_id = u.ancestor_id
  WHERE r.relation = 'part_of'
    AND r.superseded_at IS NULL
    AND (r.valid_from IS NULL OR r.valid_from <= CURRENT_DATE)
    AND (r.valid_to IS NULL OR r.valid_to > CURRENT_DATE)
    AND u.depth < 32
)
SELECT place_id, ancestor_id, depth FROM up;--> statement-breakpoint
CREATE UNIQUE INDEX "place_ancestors_place_id_ancestor_id_key" ON "place_ancestors" ("place_id", "ancestor_id");--> statement-breakpoint
CREATE INDEX "place_ancestors_ancestor_id_depth_idx" ON "place_ancestors" ("ancestor_id", "depth");
