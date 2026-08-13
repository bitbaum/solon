import type { BitcoinTransaction } from "@/lib/solon/types";

export default function TransactionViewer({ txs }: { txs: BitcoinTransaction[] }) {
  if (!txs?.length) return <div className="text-sm text-gray-400">No transactions yet.</div>;
  return (
    <ul className="space-y-2">
      {txs.map((tx) => (
        <li key={tx.txid} className="rounded border border-white/10 p-3 bg-black/20">
          <div className="flex items-center justify-between">
            <span className="font-mono text-gray-300">{tx.txid.slice(0, 18)}…</span>
            <span className="font-mono">{tx.amount_sats} sats</span>
          </div>
          <div className="text-xs text-gray-500">{new Date(tx.transaction_date).toLocaleString('en-US')}</div>
        </li>
      ))}
    </ul>
  );
}
