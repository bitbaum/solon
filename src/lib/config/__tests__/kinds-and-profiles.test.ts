import { describe, expect, it } from "vitest";
import { COLLECTIVE_KINDS, COLLECTIVE_KIND_IDS } from "@/lib/collective-kinds";
import {
  GOVERNANCE_PROFILE_IDS,
  KIND_DEFAULT_PROFILE,
  defaultProfileForKind,
} from "../governance-profiles";
import { SOLON_CAPABILITIES } from "../capabilities";
import { SITE_LINKS } from "@/lib/site-config";
import { bodyProblem } from "@/lib/domain/organization-rules";
import { parseOrangeCatGroup } from "@/lib/orangecat-group";

/**
 * The kind of body and the way it decides are two axes joined by one table.
 * A kind added to the shared list without a row here fails the build (the
 * Record type) — and here, so the failure names the kind.
 */
describe("every kind of body has a suggested way of deciding", () => {
  it("covers the shared kind list exactly", () => {
    expect(Object.keys(KIND_DEFAULT_PROFILE).sort()).toEqual([...COLLECTIVE_KIND_IDS].sort());
    for (const id of COLLECTIVE_KIND_IDS) {
      expect(GOVERNANCE_PROFILE_IDS).toContain(defaultProfileForKind(id));
    }
  });

  it("pairs the obvious ones", () => {
    expect(defaultProfileForKind("association")).toBe("ASSOCIATION");
    expect(defaultProfileForKind("town")).toBe("TOWN");
    expect(defaultProfileForKind("company")).toBe("COMPANY");
  });
});

describe("bodyProblem — what the founder says the body is", () => {
  it("lets a circle be nowhere in particular", () => {
    expect(bodyProblem({ kind: "circle" })).toBeNull();
  });

  it("refuses a town without a place, naming the first missing field", () => {
    expect(bodyProblem({ kind: "town" })).toMatch(/^a town belongs to a place — give the country/);
    expect(
      bodyProblem({ kind: "local_fund", place: { country_code: "CH", region: "Zürich" } }),
    ).toMatch(/locality/);
  });

  it("checks a place anyone volunteers, even for a kind that needs none", () => {
    expect(bodyProblem({ kind: "association", place: { locality: "Witikon" } })).toMatch(/country/);
    expect(
      bodyProblem({
        kind: "association",
        place: { country_code: "ch", region: "Zürich", locality: "Witikon" },
      }),
    ).toBeNull();
  });

  it("holds the legal line: no evidence, no status; no tax-exempt company", () => {
    expect(bodyProblem({ kind: "association", legal: { status: "registered" } })).toMatch(
      /legal form/,
    );
    expect(
      bodyProblem({
        kind: "company",
        legal: {
          status: "tax_exempt",
          legal_form: "GmbH",
          jurisdiction: "CH",
          register_id: "CHE-1",
          recognised_on: "2026-01-01",
        },
      }),
    ).toMatch(/cannot be recognised as tax-exempt/);
  });

  it("refuses a word that is not a kind", () => {
    expect(bodyProblem({ kind: "nonprofit" })).toMatch(/kinds of body/);
  });
});

describe("the OrangeCat binding answer", () => {
  const good = {
    data: {
      id: "g1",
      slug: "witikon-fund",
      name: "Witikon Fund",
      label: "local_fund",
      place: { country_code: "CH", region: "Zürich", locality: "Witikon" },
      owner_actor_id: "actor-1",
    },
  };

  it("is accepted only when it names an owner and a known kind", () => {
    expect(parseOrangeCatGroup(good)?.ownerActorId).toBe("actor-1");
    expect(parseOrangeCatGroup(good)?.kind).toBe("local_fund");
    expect(parseOrangeCatGroup({ data: { ...good.data, owner_actor_id: undefined } })).toBeNull();
    expect(parseOrangeCatGroup({ data: { ...good.data, label: "nonprofit" } })).toBeNull();
  });

  it("drops a half-written place rather than keeping half of it", () => {
    expect(
      parseOrangeCatGroup({ data: { ...good.data, place: { locality: "Witikon" } } })?.place,
    ).toBeNull();
  });
});

describe("the map", () => {
  it("starts every capability at a page that exists in the site map or the app", () => {
    const known = new Set([
      ...SITE_LINKS.map((l) => l.href),
      "/orgs/new",
      "/propose",
      "/join",
      "/dashboard/voting",
      "/governance/audit",
      "/treasury/bitcoin",
      "/hire",
    ]);
    for (const c of SOLON_CAPABILITIES) {
      expect(known.has(c.startHref), `${c.id} → ${c.startHref}`).toBe(true);
      expect(c.steps).toHaveLength(3);
    }
    expect(new Set(SOLON_CAPABILITIES.map((c) => c.verb)).size).toBe(SOLON_CAPABILITIES.length);
  });

  it("names every kind of body the founding form offers", () => {
    const found = SOLON_CAPABILITIES.find((c) => c.id === "found")!;
    for (const kind of Object.values(COLLECTIVE_KINDS)) {
      expect(found.what.toLowerCase()).toContain(kind.name.toLowerCase());
    }
  });
});
