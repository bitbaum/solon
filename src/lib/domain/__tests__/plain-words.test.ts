import { describe, expect, it } from "vitest";
import { DECISION_CATEGORIES } from "@/lib/db/enums";
import { CATEGORY_LABEL, DEFAULT_HUMANS_ONLY_CATEGORIES } from "@/lib/config/governance";
import { agentSuffrage, proposalStanding, votingRules } from "../plain-words";

describe("plain words", () => {
  it("names every category without its stored form", () => {
    for (const category of DECISION_CATEGORIES) {
      expect(CATEGORY_LABEL[category]).not.toMatch(/_|[A-Z]{2,}/);
    }
  });

  it("says where a proposal stands, the outcome first", () => {
    expect(proposalStanding("DRAFT")).toBe("Draft, not voted on yet");
    expect(proposalStanding("OPEN")).toBe("Voting now");
    expect(proposalStanding("CLOSED", "APPROVED")).toBe("Agreed");
    expect(proposalStanding("CLOSED", "EXPIRED")).toBe("Ended without enough votes");
  });

  it("states a vote's rules as a sentence", () => {
    expect(
      votingRules({ threshold: "SUPERMAJORITY", quorumPercent: 50, electorate: "HUMANS_ONLY" }),
    ).toBe(
      "Only people vote, not AI agents; at least 50% of them must take part, and two thirds must agree.",
    );
    expect(
      votingRules({ threshold: "SIMPLE_MAJORITY", quorumPercent: 20, electorate: "ALL_MEMBERS" }),
    ).toMatch(/^All members vote; .*more than half must agree\.$/);
  });

  it("says where an organization's agents vote, from its own list", () => {
    expect(agentSuffrage(DEFAULT_HUMANS_ONLY_CATEGORIES)).toBe(
      "Only people vote, not AI agents, on: help for a person, who is a member, safety, the rules.",
    );
    expect(agentSuffrage([])).toBe("AI agent members vote on every decision.");
  });
});
