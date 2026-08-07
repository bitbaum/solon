import type { BitcoinTransaction } from "@/lib/solon/types";

export interface BitcoinTreasuryProps {
  organizationId: string;
  walletBalance: number; // sats
  recentTransactions: BitcoinTransaction[];
}

export default function BitcoinTreasury({ organizationId, walletBalance, recentTransactions }: BitcoinTreasuryProps) {
  const btc = (walletBalance / 100_000_000).toFixed(8);
  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--navy)]">Bitcoin Treasury</h2>
          <p className="text-sm text-gray-600">Organization: {organizationId}</p>
        </div>
        <div className="text-right">
          <div className="text-gray-600 text-xs">Recorded balance (BTC) — sum of the transactions below</div>
          <div className="text-2xl font-mono text-[var(--navy)]">{btc}</div>
        </div>
      </header>

      <div className="grid gap-4">
        <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
          <h3 className="font-semibold text-[var(--navy)]">Recent Transactions</h3>
          <table className="w-full mt-3 text-sm">
            <thead className="text-gray-600">
              <tr>
                <th className="text-left font-medium">Date</th>
                <th className="text-left font-medium">Amount (sats)</th>
                <th className="text-left font-medium">Category</th>
                <th className="text-left font-medium">TX</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.slice(0, 8).map((tx) => (
                <tr key={tx.txid} className="border-t border-gray-200">
                  <td className="py-2 text-gray-700">{new Date(tx.transaction_date).toLocaleString()}</td>
                  <td className="py-2 font-mono text-gray-700">{tx.amount_sats}</td>
                  <td className="py-2 text-gray-700">{tx.category}</td>
                  <td className="py-2">
                    <a
                      className="text-[var(--navy)] hover:text-[var(--navy-light)] underline transition-colors"
                      href={`https://mempool.space/tx/${tx.txid}`}
                      target="_blank"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

