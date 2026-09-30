import { describe, expect, it } from "vitest";
import { AUDIT_EVENT_TYPES } from "@/lib/db/enums";
import { EVENT_LABEL, eventGloss } from "../event-gloss";

describe("eventGloss", () => {
  it("names every event type", () => {
    for (const type of AUDIT_EVENT_TYPES) expect(EVENT_LABEL[type]).toBeTruthy();
  });

  it("reads each event in plain words, never as stored codes", () => {
    const cases: [Parameters<typeof eventGloss>[0], unknown, string][] = [
      ["ORG_CREATED", { name: "OrangeCat", slug: "orangecat" }, "OrangeCat was founded."],
      [
        "MEMBER_ADDED",
        { displayName: "The Cat", memberType: "AGENT" },
        "The Cat joined as an AI agent.",
      ],
      [
        "MEMBER_ADDED",
        { displayName: "George", memberType: "HUMAN", genesis: true },
        "George joined as a person, taking the founding seat.",
      ],
      [
        "PROPOSAL_CREATED",
        { title: "Buy a Velo", category: "TREASURY_SPEND", memberType: "HUMAN" },
        "“Buy a Velo” (Spending money), suggested by a person.",
      ],
      [
        "SESSION_OPENED",
        { electorate: "HUMANS_ONLY", closesAt: "2026-10-07T12:00:00Z" },
        "Only people can vote on this, not AI agents. Voting ends on 2026-10-07.",
      ],
      ["VOTE_CAST", { memberType: "AGENT", weight: 1 }, "An AI agent voted."],
      [
        "VOTE_CAST",
        { memberType: "HUMAN", weight: 2 },
        "A person voted; their vote counts 2 times.",
      ],
      ["SESSION_CLOSED", { outcome: "APPROVED" }, "Agreed."],
      ["SESSION_CLOSED", { outcome: "EXPIRED" }, "Ended without enough votes."],
      [
        "POLICY_ACTIVATED",
        { key: "originator_share", version: 1 },
        "Version 1 of the “originator share” rules now apply.",
      ],
      ["MANDATE_CHANGED", { grant: false }, "A member no longer decides on the group's behalf."],
    ];
    for (const [type, payload, expected] of cases) {
      const gloss = eventGloss(type, payload);
      expect(gloss).toBe(expected);
      expect(gloss).not.toMatch(/\b[A-Z]+_[A-Z_]+\b/);
    }
  });

  it("says nothing rather than something wrong when an old payload lacks the fields", () => {
    expect(eventGloss("SESSION_CLOSED", { outcome: "SOMETHING_NEW" })).toBeNull();
    expect(eventGloss("PROPOSAL_CREATED", {})).toBeNull();
    expect(eventGloss("SESSION_OPENED", { threshold: "SIMPLE_MAJORITY" })).toBeNull();
    expect(eventGloss("MEMBER_STATUS_CHANGED", { status: "SUSPENDED" })).toBeNull();
    expect(eventGloss("ORG_CREATED", null)).toBeNull();
  });
});
