import Link from 'next/link';
import { Bitcoin, Vote, ShieldCheck, ArrowRight } from 'lucide-react';
import { ROUTES } from '@/lib/site-config';

const TASKS = [
  {
    title: 'Review treasury',
    description: 'See the recorded organization balance, recent transactions, and available public evidence.',
    href: ROUTES.dashboardTreasury,
    action: 'Open treasury',
    icon: Bitcoin,
  },
  {
    title: 'Participate in a vote',
    description: 'Review a proposal, prepare a registered Bitcoin address and choice, and inspect the signed-message requirements.',
    href: ROUTES.dashboardVoting,
    action: 'Explore voting requirements',
    icon: Vote,
  },
] as const;

export default function DashboardOverview() {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-solon-orange">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Governance workspace
        </span>
        <h1 className="mt-2 font-display text-3xl font-bold text-navy sm:text-4xl">What do you need to do?</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Start with the outcome you need. Solon connects treasury evidence and member decisions in one inspectable workspace.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {TASKS.map(({ title, description, href, action, icon: Icon }) => (
          <Link key={href} href={href} className="group rounded-xl border border-slate-200 p-5 transition hover:border-solon-orange hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solon-orange sm:p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-navy text-solon-bitcoin">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-5 font-display text-xl font-bold text-navy">{title}</h2>
            <p className="mt-2 min-h-14 text-sm leading-6 text-slate-600">{description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-navy">
              {action}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
