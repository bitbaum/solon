import { describe, expect, it } from "vitest";
import { shapeMemberPage, type CastBallot, type FiledProposal } from "../member-page";

const member = (showBallots: boolean) =>
  ({
    id: "m1",
    organizationId: "o1",
    displayName: "Cato",
    showBallots,
  }) as Parameters<typeof shapeMemberPage>[0]["member"];

const proposal = (id: string, status: string): FiledProposal => ({
  id,
  title: `Proposal ${id}`,
  category: "GENERAL",
  status,
  createdAt: new Date("2026-10-01"),
});

const ballot = (id: string): CastBallot => ({
  proposalId: id,
  title: `Proposal ${id}`,
  ballot: "yes",
  castAt: new Date("2026-10-02"),
});

describe("shapeMemberPage", () => {
  it("keeps ballots back by default, but still says how many votes were cast", () => {
    const page = shapeMemberPage({
      member: member(false),
      proposals: [],
      closedBallots: [ballot("a"), ballot("b")],
    });
    expect(page.ballots).toBeNull();
    expect(page.votesCast).toBe(2);
  });

  it("lists each ballot when the member chose to show them", () => {
    const page = shapeMemberPage({
      member: member(true),
      proposals: [],
      closedBallots: [ballot("a")],
    });
    expect(page.ballots).toEqual([ballot("a")]);
  });

  it("tells 'shown, none cast' apart from 'kept private'", () => {
    expect(
      shapeMemberPage({ member: member(true), proposals: [], closedBallots: [] }).ballots,
    ).toEqual([]);
    expect(
      shapeMemberPage({ member: member(false), proposals: [], closedBallots: [] }).ballots,
    ).toBeNull();
  });

  it("never lists a draft as a filed proposal", () => {
    const page = shapeMemberPage({
      member: member(false),
      proposals: [proposal("d", "DRAFT"), proposal("o", "OPEN"), proposal("c", "CLOSED")],
      closedBallots: [],
    });
    expect(page.filed.map((p) => p.id)).toEqual(["o", "c"]);
  });
});
