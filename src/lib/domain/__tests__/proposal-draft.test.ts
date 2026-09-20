import { describe, expect, it } from "vitest";
import { DecisionCategory } from "@/lib/db/enums";
import { CATEGORY_ELECTORATE, CATEGORY_THRESHOLD } from "@/lib/config/governance";
import {
  DEFAULT_CATEGORY,
  FILEABLE_CATEGORIES,
  categoryConsequence,
  draftFromQuery,
  proposeHref,
  rawQueryString,
} from "../proposal-draft";

describe("draftFromQuery — the OrangeCat button", () => {
  const query = {
    from: "orangecat",
    entity_type: "investment",
    entity_id: "9b2c",
    source: "/investments/9b2c",
    title: "Solar roof fund",
  };

  it("lands on a filled form: title, a body that names the entity, a link back", () => {
    const draft = draftFromQuery(query);
    expect(draft).not.toBeNull();
    expect(draft?.title).toBe("Solar roof fund");
    expect(draft?.origin?.url).toBe("https://orangecat.ch/investments/9b2c");
    expect(draft?.body).toContain("https://orangecat.ch/investments/9b2c");
  });

  it("defaults to the cheapest category when none is stated", () => {
    expect(draftFromQuery(query)?.category).toBe(DEFAULT_CATEGORY);
    expect(CATEGORY_ELECTORATE[DEFAULT_CATEGORY]).toBe("ALL_MEMBERS");
    expect(CATEGORY_THRESHOLD[DEFAULT_CATEGORY]).toBe("SIMPLE_MAJORITY");
  });

  it("honours a stated category only when a member could file it from the UI", () => {
    expect(draftFromQuery({ ...query, category: "SAFETY" })?.category).toBe("SAFETY");
    // Policy changes need a signed JSON body; the form cannot produce one.
    expect(draftFromQuery({ ...query, category: "ALLOCATION_POLICY" })?.category).toBe(
      DEFAULT_CATEGORY,
    );
    expect(draftFromQuery({ ...query, category: "nonsense" })?.category).toBe(DEFAULT_CATEGORY);
  });

  it("never links off OrangeCat: a source that is not a bare path is dropped", () => {
    for (const source of ["https://evil.example/x", "//evil.example/x", "investments/9b2c"]) {
      const draft = draftFromQuery({ ...query, source });
      expect(draft?.origin, source).toBeNull();
      expect(draft?.body, source).not.toContain("evil");
    }
  });

  it("still fills a title when the button sent none", () => {
    const draft = draftFromQuery({ ...query, title: undefined });
    expect(draft?.title.length).toBeGreaterThanOrEqual(3);
    expect(draft?.title).toContain("Investment");
  });

  it("clamps to the API's bounds so a pre-fill is always filable", () => {
    const draft = draftFromQuery({ ...query, title: "x".repeat(500) });
    expect(draft?.title.length).toBe(200);
  });
});

describe("draftFromQuery — a plain pre-fill (ratification links, Loki)", () => {
  it("is null when the query carries nothing, so the form opens blank as before", () => {
    expect(draftFromQuery({})).toBeNull();
    expect(draftFromQuery({ unrelated: "1" })).toBeNull();
  });

  it("reads title, body and category", () => {
    const draft = draftFromQuery({
      category: "GOVERNANCE_RULES",
      title: "Ratify: raise quorum",
      body: "See PR #12",
    });
    expect(draft).toEqual({
      category: "GOVERNANCE_RULES",
      title: "Ratify: raise quorum",
      body: "See PR #12",
      origin: null,
    });
  });
});

describe("the round trip", () => {
  it("survives sign-in and join: serialise, re-parse, same draft", () => {
    const q = { from: "orangecat", entity_type: "investment", source: "/i/1", title: "A & B" };
    const back = Object.fromEntries(new URLSearchParams(rawQueryString(q)));
    expect(draftFromQuery(back)).toEqual(draftFromQuery(q));
  });

  it("proposeHref produces a link draftFromQuery reads back", () => {
    const draft = { category: "SAFETY" as const, title: "Cap agent weight", body: "25%." };
    const href = proposeHref(draft);
    expect(href.startsWith("/propose?")).toBe(true);
    const back = Object.fromEntries(new URLSearchParams(href.slice("/propose?".length)));
    expect(draftFromQuery(back)).toEqual({ ...draft, origin: null });
  });
});

describe("categoryConsequence", () => {
  it("states electorate, bar and window for every fileable category, from the governance table", () => {
    for (const c of FILEABLE_CATEGORIES) {
      const line = categoryConsequence(c);
      expect(line, c).toMatch(/Humans only|All members vote/);
      expect(line, c).toMatch(/supermajority|simple majority/);
      expect(line, c).toMatch(/\d+ days/);
    }
    expect(categoryConsequence(DecisionCategory.GOVERNANCE_RULES)).toContain("Humans only");
    expect(categoryConsequence(DecisionCategory.OPERATIONS)).toContain("All members vote");
  });
});
