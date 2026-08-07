import { prisma } from "@/lib/db";
import { getAddressBalance } from "@/lib/bitcoin/mempool";

export interface TreasurySourceBalance {
  label: string;
  address: string;
  /** Null when the chain lookup failed — shown as unavailable, never guessed. */
  totalSats: number | null;
  txCount: number | null;
}

export interface TreasuryReport {
  sources: TreasurySourceBalance[];
  /** Sum over sources whose lookup succeeded; null if none succeeded. */
  totalSats: number | null;
  allSourcesResolved: boolean;
}

/**
 * Live, watch-only treasury balances. Every number comes from the chain via
 * mempool.space at request time — there is no recorded-sum fallback, because a
 * fallback silently presented as a balance is a lie. A failed lookup renders
 * as "unavailable".
 */
export async function treasuryReport(organizationId: string): Promise<TreasuryReport> {
  const rows = await prisma.treasurySource.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });

  const sources = await Promise.all(
    rows.map(async (row): Promise<TreasurySourceBalance> => {
      try {
        const bal = await getAddressBalance(row.address);
        return { label: row.label, address: row.address, totalSats: bal.total_sats, txCount: bal.tx_count };
      } catch {
        return { label: row.label, address: row.address, totalSats: null, txCount: null };
      }
    }),
  );

  const resolved = sources.filter((s) => s.totalSats !== null);
  return {
    sources,
    totalSats: resolved.length ? resolved.reduce((sum, s) => sum + (s.totalSats ?? 0), 0) : null,
    allSourcesResolved: resolved.length === sources.length,
  };
}
