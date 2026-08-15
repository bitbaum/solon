import PageLayout from "@/components/ui/page-layout";

/**
 * Explains the treasury model honestly. Live balances render in
 * /dashboard/treasury from mempool.space lookups of registered
 * watch-only addresses. This page fabricates nothing.
 */
export default function BitcoinTreasuryPage() {
  return (
    <PageLayout
      title="Bitcoin Treasury"
      description="Watch-only addresses, looked up on the chain at request time"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-surface-base rounded-control border border-default p-8">
          <h2 className="text-2xl font-bold text-fg-primary mb-4">The model</h2>
          <ul className="space-y-3 text-fg-primary">
            <li>
              <span className="font-semibold">Watch-only</span> — Solon
              registers Bitcoin addresses and never holds keys. A balance
              that cannot be fetched from the chain is shown as unavailable,
              never guessed.
            </li>
            <li>
              <span className="font-semibold">Live from the chain</span> —
              each registered address is looked up on mempool.space when you
              open the dashboard. Solon does not store a transaction ledger
              or invent txids.
            </li>
            <li>
              <span className="font-semibold">Governed spending</span> —
              spending decisions go through the same signed-vote process as
              everything else: proposal, open session, cryptographically
              verified votes, recorded outcome.
            </li>
          </ul>
        </div>

        <div className="text-center">
          <a
            href="/dashboard/treasury"
            className="inline-flex items-center justify-center bg-surface-raised text-fg-primary px-8 py-3 rounded-surface hover:bg-surface-overlay transition-colors font-semibold"
          >
            View the treasury
          </a>
        </div>
      </div>
    </PageLayout>
  );
}
