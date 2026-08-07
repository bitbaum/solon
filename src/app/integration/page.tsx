import PageLayout from '@/components/ui/page-layout';

/**
 * Documents the API that exists today — nothing aspirational. The surface is
 * small on purpose; it grows as governance features ship, and each endpoint is
 * listed here only once it is live.
 */
export default function IntegrationPage() {
  return (
    <PageLayout
      title="API & Integration"
      description="The current public API — every endpoint listed here is live"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-[var(--navy)] mb-6">Cast a cryptographic vote</h2>
          <p className="text-gray-700 mb-4">
            A vote is a Bitcoin signed message. Sign the canonical vote message with the
            wallet that holds your registered member address, then POST the signature:
          </p>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            <div className="text-gray-400"># Message to sign (exact text):</div>
            <div className="text-white">Solon vote</div>
            <div className="text-white">session:&lt;sessionId&gt;</div>
            <div className="text-white">choice:&lt;yes|no|abstain&gt;</div>
            <div className="text-white">voter:&lt;your-bitcoin-address&gt;</div>
            <br />
            <div className="text-gray-400"># Submit the signed vote</div>
            <div className="text-white">curl -X POST /api/voting/&lt;sessionId&gt;/cryptographic-vote \</div>
            <div className="text-white ml-4">-H &quot;Content-Type: application/json&quot; \</div>
            <div className="text-white ml-4">
              -d &apos;{'{'}&quot;choice&quot;:&quot;yes&quot;,&quot;address&quot;:&quot;1...&quot;,&quot;signature&quot;:&quot;&lt;base64&gt;&quot;{'}'}&apos;
            </div>
          </div>
          <p className="text-gray-600 text-sm mt-3">
            The server recovers the public key from the signature and only stores the vote
            if it resolves to a registered member. Invalid signatures return 401; verified
            but ineligible votes return 422 — with the reason in both cases.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-[var(--navy)] mb-4">Live endpoints</h2>
          <ul className="space-y-2">
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs text-[var(--navy)] font-mono">
                POST /api/voting/[sessionId]/cryptographic-vote
              </code>
              <span className="text-sm text-gray-600 ml-2">cast a signed vote</span>
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs text-[var(--navy)] font-mono">
                GET /api/voting/[sessionId]/cryptographic-vote
              </code>
              <span className="text-sm text-gray-600 ml-2">weighted tally for a session</span>
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs text-[var(--navy)] font-mono">
                GET /api/bitcoin/wallet/[orgId]
              </code>
              <span className="text-sm text-gray-600 ml-2">organization wallet balance</span>
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs text-[var(--navy)] font-mono">
                GET /api/health
              </code>
              <span className="text-sm text-gray-600 ml-2">service health</span>
            </li>
          </ul>
          <p className="text-gray-600 text-sm mt-4">
            A broader public read API (organizations, proposals, decisions, treasury,
            audit log) is being built next — endpoints appear here when they are live,
            not before.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
