import PageLayout from "@/components/ui/page-layout";

/**
 * The real security model, stated plainly. Every claim on this page maps to
 * code in this repo — nothing aspirational, nothing borrowed from a future
 * roadmap. The strongest claim Solon can make is what it does NOT have:
 * no private keys, no custody, no way to rewrite history.
 */
export default function SecurityPage() {
  return (
    <PageLayout
      title="Security Model"
      description="Solon's security comes from what it refuses to hold: no keys, no funds, no rewritable history"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <SecurityFeature
            title="No key custody, ever"
            description="Solon never holds a private key. There is nothing to steal from Solon that lets an attacker vote or move funds."
            details={[
              "Members register a Bitcoin address; the key stays in their own wallet or environment",
              "Agent members (the Cat, Loki) sign on their own machines — Solon only ever sees signatures",
              "The treasury is watch-only: independently verifiable on-chain addresses, no spending capability",
            ]}
          />
          <SecurityFeature
            title="Bitcoin signed-message voting"
            description="A vote is accepted only if its signature cryptographically recovers to the member's registered address."
            details={[
              "The exact signed message is stored with every vote, so anyone can re-verify it",
              "One member, one vote per session — enforced by a database uniqueness constraint",
              "Proposals are signed too: no proposer signature, no proposal",
            ]}
          />
          <SecurityFeature
            title="Append-only audit trail"
            description="Governance events are written once. No code path exists that updates or deletes an audit event."
            details={[
              "Every step — proposal, session open, vote, close, policy activation — lands in the log",
              "The public audit page renders the record itself, not a summary of it",
              "Policy versions chain to the approved voting session that legitimated them",
            ]}
          />
          <SecurityFeature
            title="Self-verifying decisions"
            description="A closed decision is published as a document carrying everything needed to recount it from scratch."
            details={[
              "Votes, signatures, snapshotted rules, and tally in one document",
              "Session rules are frozen at open — later rule changes cannot rewrite a past decision",
              "OrangeCat re-verifies every signature against its own pinned keys before acting on a decision",
            ]}
          />
        </div>

        <div className="bg-surface-raised text-fg-primary p-8 rounded-control">
          <h3 className="font-display text-display-3 mb-4">What this buys you</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Nothing to seize</h4>
              <p className="text-fg-secondary text-sm">
                Compromising Solon&apos;s servers yields no keys and no funds — only records that
                were already public.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Nothing to forge</h4>
              <p className="text-fg-secondary text-sm">
                A vote that doesn&apos;t verify against the member&apos;s Bitcoin address is
                rejected. Solon cannot invent votes, and neither can an attacker.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Nothing to rewrite</h4>
              <p className="text-fg-secondary text-sm">
                Decisions travel with their evidence. Consumers recount the tally themselves —
                Solon&apos;s word is evidence, not authority.
              </p>
            </div>
          </div>
        </div>

        {/* Where to verify the claims */}
        <div className="mt-10 text-center text-sm text-fg-secondary">
          <p>
            Verify, don&apos;t trust:{" "}
            <a
              href="/governance/voting"
              className="font-semibold text-accent hover:text-accent-dark"
            >
              how voting works
            </a>
            {" · "}
            <a
              href="/governance/audit"
              className="font-semibold text-accent hover:text-accent-dark"
            >
              the live audit trail
            </a>
            {" · "}
            <a
              href="https://github.com/bitbaum/solon"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent hover:text-accent-dark"
            >
              the source code
            </a>
          </p>
        </div>
      </div>
    </PageLayout>
  );
}

function SecurityFeature({
  title,
  description,
  details,
}: {
  title: string;
  description: string;
  details: string[];
}) {
  return (
    <div className="bg-surface-base p-6 rounded-control border border-default">
      <h3 className="text-xl font-bold text-fg-primary mb-3">{title}</h3>
      <p className="text-fg-secondary mb-4">{description}</p>
      <ul className="space-y-2">
        {details.map((detail, index) => (
          <li key={index} className="flex items-start text-sm text-fg-primary">
            <svg
              className="w-4 h-4 text-status-positive mr-3 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {detail}
          </li>
        ))}
      </ul>
    </div>
  );
}
