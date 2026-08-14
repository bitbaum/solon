import PageLayout from "@/components/ui/page-layout";

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
        <div className="bg-surface-base rounded-control border border-default p-8">
          <h2 className="text-2xl font-bold text-fg-primary mb-6">
            Cast a cryptographic vote
          </h2>
          <p className="text-fg-primary mb-4">
            A vote is a Bitcoin signed message. Sign the canonical vote message
            with the wallet that holds your registered member address, then POST
            the signature:
          </p>
          <div className="bg-surface-public text-green-400 p-4 rounded-surface font-mono text-sm overflow-x-auto">
            <div className="text-fg-secondary">
              # Message to sign (exact text):
            </div>
            <div className="text-fg-primary">Solon vote</div>
            <div className="text-fg-primary">session:&lt;sessionId&gt;</div>
            <div className="text-fg-primary">choice:&lt;yes|no|abstain&gt;</div>
            <div className="text-fg-primary">voter:&lt;your-bitcoin-address&gt;</div>
            <br />
            <div className="text-fg-secondary"># Submit the signed vote</div>
            <div className="text-fg-primary">
              curl -X POST /api/sessions/&lt;sessionId&gt;/votes \
            </div>
            <div className="text-fg-primary ml-4">
              -H &quot;Content-Type: application/json&quot; \
            </div>
            <div className="text-fg-primary ml-4">
              -d &apos;{"{"}
              &quot;choice&quot;:&quot;yes&quot;,&quot;address&quot;:&quot;1...&quot;,&quot;signature&quot;:&quot;&lt;base64&gt;&quot;
              {"}"}&apos;
            </div>
          </div>
          <p className="text-fg-secondary text-sm mt-3">
            The server recovers the public key from the signature and only
            stores the vote if it resolves to a registered member. Invalid
            signatures return 401; verified but ineligible votes return 422 —
            with the reason in both cases.
          </p>
        </div>

        <div className="bg-surface-base rounded-control border border-default p-8">
          <h2 className="text-2xl font-bold text-fg-primary mb-4">Live endpoints</h2>
          <ul className="space-y-2">
            <li>
              <code className="bg-surface-raised px-2 py-1 rounded text-xs text-fg-primary font-mono">
                POST /api/proposals
              </code>
              <span className="text-sm text-fg-secondary ml-2">
                file a signed proposal
              </span>
            </li>
            <li>
              <code className="bg-surface-raised px-2 py-1 rounded text-xs text-fg-primary font-mono">
                POST /api/proposals/[proposalId]/open
              </code>
              <span className="text-sm text-fg-secondary ml-2">
                open the voting session
              </span>
            </li>
            <li>
              <code className="bg-surface-raised px-2 py-1 rounded text-xs text-fg-primary font-mono">
                GET /api/sessions/[sessionId]
              </code>
              <span className="text-sm text-fg-secondary ml-2">
                session, snapshotted rules, live tally
              </span>
            </li>
            <li>
              <code className="bg-surface-raised px-2 py-1 rounded text-xs text-fg-primary font-mono">
                POST /api/sessions/[sessionId]/votes
              </code>
              <span className="text-sm text-fg-secondary ml-2">
                cast a signed vote
              </span>
            </li>
            <li>
              <code className="bg-surface-raised px-2 py-1 rounded text-xs text-fg-primary font-mono">
                POST /api/sessions/[sessionId]/close
              </code>
              <span className="text-sm text-fg-secondary ml-2">
                close after the window and decide the outcome
              </span>
            </li>
            <li>
              <code className="bg-surface-raised px-2 py-1 rounded text-xs text-fg-primary font-mono">
                GET /api/orgs/[slug]
              </code>
              <span className="text-sm text-fg-secondary ml-2">
                organization + public member roster
              </span>
            </li>
            <li>
              <code className="bg-surface-raised px-2 py-1 rounded text-xs text-fg-primary font-mono">
                GET /api/orgs/[slug]/proposals
              </code>
              <span className="text-sm text-fg-secondary ml-2">
                all proposals with session state
              </span>
            </li>
            <li>
              <code className="bg-surface-raised px-2 py-1 rounded text-xs text-fg-primary font-mono">
                GET /api/orgs/[slug]/policies/[key]
              </code>
              <span className="text-sm text-fg-secondary ml-2">
                policy version history
              </span>
            </li>
            <li>
              <code className="bg-surface-raised px-2 py-1 rounded text-xs text-fg-primary font-mono">
                GET /api/orgs/[slug]/audit
              </code>
              <span className="text-sm text-fg-secondary ml-2">
                append-only audit stream
              </span>
            </li>
            <li>
              <code className="bg-surface-raised px-2 py-1 rounded text-xs text-fg-primary font-mono">
                GET /api/orgs/[slug]/treasury
              </code>
              <span className="text-sm text-fg-secondary ml-2">
                live on-chain treasury balances
              </span>
            </li>
            <li>
              <code className="bg-surface-raised px-2 py-1 rounded text-xs text-fg-primary font-mono">
                GET /api/v1/decisions/[sessionId]
              </code>
              <span className="text-sm text-fg-secondary ml-2">
                self-verifying decision document — re-verify it, don&apos;t
                trust it
              </span>
            </li>
            <li>
              <code className="bg-surface-raised px-2 py-1 rounded text-xs text-fg-primary font-mono">
                GET /api/health
              </code>
              <span className="text-sm text-fg-secondary ml-2">
                service health
              </span>
            </li>
          </ul>
          <p className="text-fg-secondary text-sm mt-4">
            All reads are public and auth-free — transparency is the product. On
            finalization Solon emits a{" "}
            <code className="font-mono text-xs">decision.finalized</code>{" "}
            webhook (HMAC-signed); consumers are expected to fetch the decision
            document and re-verify every signature locally rather than trust the
            notification.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
