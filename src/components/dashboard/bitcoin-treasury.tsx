import type { BitcoinTransaction } from "@/lib/solon/types";
import { formatSatsAsBtc } from "@/lib/bitcoin/wallet-utils";

export interface BitcoinTreasuryProps {
  organizationId: string;
  walletBalance: bigint;
  recentTransactions: BitcoinTransaction[];
  isSample?: boolean;
}

export default function BitcoinTreasury({ organizationId, walletBalance, recentTransactions, isSample = false }: BitcoinTreasuryProps) {
  const btc = formatSatsAsBtc(walletBalance);
  return (
    <section className="space-y-6">
      {isSample && (
        <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <strong>Sample mode:</strong> the database is unavailable, so this page is showing one illustrative record. No live balance or transaction was loaded.
        </div>
      )}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy sm:text-3xl">Bitcoin Treasury</h1>
          <p className="text-sm text-gray-600">Organization: {organizationId}</p>
        </div>
        <div className="sm:text-right">
          <div className="text-slate-600 text-xs font-semibold uppercase tracking-wide">Recorded net total</div>
          <div className="mt-1 break-all text-2xl font-mono text-navy">{btc} BTC</div>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 md:col-span-2">
          <h3 className="font-semibold text-[var(--navy)]">Recent Transactions</h3>
          <ul className="mt-3 space-y-3 sm:hidden">
            {recentTransactions.slice(0, 8).map((tx) => (
              <li key={tx.txid} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-navy">{tx.category}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(tx.transaction_date).toLocaleString('en-US')}</p>
                  </div>
                  <p className="shrink-0 font-mono font-semibold text-navy">{tx.amount_sats} sats</p>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <TransactionReference txid={tx.txid} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[620px] text-sm">
            <caption className="sr-only">Recent Bitcoin transactions</caption>
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
                  <td className="py-2 text-gray-700">{new Date(tx.transaction_date).toLocaleString('en-US')}</td>
                  <td className="py-2 font-mono text-gray-700">{tx.amount_sats}</td>
                  <td className="py-2 text-gray-700">{tx.category}</td>
                  <td className="py-2">
                    <TransactionReference txid={tx.txid} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-navy">How to verify</h3>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
            <li>Amounts are shown in integer satoshis and BTC.</li>
            <li>Valid transaction IDs open in the public mempool explorer.</li>
            <li>Sample records are labeled and never link to a fake transaction.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function TransactionReference({ txid }: { txid: string }) {
  if (!/^[0-9a-f]{64}$/i.test(txid)) return <span className="text-slate-500">Sample record</span>;

  return (
    <a
      className="inline-flex min-h-11 items-center text-navy underline transition-colors hover:text-navy-light"
      href={`https://mempool.space/tx/${txid}`}
      target="_blank"
      rel="noreferrer"
    >
      View on mempool.space <span className="sr-only">transaction {txid} (opens in a new tab)</span>
    </a>
  );
}
