import {
  AuditEventType,
  Electorate,
  MemberStatus,
  MemberType,
  PolicyStatus,
  Prisma,
  ProposalStatus,
  SessionOutcome,
  SessionStatus,
  VoteChoice,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyMessage, voteMessage } from "@/lib/bitcoin/message";
import {
  CATEGORY_ELECTORATE,
  CATEGORY_QUORUM_PERCENT,
  CATEGORY_THRESHOLD,
  VOTING_WINDOW_DAYS,
} from "@/lib/config/governance";
import { tally, decideOutcome, type Tally } from "@/lib/domain/tally";

export interface SubmitVoteInput {
  address: string;
  choice: "yes" | "no" | "abstain";
  signature: string;
}

export interface SubmitVoteResult {
  stored: boolean;
  verified: boolean;
  reason?: string;
  recoveredAddress?: string;
  tally?: Tally;
  voteId?: string;
}

const CHOICE_MAP: Record<SubmitVoteInput["choice"], VoteChoice> = {
  yes: VoteChoice.YES,
  no: VoteChoice.NO,
  abstain: VoteChoice.ABSTAIN,
};

/**
 * Open the voting session for a DRAFT proposal. The rules — electorate,
 * threshold, quorum, eligibility — are resolved from config and the member
 * roll ONCE, here, and snapshotted onto the session. The gate runs at open,
 * not after a week of voting.
 */
export async function openSession(proposalId: string) {
  const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
  if (!proposal) throw new Error("proposal not found");
  if (proposal.status !== ProposalStatus.DRAFT) {
    throw new Error(`proposal is ${proposal.status}, only DRAFT proposals can open`);
  }

  const electorate = CATEGORY_ELECTORATE[proposal.category];
  const eligible = await prisma.member.findMany({
    where: {
      organizationId: proposal.organizationId,
      status: MemberStatus.ACTIVE,
      ...(electorate === Electorate.HUMANS_ONLY ? { memberType: MemberType.HUMAN } : {}),
    },
    select: { votingWeight: true },
  });
  if (eligible.length === 0) {
    throw new Error("no eligible members — a session with an empty electorate cannot decide anything");
  }
  const eligibleWeight = eligible.reduce((s, m) => s + Number(m.votingWeight), 0);

  const closesAt = new Date();
  closesAt.setDate(closesAt.getDate() + VOTING_WINDOW_DAYS);

  const session = await prisma.$transaction(async (tx) => {
    const s = await tx.votingSession.create({
      data: {
        proposalId,
        status: SessionStatus.ACTIVE,
        closesAt,
        electorate,
        threshold: CATEGORY_THRESHOLD[proposal.category],
        quorumPercent: CATEGORY_QUORUM_PERCENT[proposal.category],
        eligibleCount: eligible.length,
        eligibleWeight: new Prisma.Decimal(eligibleWeight.toFixed(2)),
      },
    });
    await tx.proposal.update({
      where: { id: proposalId },
      data: { status: ProposalStatus.OPEN },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: proposal.organizationId,
        eventType: AuditEventType.SESSION_OPENED,
        subjectType: "voting_session",
        subjectId: s.id,
        payload: {
          proposalId,
          electorate,
          threshold: CATEGORY_THRESHOLD[proposal.category],
          quorumPercent: CATEGORY_QUORUM_PERCENT[proposal.category],
          eligibleCount: eligible.length,
          eligibleWeight,
          closesAt: closesAt.toISOString(),
        },
      },
    });
    return s;
  });
  return session;
}

/**
 * Cast a vote. The Bitcoin signature is the authorization: the voter is
 * resolved by the address the signature recovers to — never by any claim the
 * caller makes. Electorate rules snapshotted at open are enforced here.
 */
export async function submitVote(sessionId: string, input: SubmitVoteInput): Promise<SubmitVoteResult> {
  const message = voteMessage({ sessionId, choice: input.choice, memberAddress: input.address });
  const verification = verifyMessage(message, input.address, input.signature);
  if (!verification.valid) {
    return {
      stored: false,
      verified: false,
      reason: verification.reason ?? "signature does not match address",
      recoveredAddress: verification.recoveredAddress,
    };
  }

  const session = await prisma.votingSession.findUnique({
    where: { id: sessionId },
    include: { proposal: true },
  });
  if (!session) return { stored: false, verified: true, reason: "voting session not found" };
  if (session.status !== SessionStatus.ACTIVE) {
    return { stored: false, verified: true, reason: `voting session is ${session.status}` };
  }
  if (new Date() > session.closesAt) {
    return { stored: false, verified: true, reason: "voting window has closed" };
  }

  const member = await prisma.member.findFirst({
    where: {
      organizationId: session.proposal.organizationId,
      bitcoinAddress: input.address,
      status: MemberStatus.ACTIVE,
    },
  });
  if (!member) {
    return { stored: false, verified: true, reason: "address is not an active member of this organization" };
  }
  if (session.electorate === Electorate.HUMANS_ONLY && member.memberType !== MemberType.HUMAN) {
    return {
      stored: false,
      verified: true,
      reason: "this session's electorate is humans-only; agent members cannot vote here",
    };
  }

  const choice = CHOICE_MAP[input.choice];
  const vote = await prisma.$transaction(async (tx) => {
    const v = await tx.vote.upsert({
      where: { sessionId_memberId: { sessionId, memberId: member.id } },
      create: {
        sessionId,
        memberId: member.id,
        choice,
        weight: member.votingWeight,
        signedMessage: message,
        signature: input.signature,
      },
      update: { choice, signedMessage: message, signature: input.signature, createdAt: new Date() },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: session.proposal.organizationId,
        eventType: AuditEventType.VOTE_CAST,
        actorMemberId: member.id,
        subjectType: "vote",
        subjectId: v.id,
        payload: { sessionId, memberType: member.memberType, weight: Number(member.votingWeight) },
      },
    });
    return v;
  });

  return { stored: true, verified: true, tally: await sessionTally(sessionId), voteId: vote.id };
}

/** Weighted tally over stored (already-verified) votes in a session. */
export async function sessionTally(sessionId: string): Promise<Tally> {
  const votes = await prisma.vote.findMany({
    where: { sessionId },
    select: { choice: true, weight: true },
  });
  return tally(votes.map((v) => ({ choice: v.choice, weight: Number(v.weight) })));
}

/**
 * Close a session: outcome from the snapshotted rules; on APPROVED policy
 * proposals, activate the next policy version — the ONLY code path that can
 * create an active policy version with a session reference.
 */
export async function closeSession(sessionId: string) {
  const session = await prisma.votingSession.findUnique({
    where: { id: sessionId },
    include: { proposal: true },
  });
  if (!session) throw new Error("voting session not found");
  if (session.status !== SessionStatus.ACTIVE) throw new Error(`session already ${session.status}`);

  const t = await sessionTally(sessionId);
  const outcome = decideOutcome({
    tally: t,
    threshold: session.threshold,
    quorumPercent: session.quorumPercent,
    eligibleWeight: Number(session.eligibleWeight),
  });

  return prisma.$transaction(async (tx) => {
    const closed = await tx.votingSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.CLOSED, outcome, closedAt: new Date() },
    });
    await tx.proposal.update({
      where: { id: session.proposalId },
      data: { status: ProposalStatus.CLOSED },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: session.proposal.organizationId,
        eventType: AuditEventType.SESSION_CLOSED,
        subjectType: "voting_session",
        subjectId: sessionId,
        payload: { outcome, tally: { ...t } },
      },
    });

    const policyKey = session.proposal.policyKey;
    if (
      outcome === SessionOutcome.APPROVED &&
      policyKey !== null &&
      session.proposal.proposedContent !== null
    ) {
      const organizationId = session.proposal.organizationId;
      const current = await tx.policy.findFirst({
        where: { organizationId, key: policyKey, status: PolicyStatus.ACTIVE },
        orderBy: { version: "desc" },
      });
      const nextVersion = (current?.version ?? 0) + 1;
      if (current) {
        await tx.policy.update({
          where: { id: current.id },
          data: { status: PolicyStatus.SUPERSEDED },
        });
      }
      const activated = await tx.policy.create({
        data: {
          organizationId,
          key: policyKey,
          version: nextVersion,
          content: session.proposal.proposedContent as Prisma.InputJsonValue,
          status: PolicyStatus.ACTIVE,
          approvedBySessionId: sessionId,
        },
      });
      await tx.auditEvent.create({
        data: {
          organizationId,
          eventType: AuditEventType.POLICY_ACTIVATED,
          subjectType: "policy",
          subjectId: activated.id,
          payload: { key: policyKey, version: nextVersion, approvedBySessionId: sessionId },
        },
      });
    }

    return { session: closed, outcome, tally: t };
  });
}
