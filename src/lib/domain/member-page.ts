/**
 * What a reader may learn about one member from their page.
 *
 * Always shown: the seat (type, status, joined), whether it holds a mandate,
 * the proposals the member filed (a draft is not filed yet, so it is not
 * listed), and HOW MANY votes they cast in decisions that have closed.
 *
 * Shown only when the member turns it on: each ballot. A closed session
 * publishes its ballots anyway, so this is not a secret; it is a profile — one
 * person's every vote, gathered under their name — and that is theirs to make
 * (`members.showBallots`, set on their account page, off by default).
 *
 * Never shown: a ballot in a session that is still open. Seeing how a
 * colleague voted before the window closes is how a vote stops being a
 * judgement and becomes a reaction.
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { members, proposals, votes, votingSessions } from "@/lib/db/schema";
import { canonicalBallot } from "@/lib/domain/methods";
import { methodId } from "@/lib/domain/methods/db-enum";

type Member = typeof members.$inferSelect;
type VotingMethod = (typeof votingSessions.$inferSelect)["method"];

export interface FiledProposal {
  id: string;
  title: string;
  category: string;
  status: string;
  createdAt: Date;
}

export interface CastBallot {
  proposalId: string;
  title: string;
  /** The ballot's canonical text — the same words the vote was signed over. */
  ballot: string;
  castAt: Date;
}

export interface MemberPage {
  member: Member;
  filed: FiledProposal[];
  votesCast: number;
  /**
   * null = the member keeps their ballots to themselves (say so, do not show
   * an empty list); [] = they chose to show them and have cast none yet.
   */
  ballots: CastBallot[] | null;
}

/** Pure: what the reader is given, from what the database holds. */
export function shapeMemberPage(input: {
  member: Member;
  proposals: FiledProposal[];
  /** Votes in CLOSED sessions only — the loader never passes an open one. */
  closedBallots: CastBallot[];
}): MemberPage {
  return {
    member: input.member,
    filed: input.proposals.filter((p) => p.status !== "DRAFT"),
    votesCast: input.closedBallots.length,
    ballots: input.member.showBallots ? input.closedBallots : null,
  };
}

/** One member of one organization, or null when the pair does not exist. */
export async function loadMemberPage(
  organizationId: string,
  memberId: string,
): Promise<MemberPage | null> {
  const member = await db.query.members.findFirst({
    where: and(eq(members.id, memberId), eq(members.organizationId, organizationId)),
  });
  if (!member) return null;

  const [filed, cast] = await Promise.all([
    db.query.proposals.findMany({
      where: and(
        eq(proposals.proposerMemberId, member.id),
        eq(proposals.organizationId, organizationId),
      ),
      orderBy: desc(proposals.createdAt),
      columns: { id: true, title: true, category: true, status: true, createdAt: true },
    }),
    db
      .select({
        proposalId: proposals.id,
        title: proposals.title,
        ballot: votes.ballot,
        method: votingSessions.method,
        dotBudget: votingSessions.dotBudget,
        castAt: votes.createdAt,
      })
      .from(votes)
      .innerJoin(votingSessions, eq(votes.sessionId, votingSessions.id))
      .innerJoin(proposals, eq(votingSessions.proposalId, proposals.id))
      .where(and(eq(votes.memberId, member.id), eq(votingSessions.status, "CLOSED")))
      .orderBy(desc(votes.createdAt)),
  ]);

  return shapeMemberPage({
    member,
    proposals: filed,
    closedBallots: cast.map((row) => ({
      proposalId: row.proposalId,
      title: row.title,
      ballot: ballotText(row.method, row.ballot, row.dotBudget),
      castAt: row.castAt,
    })),
  });
}

/** A stored ballot as words; a ballot the method no longer reads shows as unreadable, not as a crash. */
function ballotText(method: VotingMethod, ballot: unknown, dotBudget: number | null): string {
  try {
    return canonicalBallot(methodId(method), ballot, { dotBudget });
  } catch {
    return "(unreadable)";
  }
}
