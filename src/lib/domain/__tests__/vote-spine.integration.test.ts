/**
 * Full vote-spine acceptance against a real database: propose → open → vote →
 * close → policy activation, plus every gate on the way (agent transport auth,
 * electorate rules, early-close refusal, quorum).
 *
 * Runs only with INTEGRATION=1 and a DATABASE_URL whose schema is migrated
 * (CI: postgres service container + `prisma migrate deploy` — which also
 * proves the migrations replay on a fresh database). Plain `npm test` skips it.
 */
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  AuditEventType,
  DecisionCategory,
  PolicyStatus,
  SessionOutcome,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  generateKeyPair,
  proposalMessage,
  signMessage,
  verifyMessage,
  voteMessage,
} from "@/lib/bitcoin/message";
import { contentHashOf, sha256Hex } from "@/lib/domain/canonical";
import { decisionDocument } from "@/lib/domain/decision";
import { createProposal } from "@/lib/domain/proposals";
import { closeSession, openSession, submitVote } from "@/lib/domain/voting";

const RUN = process.env.INTEGRATION === "1";

describe.runIf(RUN)("vote spine (database integration)", () => {
  it("carries a policy proposal from signature to activated version", async () => {
    const slug = `it-${randomUUID().slice(0, 8)}`;
    const org = await prisma.organization.create({
      data: { slug, name: "Integration Test Org" },
    });
    // Bootstrap policy v1 — the version the vote will supersede.
    await prisma.policy.create({
      data: {
        organizationId: org.id,
        key: "allocation_policy",
        version: 1,
        content: { max_cat_daily_spend_btc: 0.001 },
        status: PolicyStatus.ACTIVE,
      },
    });

    const alice = generateKeyPair();
    const bob = generateKeyPair();
    const agent = generateKeyPair();
    for (const [name, pair, type, system] of [
      ["Alice", alice, "HUMAN", null],
      ["Bob", bob, "HUMAN", null],
      ["Cat", agent, "AGENT", "orangecat:cat"],
    ] as const) {
      await prisma.member.create({
        data: {
          organizationId: org.id,
          displayName: name,
          memberType: type,
          keyCustody: type === "HUMAN" ? "SELF" : "SERVICE",
          bitcoinAddress: pair.address,
          publicKeyHex: pair.publicKeyHex,
          system,
        },
      });
    }

    // --- Propose (agent, with content binding and transport auth) ---
    const proposedContent = { max_cat_daily_spend_btc: 0.002, max_cat_btc_per_action: 0.0005 };
    const contentHash = contentHashOf(proposedContent);
    const base = {
      orgSlug: slug,
      category: DecisionCategory.ALLOCATION_POLICY,
      title: "Raise the Cat's ceiling",
      body: "Double the daily ceiling.",
      policyKey: "allocation_policy",
      proposedContent,
      proposerAddress: agent.address,
      signature: signMessage(
        proposalMessage({
          orgSlug: slug,
          category: DecisionCategory.ALLOCATION_POLICY,
          title: "Raise the Cat's ceiling",
          proposerAddress: agent.address,
          contentHash,
        }),
        agent.privateKeyHex,
      ),
    };

    // Agent without its API key: signature verifies, transport refused.
    const noKey = await createProposal(base);
    expect(noKey).toMatchObject({ created: false, verified: true });
    expect(noKey.reason).toMatch(/API key/);

    const agentMember = await prisma.member.findFirstOrThrow({
      where: { organizationId: org.id, bitcoinAddress: agent.address },
    });
    const apiKey = `sk_solon_test_${randomUUID()}`;
    await prisma.agentApiKey.create({ data: { memberId: agentMember.id, keyHash: sha256Hex(apiKey) } });

    const filed = await createProposal({ ...base, apiKey });
    expect(filed.created).toBe(true);
    expect(filed.contentHash).toBe(contentHash);
    const proposalId = filed.proposalId!;

    // --- Open: rules snapshotted, all 3 members eligible ---
    const session = await openSession(proposalId);
    expect(session.electorate).toBe("ALL_MEMBERS");
    expect(session.eligibleCount).toBe(3);

    // --- Vote: two humans + the agent, each with their own signature ---
    const cast = async (pair: typeof alice, choice: "yes" | "no" | "abstain") =>
      submitVote(session.id, {
        address: pair.address,
        choice,
        signature: signMessage(
          voteMessage({ sessionId: session.id, choice, memberAddress: pair.address }),
          pair.privateKeyHex,
        ),
      });

    expect((await cast(alice, "yes")).stored).toBe(true);
    expect((await cast(agent, "yes")).stored).toBe(true);

    // --- Early close refused while the window is open and a voter is missing ---
    await expect(closeSession(session.id)).rejects.toThrow(/voting window is open/);

    const bobVote = await cast(bob, "no");
    expect(bobVote.stored).toBe(true);
    expect(bobVote.tally).toEqual({ yes: 2, no: 1, abstain: 0 });

    // --- Close: full participation allows closing early; 2:1 approves ---
    const closed = await closeSession(session.id);
    expect(closed.outcome).toBe(SessionOutcome.APPROVED);

    // --- Policy v2 exists, references the session, v1 superseded ---
    const v2 = await prisma.policy.findUniqueOrThrow({
      where: { organizationId_key_version: { organizationId: org.id, key: "allocation_policy", version: 2 } },
    });
    expect(v2.status).toBe(PolicyStatus.ACTIVE);
    expect(v2.approvedBySessionId).toBe(session.id);
    expect(v2.content).toEqual(proposedContent);
    const v1 = await prisma.policy.findUniqueOrThrow({
      where: { organizationId_key_version: { organizationId: org.id, key: "allocation_policy", version: 1 } },
    });
    expect(v1.status).toBe(PolicyStatus.SUPERSEDED);

    // --- The decision document self-verifies, the way a consumer would ---
    const doc = await decisionDocument(session.id);
    if (!doc.found || !doc.finalized) throw new Error("decision document missing after close");
    const d = doc.document;
    expect(d.outcome).toBe(SessionOutcome.APPROVED);
    expect(d.proposal.contentHash).toBe(contentHash);
    expect(contentHashOf(d.proposal.proposedContent)).toBe(d.proposal.contentHash);
    expect(
      verifyMessage(d.proposal.proposerMessage, d.proposal.proposer.bitcoinAddress, d.proposal.proposerSignature)
        .valid,
    ).toBe(true);
    expect(d.votes).toHaveLength(3);
    for (const v of d.votes) {
      expect(verifyMessage(v.signedMessage, v.member.bitcoinAddress, v.signature).valid).toBe(true);
      // The signed message must bind THIS session and THIS voter.
      expect(v.signedMessage).toContain(`session:${session.id}`);
      expect(v.signedMessage).toContain(`voter:${v.member.bitcoinAddress}`);
    }
    // Recompute the tally from the votes — never trust the server's arithmetic.
    const recomputed = d.votes.reduce(
      (t, v) => ({ ...t, [v.choice.toLowerCase()]: t[v.choice.toLowerCase() as "yes" | "no" | "abstain"] + v.weight }),
      { yes: 0, no: 0, abstain: 0 },
    );
    expect(recomputed).toEqual(d.tally);

    // --- The audit trail recorded every step ---
    const events = await prisma.auditEvent.findMany({
      where: { organizationId: org.id },
      select: { eventType: true },
    });
    const types = events.map((e) => e.eventType);
    for (const expected of [
      AuditEventType.PROPOSAL_CREATED,
      AuditEventType.SESSION_OPENED,
      AuditEventType.VOTE_CAST,
      AuditEventType.SESSION_CLOSED,
      AuditEventType.POLICY_ACTIVATED,
    ]) {
      expect(types).toContain(expected);
    }
  });

  it("keeps agents out of HUMANS_ONLY sessions", async () => {
    const slug = `it-${randomUUID().slice(0, 8)}`;
    const org = await prisma.organization.create({ data: { slug, name: "Humans Only Org" } });
    const human = generateKeyPair();
    const agent = generateKeyPair();
    for (const [name, pair, type] of [
      ["Human", human, "HUMAN"],
      ["Agent", agent, "AGENT"],
    ] as const) {
      await prisma.member.create({
        data: {
          organizationId: org.id,
          displayName: name,
          memberType: type,
          keyCustody: type === "HUMAN" ? "SELF" : "SERVICE",
          bitcoinAddress: pair.address,
          publicKeyHex: pair.publicKeyHex,
          system: type === "AGENT" ? "test:agent" : null,
        },
      });
    }

    const filed = await createProposal({
      orgSlug: slug,
      category: DecisionCategory.MEMBERSHIP,
      title: "Admit a new member",
      body: "Roster change — humans only.",
      proposerAddress: human.address,
      signature: signMessage(
        proposalMessage({
          orgSlug: slug,
          category: DecisionCategory.MEMBERSHIP,
          title: "Admit a new member",
          proposerAddress: human.address,
        }),
        human.privateKeyHex,
      ),
    });
    expect(filed.created).toBe(true);

    const session = await openSession(filed.proposalId!);
    expect(session.electorate).toBe("HUMANS_ONLY");
    expect(session.eligibleCount).toBe(1); // the agent is not in the electorate

    const agentVote = await submitVote(session.id, {
      address: agent.address,
      choice: "yes",
      signature: signMessage(
        voteMessage({ sessionId: session.id, choice: "yes", memberAddress: agent.address }),
        agent.privateKeyHex,
      ),
    });
    expect(agentVote).toMatchObject({ stored: false, verified: true });
    expect(agentVote.reason).toMatch(/humans-only/);
  });
});
