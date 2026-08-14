import PageLayout from "@/components/ui/page-layout";

/**
 * Explains the treasury model honestly. Real balances render in
 * /dashboard/treasury from recorded transactions — this page fabricates nothing.
 */
export default function BitcoinTreasuryPage() {
  return (
    <PageLayout
      title="Bitcoin Treasury"
      description="A treasury anyone can audit — every claim checkable on-chain"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-surface-base rounded-md shadow-sm border border-default p-8">
          <h2 className="text-2xl font-bold text-navy mb-4">The model</h2>
          <ul className="space-y-3 text-fg-primary">
            <li>
              <span className="font-semibold">Bitcoin-native</span> — the
              treasury is a Bitcoin wallet, so its balance and history are
              verifiable by anyone on the public chain, not asserted by us.
            </li>
            <li>
              <span className="font-semibold">Recorded and linked</span> —
              treasury transactions are recorded with their txid and link
              straight to a public block explorer. If a number here can&apos;t
              be checked independently, it doesn&apos;t belong here.
            </li>
            <li>
              <span className="font-semibold">Governed spending</span> —
              treasury decisions go through the same signed-vote process as
              everything else: proposal, open session, cryptographically
              verified votes, recorded outcome.
            </li>
          </ul>
        </div>

        <div className="text-center">
          <a
            href="/dashboard/treasury"
            className="inline-flex items-center justify-center bg-navy text-white px-8 py-3 rounded-lg hover:bg-navy-light transition-colors font-semibold"
          >
            View the treasury
          </a>
        </div>
      </div>
    </PageLayout>
  );
}
