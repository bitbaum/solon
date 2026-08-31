import { prisma } from "@/lib/db";
import { getAddressBalance } from "@/lib/bitcoin/mempool";

export interface TreasurySourceBalance {
  label: string;
  address: string;
  /** Null when the chain lookup failed — shown as unavailable, never guessed. */
  totalSats: number | null;
  txCount: number | null;
}

/**
 * The four distinct things a treasury reading can mean. A single boolean could
 * not separate them: with no sources registered, "were all sources resolved?"
 * is vacuously true while the total is null — so a consumer reading that flag
 * as "this balance is trustworthy" would be told yes about nothing at all.
 */
export type TreasuryStatus =
  /** Nothing is registered — there is no claim being made. */
  | "no_sources"
  /** Every registered source answered. The total is complete. */
  | "resolved"
  /** Some answered, some did not. The total is a floor, not the balance. */
  | "partial"
  /** Sources exist but none answered. No total can be stated. */
  | "unavailable";

export interface TreasuryReport {
  sources: TreasurySourceBalance[];
  /** Sum over sources whose lookup succeeded; null if none succeeded. */
  totalSats: number | null;
  status: TreasuryStatus;
  /** True only when a complete total is being reported. */
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
        return {
          label: row.label,
          address: row.address,
          totalSats: bal.total_sats,
          txCount: bal.tx_count,
        };
      } catch {
        return { label: row.label, address: row.address, totalSats: null, txCount: null };
      }
    }),
  );

  const resolved = sources.filter((s) => s.totalSats !== null);
  const status: TreasuryStatus =
    sources.length === 0
      ? "no_sources"
      : resolved.length === 0
        ? "unavailable"
        : resolved.length === sources.length
          ? "resolved"
          : "partial";

  return {
    sources,
    totalSats: resolved.length ? resolved.reduce((sum, s) => sum + (s.totalSats ?? 0), 0) : null,
    status,
    allSourcesResolved: status === "resolved",
  };
}
