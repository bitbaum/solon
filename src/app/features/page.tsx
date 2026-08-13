import Link from 'next/link';
import { Bitcoin, Vote, Eye, Plug, Check, Clock3, type LucideIcon } from 'lucide-react';
import PageLayout from '@/components/ui/page-layout';
import { ROUTES } from '@/lib/site-config';

const AVAILABLE = [
  {
    title: 'Treasury visibility',
    description: 'Read configured organization balances and recorded transactions, with an on-chain lookup when the wallet field contains an address.',
    icon: Bitcoin,
    features: ['Integer satoshi accounting', 'Recent transaction records', 'Mempool transaction links', 'Database-offline demo fallback'],
    href: ROUTES.dashboardTreasury,
    action: 'Explore treasury',
  },
  {
    title: 'Signed member voting',
    description: 'Verify standard Bitcoin signed messages against registered member addresses before a vote is stored.',
    icon: Vote,
    features: ['Canonical vote messages', 'Signature recovery', 'Member eligibility check', 'Weighted tallies'],
    href: ROUTES.dashboardVoting,
    action: 'Explore voting',
  },
  {
    title: 'Transparency metrics',
    description: 'Compute a consistent organization score from stored treasury, decision, and participation records.',
    icon: Eye,
    features: ['Five named metrics', 'Organization-scoped reads', 'Deterministic computation', 'JSON API access'],
    href: ROUTES.integration,
    action: 'Read the API guide',
  },
  {
    title: 'Direct API integration',
    description: 'Use the concrete REST handlers shipped in this repository—without depending on an unpublished SDK.',
    icon: Plug,
    features: ['Treasury reads', 'Transaction categorization', 'Vote submission and tally', 'Transparency metrics'],
    href: ROUTES.integration,
    action: 'View endpoints',
  },
] as const;

const ROADMAP = ['Multi-signature proposal signing UI', 'Open procurement marketplace UI', 'Decision and audit-trail workspace', 'Wallet-assisted signature flow'];

export default function FeaturesPage() {
  return (
    <PageLayout title="Platform Features" description="What this Solon build supports now, followed by clearly separated roadmap work.">
      <section aria-labelledby="available-heading">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-wider text-solon-orange">Available now</p>
          <h2 id="available-heading" className="mt-1 font-display text-2xl font-bold text-navy">Working product paths</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {AVAILABLE.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-slate-200 bg-white p-5 sm:p-8" aria-labelledby="roadmap-heading">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-1 h-5 w-5 shrink-0 text-solon-orange" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Roadmap—not available in this build</p>
            <h2 id="roadmap-heading" className="mt-1 font-display text-xl font-bold text-navy">Planned workflows</h2>
          </div>
        </div>
        <ul className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          {ROADMAP.map((item) => <li key={item} className="flex items-start gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />{item}</li>)}
        </ul>
      </section>
    </PageLayout>
  );
}

function FeatureCard({ title, description, icon: Icon, features, href, action }: { title: string; description: string; icon: LucideIcon; features: readonly string[]; href: string; action: string }) {
  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-navy"><Icon className="h-6 w-6 text-solon-bitcoin" aria-hidden="true" /></span>
      <h3 className="mt-4 font-display text-xl font-bold text-navy">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <ul className="mt-4 flex-1 space-y-2">
        {features.map((feature) => <li key={feature} className="flex items-start text-sm text-slate-700"><Check className="mr-2.5 mt-0.5 h-4 w-4 shrink-0 text-solon-orange" aria-hidden="true" />{feature}</li>)}
      </ul>
      <Link href={href} className="mt-6 flex min-h-11 items-center justify-center rounded-md border border-navy px-4 py-2 text-sm font-semibold text-navy transition hover:bg-slate-50">{action}</Link>
    </article>
  );
}
