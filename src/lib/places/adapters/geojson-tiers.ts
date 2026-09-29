/**
 * Subdivisions published as GeoJSON features, one feature per smallest unit,
 * each carrying the codes and names of every tier above it (a city's quarters
 * with their district on each quarter). Format only: which properties hold
 * which tier, and the place the top tier belongs to, are the source's
 * `options`. Geometry is not read yet; areas come with the map.
 */
import { z } from "zod";
import type { BatchJurisdiction, BatchRelation, ExternalRef } from "../importer/batch";
import type { Adapter } from "./types";

const property = z.union([z.string(), z.number()]).nullable();
const featureCollection = z.object({
  type: z.literal("FeatureCollection"),
  features: z
    .array(z.object({ type: z.literal("Feature"), properties: z.record(z.string(), property) }))
    .min(1),
});
type FeatureCollection = z.infer<typeof featureCollection>;

const tiersOptions = z.object({
  /** Where to fetch the collection; absent when it is handed in as a file. */
  url: z.url().optional(),
  /** The place the top tier is part of. */
  parent: z.object({ scheme: z.string().min(1), value: z.string().min(1) }),
  /** The locale the names are published in. */
  locale: z.string().min(2),
  /** From the top tier down: the level it becomes, its scheme, and the properties holding code and name. */
  tiers: z
    .array(
      z.object({
        level: z.string().min(1),
        scheme: z.string().min(1),
        code: z.string().min(1),
        name: z.string().min(1),
      }),
    )
    .min(1),
});
type TiersOptions = z.infer<typeof tiersOptions>;

export const geojsonTiersAdapter: Adapter<FeatureCollection, TiersOptions> = {
  key: "geojson_tiers",
  version: "1",
  schema: featureCollection,
  options: tiersOptions,
  retrievals: (options) => (options.url ? [{ url: options.url }] : []),
  map: (collection, { pack, options }) => {
    if (!pack) {
      throw new Error("subdivisions map into a pack; the source names none");
    }
    const places = new Map<string, BatchJurisdiction>();
    const relations = new Map<string, BatchRelation>();
    for (const [i, feature] of collection.features.entries()) {
      let above: ExternalRef = options.parent;
      for (const tier of options.tiers) {
        const code = feature.properties[tier.code];
        const name = feature.properties[tier.name];
        if (code === null || code === undefined || typeof name !== "string" || name === "") {
          throw new Error(`feature ${i}: no ${tier.code} / ${tier.name} for ${tier.level}`);
        }
        const ref = { scheme: tier.scheme, value: String(code) };
        const key = `${ref.scheme}:${ref.value}`;
        if (!places.has(key)) {
          places.set(key, {
            ref,
            levelKey: tier.level,
            identifiers: [],
            names: [
              {
                locale: options.locale,
                script: null,
                name,
                nameType: "self",
                usedBy: null,
                validFrom: null,
                validTo: null,
              },
            ],
            validFrom: null,
            validTo: null,
          });
        }
        const relation = relations.get(key);
        if (
          relation &&
          `${relation.to.scheme}:${relation.to.value}` !== `${above.scheme}:${above.value}`
        ) {
          throw new Error(`${key} is listed under two different parents`);
        }
        relations.set(key, {
          from: ref,
          to: above,
          relation: "part_of",
          validFrom: null,
          validTo: null,
        });
        above = ref;
      }
    }
    return {
      pack: pack.key,
      jurisdictions: [...places.values()],
      relations: [...relations.values()],
      facts: [],
    };
  },
};
