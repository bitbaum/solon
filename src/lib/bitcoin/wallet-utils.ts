export function satsToBTC(sats: number) {
  return sats / 100_000_000;
}

/** Format an exact integer-satoshi value without converting through a float. */
export function formatSatsAsBtc(sats: bigint): string {
  const sign = sats < 0n ? '-' : '';
  const absolute = sats < 0n ? -sats : sats;
  const whole = absolute / 100_000_000n;
  const fraction = (absolute % 100_000_000n).toString().padStart(8, '0');
  return `${sign}${whole}.${fraction}`;
}

export function shorten(str: string, n = 6) {
  if (!str) return '';
  return `${str.slice(0, n)}…${str.slice(-n)}`;
}

/** Convert Prisma BigInt/Date fields into lossless JSON values. */
export function serializeBitcoinTransaction(transaction: bitcoin_transactions) {
  return {
    ...transaction,
    amount_sats: transaction.amount_sats.toString(),
    transaction_date: transaction.transaction_date.toISOString(),
    created_at: transaction.created_at.toISOString(),
  };
}
import type { bitcoin_transactions } from '@prisma/client';
