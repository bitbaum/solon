import type { bitcoin_transactions, votes, voting_sessions } from '@prisma/client';
import type { VoteTally } from '@/lib/solon/vote-policy';

/**
 * UI view types are derived from Prisma model fields. Only JSON-safe/date-safe
 * transformations are overridden here; the database schema remains the SSOT.
 */
export type BitcoinTransaction = Pick<bitcoin_transactions, 'txid' | 'category'> & {
  amount_sats: string;
  transaction_date: string;
};

export type VotingSession = Pick<voting_sessions, 'id' | 'title' | 'voting_type' | 'status'> & {
  tally?: VoteTally;
};

export type Vote = Pick<votes, 'bitcoin_signature'>;
