import PageLayout from "@/components/ui/page-layout";
import { API_ENDPOINTS } from "@/lib/config/api-surface";
import { primaryOrg } from "@/lib/domain/org";

/**
 * Documents the API that exists today — nothing aspirational. The surface is
 * small on purpose; it grows as governance features ship, and each endpoint is
 * listed here only once it is live.
 */
export const dynamic = "force-dynamic";

export default async function IntegrationPage() {
  const org = await primaryOrg();
  const orgSlug = org?.slug ?? "orangecat";
  return (
    <PageLayout
      title="API & Integration"
      description="The current public API — every endpoint listed here is live"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-surface-base rounded-control border border-default p-8">
          <h2 className="font-display text-display-3 text-fg-primary mb-6">
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
          <h2 className="font-display text-display-3 text-fg-primary mb-2">Live endpoints</h2>
          <p className="text-sm text-fg-secondary mb-5">
            Every read is public and auth-free. Open one.
          </p>
          <ul className="space-y-1.5">
            {API_ENDPOINTS.map((e) => {
              const href = e.sample?.(orgSlug);
              const row = (
                <>
                  <span className="shrink-0 w-12 font-mono text-xs text-fg-tertiary">
                    {e.method}
                  </span>
                  <code className="font-mono text-xs text-fg-primary">{e.path}</code>
                  <span className="ml-auto hidden text-sm text-fg-secondary sm:inline">
                    {e.description}
                  </span>
                </>
              );
              return (
                <li key={`${e.method} ${e.path}`}>
                  {href ? (
                    <a
                      href={href}
                      className="flex items-center gap-3 rounded-control border border-default bg-surface-raised px-3 py-2 transition-colors hover:bg-surface-overlay"
                    >
                      {row}
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 rounded-control border border-default px-3 py-2">
                      {row}
                    </div>
                  )}
                  <span className="mt-1 block text-sm text-fg-secondary sm:hidden">
                    {e.description}
                  </span>
                </li>
              );
            })}
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
