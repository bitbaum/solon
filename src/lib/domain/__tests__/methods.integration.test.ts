/**
 * The multi-option spine against a real database: a dot-allocation vote carried
 * from real Bitcoin signatures to a winning option, plus the tamper case that
 * the whole design exists to stop.
 *
 * Runs only with INTEGRATION=1 and a migrated DATABASE_URL. Plain `npm test`
 * skips it.
 */
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { DecisionCategory, SessionOutcome, VotingMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateKeyPair, signMessage, voteMessage } from "@/lib/bitcoin/message";
import { canonicalBallot } from "@/lib/domain/methods";
import { closeSession, openSession, submitVote } from "@/lib/domain/voting";

const RUN = process.env.INTEGRATION === "1";

const OPTIONS = [
  { key: "solar-roof", label: "Solar roof" },
  { key: "heat-pump", label: "Heat pump" },
  { key: "insulation", label: "Insulation" },
];

async function fixture() {
  const slug = `dot-${randomUUID().slice(0, 8)}`;
  const org = await prisma.organization.create({
    data: { slug, name: "Dot Vote Org", governanceProfile: "COOPERATIVE" },
  });
  const alice = generateKeyPair();
  const bob = generateKeyPair();
  const members: Record<string, string> = {};
  for (const [name, pair, weight] of [
    ["Alice", alice, 1],
    ["Bob", bob, 2],
  ] as const) {
    const m = await prisma.member.create({
      data: {
        organizationId: org.id,
        displayName: name,
        memberType: "HUMAN",
        keyCustody: "SELF",
        bitcoinAddress: pair.address,
        votingWeight: weight,
        status: "ACTIVE",
      },
    });
    members[name] = m.id;
  }
  const proposal = await prisma.proposal.create({
    data: {
      organizationId: org.id,
      category: DecisionCategory.ALLOCATION_POLICY,
      title: "How should we split the retrofit budget?",
      body: "Three candidate works.",
      method: VotingMethod.DOT,
      options: OPTIONS,
      proposerMemberId: members.Alice,
      proposerSignature: "sig",
      status: "DRAFT",
    },
  });
  return { org, alice, bob, proposal };
}

/** Sign a ballot the way a member's wallet would. */
function castable(sessionId: string, ballot: unknown, pair: ReturnType<typeof generateKeyPair>, dotBudget = 5) {
  const canonical = canonicalBallot("dot", ballot, { dotBudget });
  const message = voteMessage({ sessionId, choice: canonical, memberAddress: pair.address });
  return {
    address: pair.address,
    ballot,
    signature: signMessage(message, pair.privateKeyHex),
  };
}

describe.runIf(RUN)("dot allocation (database integration)", () => {
  it("carries a budget split from signatures to a winning option", async () => {
    const { alice, bob, proposal } = await fixture();

    const session = await openSession(proposal.id);
    expect(session.method).toBe(VotingMethod.DOT);
    expect(session.dotBudget).toBe(5);
    // Options were snapshotted onto the session, not merely referenced.
    expect(session.options).toEqual(OPTIONS);

    // Alice (weight 1) backs insulation; Bob (weight 2) backs the heat pump.
    const a = await submitVote(
      session.id,
      castable(session.id, { allocations: { insulation: 4, "solar-roof": 1 } }, alice),
    );
    expect(a.stored).toBe(true);

    const b = await submitVote(
      session.id,
      castable(session.id, { allocations: { "heat-pump": 3, "solar-roof": 2 } }, bob),
    );
    expect(b.stored).toBe(true);

    // heat-pump: 3 dots x weight 2 = 6. insulation: 4 x 1 = 4. solar: 1 + 4 = 5.
    const ranked = b.aggregate?.ranked ?? [];
    expect(ranked[0]).toMatchObject({ key: "heat-pump", score: 6 });
    expect(ranked.find((r) => r.key === "solar-roof")?.score).toBe(5);

    // A ranking has no yes/no view to offer, and says so rather than inventing one.
    expect(b.tally).toBeNull();

    const closed = await closeSession(session.id);
    expect(closed.outcome).toBe(SessionOutcome.APPROVED);
    expect(closed.session.winningOptionKey).toBe("heat-pump");
  });

  it("refuses a ballot altered after it was signed", async () => {
    const { alice, proposal } = await fixture();
    const session = await openSession(proposal.id);

    // Alice signs one allocation…
    const signed = castable(session.id, { allocations: { insulation: 5 } }, alice);
    // …and something rewrites it on the way to the server.
    const tampered = { ...signed, ballot: { allocations: { "solar-roof": 5 } } };

    const result = await submitVote(session.id, tampered);
    expect(result.stored).toBe(false);
    expect(result.verified).toBe(false);
    expect(await prisma.vote.count({ where: { sessionId: session.id } })).toBe(0);
  });

  it("refuses a ballot that overspends the budget, before any signature check", async () => {
    const { alice, proposal } = await fixture();
    const session = await openSession(proposal.id);

    const result = await submitVote(session.id, {
      address: alice.address,
      ballot: { allocations: { insulation: 4, "heat-pump": 4 } },
      signature: "irrelevant",
    });
    expect(result.stored).toBe(false);
    expect(result.reason).toContain("dots");
  });

  it("will not open a multi-option session without options to choose between", async () => {
    const { proposal } = await fixture();
    await prisma.proposal.update({ where: { id: proposal.id }, data: { options: [] } });
    await expect(openSession(proposal.id)).rejects.toThrow(/at least two options/);
  });
});
