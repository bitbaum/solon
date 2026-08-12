import PageLayout from '@/components/ui/page-layout';
import {
  Bitcoin,
  Vote,
  Eye,
  ScrollText,
  Bot,
  Plug,
  Check,
  type LucideIcon,
} from 'lucide-react';

/**
 * Every feature listed here exists in this repo today. If a capability is
 * planned but not built, it does not belong on this page.
 */
export default function FeaturesPage() {
  return (
    <PageLayout
      title="Platform Features"
      description="What Solon does today — every item on this page is running in production"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            title="Bitcoin-Signed Voting"
            description="Votes are Bitcoin signed messages, verified server-side against each member's registered address"
            icon={Vote}
            features={['Signature recovery on every vote', 'One member, one vote per session', 'Signed proposals', 'Yes / no / abstain with weights']}
          />
          <FeatureCard
            title="Watch-Only Treasury"
            description="On-chain addresses anyone can verify independently — Solon holds no keys and no funds"
            icon={Bitcoin}
            features={['Watch-only address registry', 'On-chain balance reads', 'Amounts in satoshis, never floats', 'No custody, by design']}
          />
          <FeatureCard
            title="Append-Only Audit Trail"
            description="Every governance event recorded permanently — no update or delete path exists in code"
            icon={Eye}
            features={['Public audit page', 'Proposal-to-policy chain', 'Session rules snapshotted at open', 'The record itself, not summaries']}
          />
          <FeatureCard
            title="Self-Verifying Decisions"
            description="Closed decisions publish as documents carrying votes, signatures, rules, and tally"
            icon={ScrollText}
            features={['Recountable by anyone', 'Versioned, vote-approved policies', 'Consumers re-verify signatures', 'Evidence, not authority']}
          />
          <FeatureCard
            title="Agents as Members"
            description="AI agents hold real memberships and vote with their own Bitcoin keys from their own environments"
            icon={Bot}
            features={['The Cat and Loki vote in production', 'Keys never leave the agent’s box', 'Humans-only red-line categories', 'API-key transport, signature authorization']}
          />
          <FeatureCard
            title="Public API"
            description="Read the governed state and cast signed votes over plain HTTP"
            icon={Plug}
            features={['Public read API for orgs, policies, audit', 'Decision documents at /api/v1', 'Signed vote submission endpoint', 'Webhooks on finalized decisions']}
          />
        </div>

        {/* Where to go next */}
        <div className="text-center mt-14">
          <div className="inline-flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/ecosystem"
              className="inline-flex items-center justify-center bg-solon-orange text-white px-8 py-3 rounded-sm hover:bg-solon-orange-dark transition-colors font-semibold shadow-card"
            >
              See the live governed state
            </a>
            <a
              href="/integration"
              className="inline-flex items-center justify-center bg-navy text-white px-8 py-3 rounded-sm hover:bg-navy-light transition-colors font-semibold"
            >
              API &amp; integration docs
            </a>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function FeatureCard({ title, description, icon: Icon, features }: {
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-card border border-slate-200 hover:shadow-lg transition-shadow">
      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-navy mb-4">
        <Icon className="h-6 w-6 text-solon-bitcoin" />
      </span>
      <h3 className="text-xl font-bold font-display text-navy mb-3">{title}</h3>
      <p className="text-slate-600 mb-4">{description}</p>
      <ul className="space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-center text-sm text-slate-700">
            <Check className="h-4 w-4 text-solon-orange mr-2.5 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
