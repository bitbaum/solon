import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  AuditEventType,
  Electorate,
  MemberStatus,
  MemberType,
  PolicyStatus,
  ProposalStatus,
  SessionOutcome,
  SessionStatus,
  VotingMethod,
  auditEvents,
  members,
  policies,
  proposals,
  votes,
  votingSessions,
} from "@/lib/db/schema";
import { verifyMessage, voteMessage } from "@/lib/bitcoin/message";
import { VOTING_WINDOW_DAYS } from "@/lib/config/governance";
import { electorateFor, ruleFor } from "@/lib/config/governance-profiles";
import {
  aggregateBallots,
  canonicalBallot,
  methodSpec,
  parseBallot,
  DEFAULT_DOT_BUDGET,
} from "@/lib/domain/methods";
import { methodEnum, methodId } from "@/lib/domain/methods/db-enum";
import { optionsSchema, type Aggregate, type BallotOption } from "@/lib/domain/methods/types";
import { closeRefusal, decideOutcome, tallyOf, type Tally } from "@/lib/domain/tally";

export interface SubmitVoteInput {
  address: string;
  /** The ballot in the shape this session's method admits. */
  ballot: unknown;
  signature: string;
}

export interface SubmitVoteResult {
  stored: boolean;
  verified: boolean;
  reason?: string;
  recoveredAddress?: string;
  aggregate?: Aggregate;
  tally?: Tally | null;
  voteId?: string;
}

/** Options as stored on a proposal or session — validated on the way in and out. */
export function readOptions(raw: unknown): BallotOption[] {
  if (raw == null) return [];
  const parsed = optionsSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

/**
 * Open the voting session for a DRAFT proposal. The rules — method, options,
 * electorate, threshold, quorum, eligibility — are resolved from the
 * organization's governance profile and the member roll ONCE, here, and
 * snapshotted onto the session. The gate runs at open, not after a week of
 * voting, and a later edit to the profile cannot rewrite a decision already
 * taken under the old one.
 */
export async function openSession(proposalId: string) {
  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, proposalId),
    with: { organization: true },
  });
  if (!proposal) throw new Error("proposal not found");
  if (proposal.status !== ProposalStatus.DRAFT) {
    throw new Error(`proposal is ${proposal.status}, only DRAFT proposals can open`);
  }

  const rule = ruleFor(proposal.organization.governanceProfile, proposal.category);
  // A proposal may override the profile's method — a treasury split is a dot
  // vote whatever the house style — but never the electorate or the threshold.
  const method = proposal.method ?? methodEnum(rule.method);
  const spec = methodSpec(methodId(method));
  const options = readOptions(proposal.options);

  if (spec.needsOptions && options.length < 2) {
    throw new Error(
      `${spec.label} needs at least two options on the proposal; this one has ${options.length}`,
    );
  }

  const electorate = electorateFor(proposal.category);
  const eligible = await db
    .select({ votingWeight: members.votingWeight })
    .from(members)
    .where(
      and(
        eq(members.organizationId, proposal.organizationId),
        eq(members.status, MemberStatus.ACTIVE),
        ...(electorate === Electorate.HUMANS_ONLY
          ? [eq(members.memberType, MemberType.HUMAN)]
          : []),
      ),
    );
  if (eligible.length === 0) {
    throw new Error(
      "no eligible members — a session with an empty electorate cannot decide anything",
    );
  }
  const eligibleWeight = eligible.reduce((s, m) => s + Number(m.votingWeight), 0);

  const closesAt = new Date();
  closesAt.setDate(closesAt.getDate() + VOTING_WINDOW_DAYS);
  const dotBudget = method === VotingMethod.DOT ? DEFAULT_DOT_BUDGET : null;

  const session = await db.transaction(async (tx) => {
    const [s] = await tx
      .insert(votingSessions)
      .values({
        proposalId,
        status: SessionStatus.ACTIVE,
        closesAt,
        electorate,
        method,
        options: spec.needsOptions ? options : null,
        dotBudget,
        threshold: rule.threshold,
        quorumPercent: rule.quorumPercent,
        eligibleCount: eligible.length,
        eligibleWeight: eligibleWeight.toFixed(2),
      })
      .returning();
    await tx
      .update(proposals)
      .set({ status: ProposalStatus.OPEN })
      .where(eq(proposals.id, proposalId));
    await tx.insert(auditEvents).values({
      organizationId: proposal.organizationId,
      eventType: AuditEventType.SESSION_OPENED,
      subjectType: "voting_session",
      subjectId: s.id,
      payload: {
        proposalId,
        profile: proposal.organization.governanceProfile,
        method,
        options: options.map((o) => o.key),
        dotBudget,
        electorate,
        threshold: rule.threshold,
        quorumPercent: rule.quorumPercent,
        eligibleCount: eligible.length,
        eligibleWeight,
        closesAt: closesAt.toISOString(),
      },
    });
    return s;
  });
  return session;
}

/**
 * Cast a vote. The Bitcoin signature is the authorization: the voter is
 * resolved by the address the signature recovers to — never by any claim the
 * caller makes.
 *
 * The signature covers the ballot's canonical encoding, not merely the fact
 * that a ballot was cast. That is the property that lets a dot allocation or a
 * ranking be trusted end to end: change one number in transit and the message
 * no longer matches the signature.
 */
export async function submitVote(
  sessionId: string,
  input: SubmitVoteInput,
): Promise<SubmitVoteResult> {
  const session = await db.query.votingSessions.findFirst({
    where: eq(votingSessions.id, sessionId),
    with: { proposal: true },
  });
  if (!session) return { stored: false, verified: false, reason: "voting session not found" };
  if (session.status !== SessionStatus.ACTIVE) {
    return { stored: false, verified: false, reason: `voting session is ${session.status}` };
  }
  if (new Date() > session.closesAt) {
    return { stored: false, verified: false, reason: "voting window has closed" };
  }

  const options = readOptions(session.options);
  const params = { dotBudget: session.dotBudget };
  const parsed = parseBallot(methodId(session.method), input.ballot, options, params);
  if (!parsed.ok) {
    return { stored: false, verified: false, reason: parsed.error };
  }

  const canonical = canonicalBallot(methodId(session.method), parsed.ballot, params);
  const message = voteMessage({ sessionId, choice: canonical, memberAddress: input.address });
  const verification = verifyMessage(message, input.address, input.signature);
  if (!verification.valid) {
    return {
      stored: false,
      verified: false,
      reason: verification.reason ?? "signature does not match address",
      recoveredAddress: verification.recoveredAddress,
    };
  }

  const member = await db.query.members.findFirst({
    where: and(
      eq(members.organizationId, session.proposal.organizationId),
      eq(members.bitcoinAddress, input.address),
      eq(members.status, MemberStatus.ACTIVE),
    ),
  });
  if (!member) {
    return {
      stored: false,
      verified: true,
      reason: "address is not an active member of this organization",
    };
  }
  if (session.electorate === Electorate.HUMANS_ONLY && member.memberType !== MemberType.HUMAN) {
    return {
      stored: false,
      verified: true,
      reason: "this session's electorate is humans-only; agent members cannot vote here",
    };
  }

  const ballotJson = parsed.ballot;
  const vote = await db.transaction(async (tx) => {
    const [v] = await tx
      .insert(votes)
      .values({
        sessionId,
        memberId: member.id,
        ballot: ballotJson,
        weight: member.votingWeight,
        signedMessage: message,
        signature: input.signature,
      })
      .onConflictDoUpdate({
        target: [votes.sessionId, votes.memberId],
        set: {
          ballot: ballotJson,
          signedMessage: message,
          signature: input.signature,
          createdAt: new Date(),
        },
      })
      .returning();
    await tx.insert(auditEvents).values({
      organizationId: session.proposal.organizationId,
      eventType: AuditEventType.VOTE_CAST,
      actorMemberId: member.id,
      subjectType: "vote",
      subjectId: v.id,
      payload: {
        sessionId,
        method: session.method,
        memberType: member.memberType,
        weight: Number(member.votingWeight),
      },
    });
    return v;
  });

  const aggregate = await sessionAggregate(sessionId);
  return { stored: true, verified: true, aggregate, tally: tallyOf(aggregate), voteId: vote.id };
}

/** Weighted aggregate over stored (already-verified) ballots in a session. */
export async function sessionAggregate(sessionId: string): Promise<Aggregate> {
  const session = await db.query.votingSessions.findFirst({
    where: eq(votingSessions.id, sessionId),
    columns: { method: true, options: true, dotBudget: true },
  });
  if (!session) throw new Error("voting session not found");
  const stored = await db
    .select({ ballot: votes.ballot, weight: votes.weight })
    .from(votes)
    .where(eq(votes.sessionId, sessionId));
  return aggregateBallots(
    methodId(session.method),
    stored.map((v) => ({ ballot: v.ballot, weight: Number(v.weight) })),
    readOptions(session.options),
    { dotBudget: session.dotBudget },
  );
}

/** Backwards-compatible yes/no/abstain view. Null for ranking methods. */
export async function sessionTally(sessionId: string): Promise<Tally | null> {
  return tallyOf(await sessionAggregate(sessionId));
}

/**
 * Close a session: outcome from the snapshotted rules; on APPROVED policy
 * proposals, activate the next policy version — the ONLY code path that can
 * create an active policy version with a session reference.
 */
export async function closeSession(sessionId: string) {
  const session = await db.query.votingSessions.findFirst({
    where: eq(votingSessions.id, sessionId),
    with: { proposal: true },
  });
  if (!session) throw new Error("voting session not found");
  if (session.status !== SessionStatus.ACTIVE) throw new Error(`session already ${session.status}`);

  const [{ votesCast }] = await db
    .select({ votesCast: count() })
    .from(votes)
    .where(eq(votes.sessionId, sessionId));
  const refusal = closeRefusal({
    now: new Date(),
    closesAt: session.closesAt,
    votesCast,
    eligibleCount: session.eligibleCount,
  });
  if (refusal) throw new Error(refusal);

  const aggregate = await sessionAggregate(sessionId);
  const decision = decideOutcome({
    aggregate,
    threshold: session.threshold,
    quorumPercent: session.quorumPercent,
    eligibleWeight: Number(session.eligibleWeight),
  });

  return db.transaction(async (tx) => {
    const [closed] = await tx
      .update(votingSessions)
      .set({
        status: SessionStatus.CLOSED,
        outcome: decision.outcome,
        winningOptionKey: decision.winningOptionKey,
        closedAt: new Date(),
      })
      .where(eq(votingSessions.id, sessionId))
      .returning();
    await tx
      .update(proposals)
      .set({ status: ProposalStatus.CLOSED })
      .where(eq(proposals.id, session.proposalId));
    await tx.insert(auditEvents).values({
      organizationId: session.proposal.organizationId,
      eventType: AuditEventType.SESSION_CLOSED,
      subjectType: "voting_session",
      subjectId: sessionId,
      payload: {
        outcome: decision.outcome,
        winningOptionKey: decision.winningOptionKey,
        method: session.method,
        aggregate,
      },
    });

    const policyKey = session.proposal.policyKey;
    if (
      decision.outcome === SessionOutcome.APPROVED &&
      policyKey !== null &&
      session.proposal.proposedContent !== null
    ) {
      const organizationId = session.proposal.organizationId;
      const current = await tx.query.policies.findFirst({
        where: and(
          eq(policies.organizationId, organizationId),
          eq(policies.key, policyKey),
          eq(policies.status, PolicyStatus.ACTIVE),
        ),
        orderBy: desc(policies.version),
      });
      const nextVersion = (current?.version ?? 0) + 1;
      if (current) {
        await tx
          .update(policies)
          .set({ status: PolicyStatus.SUPERSEDED })
          .where(eq(policies.id, current.id));
      }
      const [activated] = await tx
        .insert(policies)
        .values({
          organizationId,
          key: policyKey,
          version: nextVersion,
          content: session.proposal.proposedContent,
          status: PolicyStatus.ACTIVE,
          approvedBySessionId: sessionId,
        })
        .returning();
      await tx.insert(auditEvents).values({
        organizationId,
        eventType: AuditEventType.POLICY_ACTIVATED,
        subjectType: "policy",
        subjectId: activated.id,
        payload: { key: policyKey, version: nextVersion, approvedBySessionId: sessionId },
      });
    }

    return { session: closed, outcome: decision.outcome, aggregate, tally: tallyOf(aggregate) };
  });
}
