import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  AuditEventType,
  DecisionBody,
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
  organizations,
  policies,
  proposals,
  votes,
  votingSessions,
} from "@/lib/db/schema";
import { verifyMessage, voteMessage } from "@/lib/bitcoin/message";
import { VOTING_WINDOW_DAYS } from "@/lib/config/governance";
import { electorateFor, profileFor, ruleFor } from "@/lib/config/governance-profiles";
import { isMandateLive, mandateEnd, resolveDecisionBody } from "@/lib/domain/mandate";
import { parseEffect } from "@/lib/domain/effects";
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
import { proofOf, voterRef, type Actor } from "@/lib/domain/proof";

export interface SubmitVoteInput {
  /** Who is voting and how they prove it — see lib/domain/proof. */
  by: Actor;
  /** The ballot in the shape this session's method admits. */
  ballot: unknown;
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
  const inElectorate = await db
    .select({
      id: members.id,
      votingWeight: members.votingWeight,
      holdsMandate: members.holdsMandate,
      mandateUntil: members.mandateUntil,
    })
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
  // Who within the electorate decides: the profile's rule, unless it names the
  // mandate holders and none holds a live mandate — then the members decide.
  const now = new Date();
  const holders = inElectorate.filter((m) => isMandateLive(m, now));
  const { decidedBy, fellBack } = resolveDecisionBody(rule.decidedBy, holders.length);
  const eligible = decidedBy === DecisionBody.MANDATE ? holders : inElectorate;
  const mandateRoll = decidedBy === DecisionBody.MANDATE ? eligible.map((m) => m.id) : null;
  if (eligible.length === 0) {
    throw new Error(
      "no eligible members — a session with an empty electorate cannot decide anything",
    );
  }
  const eligibleWeight = eligible.reduce((s, m) => s + Number(m.votingWeight), 0);

  const closesAt = new Date(now);
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
        decidedBy,
        mandateRoll,
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
        decidedBy,
        ...(fellBack
          ? {
              mandateFallback:
                "the profile gives this category to mandate holders and none holds a live mandate, so the members decide",
            }
          : {}),
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
 * Cast a vote, or change one: until the session closes, a member's latest
 * ballot is the one that counts.
 *
 * Two ways to prove the vote is yours, resolved to a seat without trusting any
 * claim the caller makes:
 * - key: a Bitcoin signature; the voter is whoever the signature recovers to.
 *   It covers the ballot's canonical encoding, not merely the fact that a
 *   ballot was cast — change one number in transit and it no longer verifies.
 * - account: the voter is the seat held by the signed-in OrangeCat identity
 *   (the actor id comes from the server session). Humans only; agents sign.
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
  const by = input.by;
  if (by.via === "key") {
    const signed = voteMessage({ sessionId, choice: canonical, memberAddress: by.address });
    const verification = verifyMessage(signed, by.address, by.signature);
    if (!verification.valid) {
      return {
        stored: false,
        verified: false,
        reason: verification.reason ?? "signature does not match address",
        recoveredAddress: verification.recoveredAddress,
      };
    }
  }

  const member = await db.query.members.findFirst({
    where: and(
      eq(members.organizationId, session.proposal.organizationId),
      by.via === "key" ? eq(members.bitcoinAddress, by.address) : eq(members.ocActorId, by.actorId),
      eq(members.status, MemberStatus.ACTIVE),
    ),
  });
  if (!member) {
    return {
      stored: false,
      verified: true,
      reason:
        by.via === "key"
          ? "address is not an active member of this organization"
          : "you do not hold a seat in this organization",
    };
  }
  if (by.via === "account" && member.memberType !== MemberType.HUMAN) {
    return { stored: false, verified: true, reason: "agent members vote with their key" };
  }
  const message = voteMessage({ sessionId, choice: canonical, memberAddress: voterRef(member) });
  const proof = proofOf(by);
  const signature = by.via === "key" ? by.signature : null;
  if (session.electorate === Electorate.HUMANS_ONLY && member.memberType !== MemberType.HUMAN) {
    return {
      stored: false,
      verified: true,
      reason: "this session's electorate is humans-only; agent members cannot vote here",
    };
  }

  if (session.decidedBy === DecisionBody.MANDATE) {
    const roll = Array.isArray(session.mandateRoll) ? (session.mandateRoll as unknown[]) : [];
    if (!roll.includes(member.id)) {
      return {
        stored: false,
        verified: true,
        reason:
          "this decision belongs to the mandate holders, and your seat did not hold a mandate when it opened",
      };
    }
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
        proof,
        signature,
      })
      // A changed vote replaces the earlier ballot entirely — including the
      // weight, which is re-read at the moment of the change.
      .onConflictDoUpdate({
        target: [votes.sessionId, votes.memberId],
        set: {
          ballot: ballotJson,
          weight: member.votingWeight,
          signedMessage: message,
          proof,
          signature,
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
        proof,
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

    if (decision.outcome === SessionOutcome.APPROVED) {
      await applyEffect(tx, session.proposal, sessionId);
    }

    return { session: closed, outcome: decision.outcome, aggregate, tally: tallyOf(aggregate) };
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Carry out what an approved proposal says it does — inside the closing
 * transaction, so a decision and its consequence land together or not at all.
 *
 * The effect was validated and paired with its category when the proposal was
 * filed; it is re-parsed here because a stored row is data, not a promise.
 */
async function applyEffect(
  tx: Tx,
  proposal: { id: string; organizationId: string; effect: unknown },
  sessionId: string,
) {
  const parsed = parseEffect(proposal.effect);
  if (!parsed.ok || parsed.effect === null) return;
  const effect = parsed.effect;
  const organizationId = proposal.organizationId;

  if (effect.kind === "profile") {
    const org = await tx.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });
    if (!org) return;
    await tx
      .update(organizations)
      .set({ governanceProfile: effect.profile })
      .where(eq(organizations.id, organizationId));
    await tx.insert(auditEvents).values({
      organizationId,
      eventType: AuditEventType.PROFILE_CHANGED,
      subjectType: "organization",
      subjectId: organizationId,
      payload: {
        from: org.governanceProfile,
        to: effect.profile,
        approvedBySessionId: sessionId,
        proposalId: proposal.id,
      },
    });
    return;
  }

  const member = await tx.query.members.findFirst({
    where: and(eq(members.id, effect.memberId), eq(members.organizationId, organizationId)),
  });
  // Filed against a seat that has since gone: nothing to change, and the
  // closed session already records what was decided.
  if (!member) return;
  const org = await tx.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });
  const now = new Date();
  const until = effect.grant
    ? mandateEnd(
        effect.until ? new Date(effect.until) : null,
        profileFor(org?.governanceProfile).mandateTermDays,
        now,
      )
    : null;
  await tx
    .update(members)
    .set({ holdsMandate: effect.grant, mandateUntil: until })
    .where(eq(members.id, member.id));
  await tx.insert(auditEvents).values({
    organizationId,
    eventType: AuditEventType.MANDATE_CHANGED,
    subjectType: "member",
    subjectId: member.id,
    payload: {
      grant: effect.grant,
      until: until?.toISOString() ?? null,
      approvedBySessionId: sessionId,
      proposalId: proposal.id,
    },
  });
}
