import Link from "next/link";
import type { TreasuryReport } from "@/lib/domain/treasury";

/**
 * Watch-only treasury: every number is a live chain lookup and links to a
 * public explorer so it can be verified independently. A failed lookup says
 * "unavailable" — it never substitutes a guess.
 */
export default function BitcoinTreasury({
  orgName,
  report,
}: {
  orgName: string;
  report: TreasuryReport;
}) {
  const totalBtc = report.totalSats !== null ? (report.totalSats / 100_000_000).toFixed(8) : null;

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-display-3 text-fg-primary">Bitcoin Treasury</h2>
          <p className="text-sm text-fg-secondary">Organization: {orgName}</p>
        </div>
        <div className="text-right">
          <div className="text-fg-secondary text-xs">
            On-chain balance (BTC)
            {report.allSourcesResolved ? "" : " — some sources unavailable"}
          </div>
          <div className="text-2xl font-mono text-fg-primary">{totalBtc ?? "unavailable"}</div>
        </div>
      </header>

      <div className="rounded-surface border border-default p-4 bg-surface-raised">
        <h3 className="font-semibold text-fg-primary">Treasury sources (watch-only)</h3>
        {report.sources.length === 0 ? (
          <>
            <p className="mt-2 text-sm text-fg-secondary">
              No treasury source registered yet, so no balance is being claimed. Registering one is
              itself a governance decision — the address becomes public and every reading is checked
              against the chain.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Link href="/propose" className="btn-primary">
                Propose a treasury source
              </Link>
              <Link
                href="/treasury/bitcoin"
                className="text-sm text-fg-secondary transition-colors hover:text-fg-primary"
              >
                How the watch-only model works →
              </Link>
            </div>
          </>
        ) : (
          <table className="w-full mt-3 text-sm">
            <thead className="text-fg-secondary">
              <tr>
                <th className="text-left font-medium">Label</th>
                <th className="text-left font-medium">Address</th>
                <th className="text-right font-medium">Balance (sats)</th>
                <th className="text-right font-medium">Verify</th>
              </tr>
            </thead>
            <tbody>
              {report.sources.map((s) => (
                <tr key={s.address} className="border-t border-default">
                  <td className="py-2 text-fg-primary">{s.label}</td>
                  <td className="py-2 font-mono text-xs text-fg-primary break-all">{s.address}</td>
                  <td className="py-2 font-mono text-right text-fg-primary">
                    {s.totalSats !== null ? s.totalSats.toLocaleString() : "unavailable"}
                  </td>
                  <td className="py-2 text-right">
                    <a
                      className="text-fg-primary hover:text-fg-primary underline transition-colors"
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
