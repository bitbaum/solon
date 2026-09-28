/**
 * The roadmap and changelog pages read the fleet map, never a local copy.
 * This pins the projection the page renders — from a fixture, no network —
 * and the request shape the map is asked with.
 */
import { describe, expect, it, vi } from "vitest";
import {
  FLEET_MAP_URL,
  FLEET_SLUG,
  MAP_REVALIDATE_SECONDS,
  loadSolonProfile,
  mapFetcher,
  mapRequestInit,
  solonProfileFromMap,
} from "@/lib/development-records";

const MAP = {
  generatedAt: "2026-09-28T00:00:00Z",
  projects: [
    { slug: "loki", name: "loki", roadmap: [], changelog: [] },
    {
      slug: "solon",
      name: "solon",
      what: "Governance any group can use.",
      roadmap: [
        {
          title: "Every organization on its own pages",
          status: "in progress",
          progress: 33,
          targetDate: null,
          milestones: [
            { title: "Anyone may found an organization", done: true },
            { title: "My Solon", done: false },
            { title: "Retire primaryOrg()", done: false },
          ],
          source: "https://github.com/bitbaum/solon/blob/main/ROADMAP.md",
        },
        {
          title: "Partner approval as a signed vote",
          status: "planned",
          progress: null,
          targetDate: "2026-Q4",
          milestones: ["A partner application files as a proposal"],
        },
      ],
      changelog: [
        { date: "2026-09-28", done: "Who decides: one person, everyone, or elected delegates." },
        { date: "2026-09-25", done: "Solon's own sign-up and sign-in." },
      ],
    },
  ],
};

describe("solonProfileFromMap", () => {
  it("projects Solon's records out of the fleet map", () => {
    const profile = solonProfileFromMap(MAP);
    expect(profile).not.toBeNull();
    expect(profile!.slug).toBe(FLEET_SLUG);
    expect(profile!.name).toBe("solon");
    expect(profile!.what).toBe("Governance any group can use.");
    expect(profile!.roadmap.map((r) => r.title)).toEqual([
      "Every organization on its own pages",
      "Partner approval as a signed vote",
    ]);
    expect(profile!.roadmap[0]).toMatchObject({
      status: "in progress",
      progress: 33,
      targetDate: null,
      source: "https://github.com/bitbaum/solon/blob/main/ROADMAP.md",
    });
    expect(profile!.roadmap[0].milestones).toEqual([
      { title: "Anyone may found an organization", done: true },
      { title: "My Solon", done: false },
      { title: "Retire primaryOrg()", done: false },
    ]);
    // Legacy string milestones and a verbatim target survive the projection.
    expect(profile!.roadmap[1]).toMatchObject({
      progress: null,
      targetDate: "2026-Q4",
      milestones: ["A partner application files as a proposal"],
      source: null,
    });
    expect(profile!.changelog).toEqual(MAP.projects[1].changelog);
  });

  it("is null when the map has no Solon, or is not a map", () => {
    expect(solonProfileFromMap({ projects: [{ slug: "loki", name: "loki" }] })).toBeNull();
    expect(solonProfileFromMap({ error: "down" })).toBeNull();
    expect(solonProfileFromMap(null)).toBeNull();
    expect(solonProfileFromMap("<html>")).toBeNull();
  });

  it("clamps a progress the producer got wrong", () => {
    const map = structuredClone(MAP);
    map.projects[1].roadmap[0].progress = 140;
    expect(solonProfileFromMap(map)!.roadmap[0].progress).toBe(100);
  });
});

describe("mapRequestInit", () => {
  it("asks Next to revalidate every five minutes instead of no-store, and bounds the wait", () => {
    const init = mapRequestInit({ cache: "no-store", signal: AbortSignal.timeout(1) });
    expect(init.next).toEqual({ revalidate: MAP_REVALIDATE_SECONDS });
    expect(MAP_REVALIDATE_SECONDS).toBe(300);
    expect("cache" in init).toBe(false);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal?.aborted).toBe(false);
  });
});

describe("loadSolonProfile", () => {
  it("fetches the fleet map with the revalidating fetcher and projects it", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(MAP), { status: 200 }));
    try {
      const profile = await loadSolonProfile();
      expect(profile?.roadmap).toHaveLength(2);
      expect(spy).toHaveBeenCalledTimes(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit & { next?: unknown }];
      expect(url).toBe(FLEET_MAP_URL);
      expect(init.next).toEqual({ revalidate: MAP_REVALIDATE_SECONDS });
      expect(init.cache).toBeUndefined();
    } finally {
      spy.mockRestore();
    }
  });

  it("is null, not an exception, when the map is unreachable", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    try {
      await expect(loadSolonProfile()).resolves.toBeNull();
      await expect(mapFetcher(FLEET_MAP_URL)).rejects.toThrow("fetch failed");
    } finally {
      spy.mockRestore();
    }
  });
});
