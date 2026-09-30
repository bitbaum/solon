import { Link } from "@/i18n/navigation";
import TechnicalDetails from "@/components/ui/technical-details";
import { bitcoinAmount } from "@/lib/domain/plain-words";
import type { TreasuryReport } from "@/lib/domain/treasury";

/**
 * Watch-only treasury: every number is a live chain lookup and links to a
 * public explorer so it can be verified independently. A failed lookup says
 * so — it never substitutes a guess.
 */
export default function BitcoinTreasury({ report }: { report: TreasuryReport }) {
  return (
    <section className="max-w-3xl space-y-6">
      <div className="rounded-surface border border-default bg-surface-base p-6">
        <div className="text-sm text-fg-secondary">The group holds</div>
        <div className="mt-1 headline text-display-3 text-fg-primary">
          {report.sources.length === 0
            ? "Nothing tracked yet"
            : report.totalSats !== null
              ? bitcoinAmount(report.totalSats)
              : "Cannot be read right now"}
        </div>
        {report.sources.length > 0 && !report.allSourcesResolved && (
          <p className="mt-2 text-sm text-fg-secondary">
            Some wallets could not be read just now, so this may be too low.
          </p>
        )}
        <p className="mt-4 text-sm leading-relaxed text-fg-secondary">
          {report.sources.length === 0
            ? "No wallet has been added yet. Adding one is decided by a vote of the members: its address becomes public, and anyone can check the balance."
            : "Solon only reads these wallets. It cannot spend from them; spending is decided by a vote of the members."}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {report.sources.length === 0 && (
            <Link href="/propose" className="btn-primary">
              Suggest adding a wallet
            </Link>
          )}
          <Link
            href="/treasury/bitcoin"
            className="text-sm text-fg-secondary transition-colors hover:text-fg-primary"
          >
            How this works →
          </Link>
        </div>
      </div>

      {report.sources.length > 0 && (
        <ul className="space-y-3">
          {report.sources.map((s) => (
            <li
              key={s.address}
              className="rounded-control border border-default bg-surface-base p-4 text-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-fg-primary">{s.label}</span>
                <span className="text-fg-primary">
                  {s.totalSats !== null ? bitcoinAmount(s.totalSats) : "Cannot be read right now"}
                </span>
              </div>
              <TechnicalDetails className="mt-3">
                <p className="break-all font-mono text-fg-primary">{s.address}</p>
                <p>
                  {s.totalSats !== null && `${s.totalSats.toLocaleString("en")} sats · `}
                  <a
                    className="underline underline-offset-2 hover:text-fg-primary"
                    href={`https://mempool.space/address/${s.address}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    check it on mempool.space
                  </a>
                </p>
              </TechnicalDetails>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
