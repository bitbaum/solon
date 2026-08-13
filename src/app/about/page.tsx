import Link from 'next/link';
import { Bitcoin, Eye, KeyRound, Scale } from 'lucide-react';
import PageLayout from '@/components/ui/page-layout';
import { REPOSITORY_URL, ROUTES } from '@/lib/site-config';

const PRINCIPLES = [
  {
    title: 'Evidence before claims',
    description: 'Treasury and governance records should point to evidence a member or auditor can independently inspect.',
    icon: Eye,
  },
  {
    title: 'Keys stay with members',
    description: 'Solon verifies Bitcoin signed messages. It is not designed to receive or custody a member’s private key.',
    icon: KeyRound,
  },
  {
    title: 'Satoshis, not floats',
    description: 'Treasury amounts are stored as integer satoshis so accounting does not introduce floating-point rounding.',
    icon: Bitcoin,
  },
  {
    title: 'Decisions stay explainable',
    description: 'Votes, organization membership, and decision records share a relational model intended for later audit.',
    icon: Scale,
  },
] as const;

export default function AboutPage() {
  return (
    <PageLayout title="About Solon" description="An open-source experiment in transparent treasury records and cryptographically authorized organizational voting.">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-labelledby="mission-heading">
          <p className="text-sm font-bold uppercase tracking-wider text-solon-orange">Mission</p>
          <h2 id="mission-heading" className="mt-1 font-display text-2xl font-bold text-navy">Make organizational authority inspectable</h2>
          <div className="mt-4 max-w-3xl space-y-4 leading-7 text-slate-700">
            <p>Solon explores a simple idea: a treasury action or member decision is more trustworthy when its authorization and evidence can be independently checked.</p>
            <p>This repository is an MVP. It includes treasury reads, a governance data model, Bitcoin signed-message verification, and signed-vote API primitives. Production authentication, proposal administration, marketplace workflows, and wallet-assisted signing remain outside the current build.</p>
          </div>
        </section>

        <section aria-labelledby="principles-heading">
          <h2 id="principles-heading" className="font-display text-2xl font-bold text-navy">Design principles</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {PRINCIPLES.map(({ title, description, icon: Icon }) => (
              <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-navy text-solon-bitcoin"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="mt-4 font-display text-xl font-bold text-navy">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-navy p-6 text-white sm:p-8" aria-labelledby="evaluate-heading">
          <h2 id="evaluate-heading" className="font-display text-2xl font-bold">Evaluate the working paths</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-300">Open the guided workspace if you want to understand the user experience, or inspect the repository and API guide if you want to evaluate the implementation.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={ROUTES.dashboard} className="flex min-h-11 items-center justify-center rounded-md bg-solon-orange px-5 py-2.5 font-semibold text-white hover:bg-solon-orange-dark">Explore workspace</Link>
            <Link href={ROUTES.integration} className="flex min-h-11 items-center justify-center rounded-md border border-slate-500 px-5 py-2.5 font-semibold text-white hover:bg-white/10">Read API guide</Link>
            <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center rounded-md border border-slate-500 px-5 py-2.5 font-semibold text-white hover:bg-white/10">View source <span className="sr-only">(opens in a new tab)</span></a>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
