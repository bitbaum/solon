import { describe, expect, it } from "vitest";
import { feature } from "topojson-client";
import world from "world-atlas/countries-50m.json";
import {
  choose,
  createFocus,
  cameraFor,
  cameraForBounds,
  type MapFeature,
} from "@bitbaum/geo-kit/map";
import type { Drawn } from "@/components/places/drawn";
import { ATLAS_LIMITS } from "../atlas-canvas";
import {
  BEYOND,
  COUNTRY_ZOOM,
  SUB,
  focusCamera,
  focusChildren,
  focusParent,
  type FocusInputs,
} from "../focus-tree";

const countries = (
  feature(
    world as never,
    (world as never as { objects: { countries: never } }).objects.countries,
  ) as unknown as {
    features: { id: string; geometry: MapFeature["geometry"] }[];
  }
).features;
const outline = (n3: string): MapFeature => {
  const f = countries.find((c) => c.id === n3)!;
  return { id: `countries:${n3}`, geometry: f.geometry, properties: {} };
};
const LI = outline("438");
const US = outline("840");
const HOME = { center: [8, 40] as [number, number], k: 1 };

/** A drawn level with the given places, each a box (their real extent is not what is under test). */
const drawnOf = (boxes: Record<string, [number, number, number, number]>): Drawn => {
  const areas = new Map(
    Object.entries(boxes).map(([code, b]) => [
      code,
      {
        bounds: b,
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [b[0], b[1]],
              [b[2], b[1]],
              [b[2], b[3]],
              [b[0], b[3]],
              [b[0], b[1]],
            ],
          ],
        },
      },
    ]),
  );
  const all = [...areas.values()].map((a) => a.bounds);
  return {
    features: { type: "FeatureCollection", features: [] },
    bounds: [
      Math.min(...all.map((b) => b[0])),
      Math.min(...all.map((b) => b[1])),
      Math.max(...all.map((b) => b[2])),
      Math.max(...all.map((b) => b[3])),
    ],
    areas: areas as Drawn["areas"],
  };
};

const tree = (t: FocusInputs) => ({
  home: HOME,
  cameraOf: (id: string) => focusCamera(t, id),
  childrenOf: (id: string) => focusChildren(t, id),
  parentOf: (id: string) => focusParent(t, id),
});

describe("the atlas focus tree", () => {
  it("Liechtenstein: a commune is framed by its own outline, with the country faint round it", () => {
    const t: FocusInputs = {
      world: new Map([[LI.id, LI]]),
      country: LI.id,
      drawn: drawnOf({ vaduz: [9.5, 47.1, 9.56, 47.2], balzers: [9.48, 47.04, 9.53, 47.09] }),
    };
    const view = choose(tree(t), `${SUB}vaduz`);
    expect(view.selected).toBe(`${SUB}vaduz`);
    expect(view.camera).toEqual(cameraForBounds([9.5, 47.1, 9.56, 47.2], ATLAS_LIMITS, 0.6));
    expect(view.context).toEqual([LI.id]);
    // The country itself is framed as the country, with every commune its children.
    const country = choose(tree(t), LI.id);
    expect(country.camera).toEqual(cameraFor(LI.geometry, ATLAS_LIMITS, COUNTRY_ZOOM));
    expect(country.children).toEqual([`${SUB}vaduz`, `${SUB}balzers`]);
    expect(country.context).toEqual([]);
  });

  it("Wyoming: a country with only one state's counties drawn is framed whole, never by them", () => {
    const wyoming: [number, number, number, number] = [-111.06, 40.99, -104.05, 45.0];
    const t: FocusInputs = {
      world: new Map([[US.id, US]]),
      country: US.id,
      drawn: drawnOf({ "56001": wyoming }),
    };
    const view = choose(tree(t), US.id);
    expect(view.camera).toEqual(cameraFor(US.geometry, ATLAS_LIMITS, COUNTRY_ZOOM));
    expect(view.camera).not.toEqual(cameraForBounds(t.drawn!.bounds, ATLAS_LIMITS, 0.9));
    expect(view.camera!.k).toBeLessThan(cameraForBounds(wyoming, ATLAS_LIMITS, 0.9).k);
    expect(view.selected).toBe(US.id);
    expect(view.outline).toBe(US.id);
    // Choosing the county frames the county, and the country is its context.
    const county = choose(tree(t), `${SUB}56001`);
    expect(county.camera).toEqual(cameraForBounds(wyoming, ATLAS_LIMITS, 0.6));
    expect(county.context).toEqual([US.id]);
  });

  it("South Ossetia: a place with only a dot is chosen without jumping elsewhere", () => {
    const id = `${BEYOND}south-ossetia`;
    const t: FocusInputs = {
      world: new Map([[US.id, US]]),
      country: null,
      drawn: null,
    };
    const view = createFocus(tree(t)).choose(id);
    expect(focusCamera(t, id)).toBeNull();
    expect(view.selected).toBe(id);
    // geo-kit's rule: no outline and nothing inside it, so the map stays where it is.
    expect(view.camera).toBeNull();
    expect(view.children).toEqual([]);
    expect(view.context).toEqual([]);
  });

  it("choosing nothing returns to the world", () => {
    const t: FocusInputs = { world: new Map(), country: null, drawn: null };
    const view = choose(tree(t), null);
    expect(view.selected).toBeNull();
    expect(view.camera).toEqual(HOME);
  });
});
