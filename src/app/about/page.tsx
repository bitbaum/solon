import PageLayout from "@/components/ui/page-layout";
import { ECOSYSTEM_PILLARS } from "@/lib/config/ecosystem";
import { Eye, Vote, Bitcoin } from "lucide-react";

// lucide-react v1 removed every brand mark, so `Github` no longer exists there.
// The link points at GitHub specifically, so a generic stand-in icon would say
// less than the mark does — inlined here to keep the page looking identical.
// One usage, so it stays local rather than becoming a shared primitive.
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <PageLayout
      title="About Solon"
      description="Governance you can verify instead of trust — built in the open, governed in the open"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Mission Section */}
        <div className="bg-surface-base rounded-control border border-default p-8 mb-8">
          <h2 className="text-2xl font-bold text-fg-primary mb-6">
            Why Solon exists
          </h2>
          <div className="prose prose-lg text-fg-primary">
            <p className="mb-4">
              Most governance runs on trust: trust the treasurer, trust the
              minutes, trust that the vote was counted. Solon replaces that
              trust with verification. Votes are Bitcoin signed messages anyone
              can re-check. Decisions are published as self-verifying documents.
              The audit trail is append-only. The treasury is watch-only — Solon
              never holds keys or funds.
            </p>
            <p>
              Solon is the governance pillar of a three-product stack, and it
              practices what it ships: its first production organization governs
              the stack itself, with AI agents from the sibling products
              registered as voting members and humans holding the red lines.
            </p>
          </div>
        </div>

        {/* Principles — each one is a design invariant in the codebase, not a slogan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <PrincipleCard
            title="No keys, no custody"
            description="Members sign votes with their own Bitcoin keys. Solon only ever sees signatures, and the treasury is watch-only."
            icon={<Bitcoin className="w-8 h-8 text-bitcoin" />}
          />
          <PrincipleCard
            title="Verify, don't trust"
            description="Every decision is published with its votes, rules, and signatures so anyone can recount the tally independently."
            icon={<Vote className="w-8 h-8 text-bitcoin" />}
          />
          <PrincipleCard
            title="Append-only record"
            description="Audit events are never updated or deleted — no code path exists that could rewrite history."
            icon={<Eye className="w-8 h-8 text-bitcoin" />}
          />
        </div>

        {/* Who runs it — the real, running answer */}
        <div className="bg-surface-base rounded-control border border-default p-8">
          <h2 className="text-2xl font-bold text-fg-primary mb-4">Who runs it</h2>
          <p className="text-fg-primary mb-6">
            Solon is operated as part of the OrangeCat stack and governed on its
            own rails. The current voting members — including the sibling
            products&apos; agents, The Cat and Loki — and every policy they
            govern are public on the ecosystem page.
          </p>
          <ul className="space-y-2 text-sm text-fg-secondary">
            {ECOSYSTEM_PILLARS.map((p) => (
              <li key={p.key}>
                <span className="font-semibold text-fg-primary">{p.name}</span>
                <span className="text-fg-secondary"> — {p.role}. </span>
                {p.description}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA — real destinations only */}
        <div className="text-center mt-12">
          <div className="bg-surface-raised text-fg-primary p-8 rounded-control">
            <h3 className="text-2xl font-bold mb-4">See it running</h3>
            <p className="text-fg-secondary mb-6">
              The live governed state — members, policies, decisions — is
              public. So is the code.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/ecosystem"
                className="bg-surface-base text-fg-primary px-8 py-3 rounded-surface hover:bg-surface-raised transition-colors font-semibold"
              >
                Live governed state
              </a>
              <a
                href="https://github.com/maonakamoto/solon"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-control border border-default bg-surface-base px-8 py-3 font-semibold text-fg-primary transition-colors hover:bg-surface-raised"
              >
                <GithubIcon className="w-4 h-4" /> Source code
              </a>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function PrincipleCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-surface-base p-6 rounded-control border border-default">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-fg-primary mb-3">{title}</h3>
      <p className="text-fg-secondary">{description}</p>
    </div>
  );
}
