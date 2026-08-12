import type { TreasuryReport } from "@/lib/domain/treasury";

/**
 * Watch-only treasury: every number is a live chain lookup and links to a
 * public explorer so it can be verified independently. A failed lookup says
 * "unavailable" — it never substitutes a guess.
 */
export default function BitcoinTreasury({ orgName, report }: { orgName: string; report: TreasuryReport }) {
  const totalBtc = report.totalSats !== null ? (report.totalSats / 100_000_000).toFixed(8) : null;

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy">Bitcoin Treasury</h2>
          <p className="text-sm text-gray-600">Organization: {orgName}</p>
        </div>
        <div className="text-right">
          <div className="text-gray-600 text-xs">
            On-chain balance (BTC){report.allSourcesResolved ? "" : " — some sources unavailable"}
          </div>
          <div className="text-2xl font-mono text-navy">{totalBtc ?? "unavailable"}</div>
        </div>
      </header>

      <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
        <h3 className="font-semibold text-navy">Treasury sources (watch-only)</h3>
        {report.sources.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">
            No treasury source registered yet. When one is, its balance renders here from a
            live chain lookup and links to a public explorer.
          </p>
        ) : (
          <table className="w-full mt-3 text-sm">
            <thead className="text-gray-600">
              <tr>
                <th className="text-left font-medium">Label</th>
                <th className="text-left font-medium">Address</th>
                <th className="text-right font-medium">Balance (sats)</th>
                <th className="text-right font-medium">Verify</th>
              </tr>
            </thead>
            <tbody>
              {report.sources.map((s) => (
                <tr key={s.address} className="border-t border-gray-200">
                  <td className="py-2 text-gray-700">{s.label}</td>
                  <td className="py-2 font-mono text-xs text-gray-700 break-all">{s.address}</td>
                  <td className="py-2 font-mono text-right text-gray-700">
                    {s.totalSats !== null ? s.totalSats.toLocaleString() : "unavailable"}
                  </td>
                  <td className="py-2 text-right">
                    <a
                      className="text-navy hover:text-navy-light underline transition-colors"
                      href={`https://mempool.space/address/${s.address}`}
                      target="_blank"
                    >
                      mempool.space
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
