import { prisma } from "@/lib/db";
import { verifyMessage, voteMessage, type VerifyResult } from "@/lib/bitcoin/message";
import { voteSessionIneligibility, weightedTally, type VoteChoice, type VoteTally } from "@/lib/solon/vote-policy";

export type { VoteChoice } from "@/lib/solon/vote-policy";

export interface SubmitVoteInput {
  /** Bitcoin address of the voting member (must be a registered member). */
  address: string;
  choice: VoteChoice;
  /** Base64 Bitcoin signed-message signature over the canonical vote message. */
  signature: string;
}

export interface SubmitVoteResult {
  stored: boolean;
  verified: boolean;
  failure?: 'invalid-signature' | 'ineligible';
  reason?: string;
  verification?: VerifyResult;
  tally?: VoteTally;
  voteId?: string;
}

/**
 * Cryptographic democracy: a vote counts only if its Bitcoin signature
 * verifies against the member's address. No authority is trusted — the
 * signature is the authorization. Invalid signatures are never stored.
 */
export class Democracy {
  async submitVote(sessionId: string, input: SubmitVoteInput): Promise<SubmitVoteResult> {
    const session = await prisma.voting_sessions.findUnique({ where: { id: sessionId } });
    if (!session) return { stored: false, verified: false, failure: 'ineligible', reason: 'voting session not found' };
    const sessionIneligibility = voteSessionIneligibility(session);
    if (sessionIneligibility) {
      return { stored: false, verified: false, failure: 'ineligible', reason: sessionIneligibility };
    }

    // Reject ineligible addresses before performing public-key recovery. The
    // subsequent signature check proves control of this exact registered
    // address; a caller cannot authorize a vote by merely claiming it.
    const member = await prisma.members.findUnique({
      where: {
        organization_id_bitcoin_address: {
          organization_id: session.organization_id,
          bitcoin_address: input.address,
        },
      },
    });
    if (!member || member.status !== 'active') {
      return { stored: false, verified: false, failure: 'ineligible', reason: 'address is not an active member of this organization' };
    }

    const message = voteMessage({ sessionId, choice: input.choice, memberAddress: input.address });
    const verification = verifyMessage(message, input.address, input.signature);
    if (!verification.valid) {
      return {
        stored: false,
        verified: false,
        failure: 'invalid-signature',
        reason: verification.reason ?? 'signature does not match address',
        verification,
      };
    }

    const { vote, rows } = await prisma.$transaction(async (transaction) => {
      const storedVote = await transaction.votes.upsert({
        where: { voting_session_id_member_id: { voting_session_id: sessionId, member_id: member.id } },
        create: {
          voting_session_id: sessionId,
          member_id: member.id,
          vote_choice: input.choice,
          weight: member.voting_weight,
          bitcoin_signature: input.signature,
        },
        update: { vote_choice: input.choice, bitcoin_signature: input.signature, signed_at: new Date() },
      });
      const storedRows = await transaction.votes.findMany({ where: { voting_session_id: sessionId } });
      return { vote: storedVote, rows: storedRows };
    });

    const tally = weightedTally(rows);

    return { stored: true, verified: true, verification, tally, voteId: vote.id };
  }

  /** Weighted tally over all stored (already-verified) votes in a session. */
  async tally(sessionId: string): Promise<VoteTally> {
    const rows = await prisma.votes.findMany({ where: { voting_session_id: sessionId } });
    return weightedTally(rows);
  }
}
