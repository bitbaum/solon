/**
 * Real on-chain balance lookups via mempool.space. Read-only: Solon never
 * holds keys or moves funds — it observes a treasury address the same way any
 * member could, so the displayed balance is verifiable, not asserted.
 */
const MEMPOOL_BASE = process.env.MEMPOOL_API_BASE || "https://mempool.space/api";

export interface AddressBalance {
  address: string;
  confirmed_sats: number;
  mempool_sats: number;
  total_sats: number;
  tx_count: number;
}

/** Fetch the confirmed + unconfirmed balance of a Bitcoin address. */
export async function getAddressBalance(address: string): Promise<AddressBalance> {
  const res = await fetch(`${MEMPOOL_BASE}/address/${encodeURIComponent(address)}`, {
    // Treasury balance is live data; don't let Next cache it.
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`mempool.space ${res.status} for ${address}`);
  const data = (await res.json()) as {
    chain_stats: { funded_txo_sum: number; spent_txo_sum: number; tx_count: number };
    mempool_stats: { funded_txo_sum: number; spent_txo_sum: number };
  };
  const confirmed = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
  const mempool = data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum;
  return {
    address,
    confirmed_sats: confirmed,
    mempool_sats: mempool,
    total_sats: confirmed + mempool,
    tx_count: data.chain_stats.tx_count,
  };
}
