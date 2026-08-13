import { Prisma, type votes, type voting_sessions } from '@prisma/client';

export type VoteChoice = 'yes' | 'no' | 'abstain';
export type VoteTally = Record<VoteChoice, string>;

export const VOTE_CHOICES: readonly VoteChoice[] = ['yes', 'no', 'abstain'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAINNET_P2PKH_PATTERN = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;

export function isVoteSessionId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function isMainnetP2pkhAddress(value: string): boolean {
  return MAINNET_P2PKH_PATTERN.test(value);
}

export function isCompactMessageSignature(value: string): boolean {
  return value.length === 88
    && /^[A-Za-z0-9+/]{87}=$/.test(value)
    && Buffer.from(value, 'base64').length === 65;
}

export function voteSessionIneligibility(
  session: Pick<voting_sessions, 'status' | 'start_date' | 'end_date'>,
  now = new Date(),
): string | null {
  if (session.status !== 'active') return `voting session is ${session.status}`;
  if (session.start_date > now) return 'voting session has not started';
  if (session.end_date && session.end_date <= now) return 'voting session has ended';
  return null;
}

export function weightedTally(rows: Array<Pick<votes, 'vote_choice' | 'weight'>>): VoteTally {
  const tally: Record<VoteChoice, Prisma.Decimal> = {
    yes: new Prisma.Decimal(0),
    no: new Prisma.Decimal(0),
    abstain: new Prisma.Decimal(0),
  };
  for (const row of rows) {
    const choice = row.vote_choice as VoteChoice;
    if (choice in tally) tally[choice] = tally[choice].plus(row.weight);
  }
  return {
    yes: tally.yes.toString(),
    no: tally.no.toString(),
    abstain: tally.abstain.toString(),
  };
}
