import { CheckCircle2, KeyRound, Server, ShieldAlert } from 'lucide-react';
import PageLayout from '@/components/ui/page-layout';

const CONTROLS = [
  {
    title: 'Bitcoin signed-message verification',
    description: 'A vote is authorized by recovering a public key from its compact signature and comparing the derived P2PKH address.',
    details: ['Canonical message binds session, choice, and voter', 'Invalid signatures are never stored', 'Noble secp256k1 and hash primitives', 'No private key enters Solon'],
    icon: KeyRound,
  },
  {
    title: 'Organization eligibility checks',
    description: 'A valid signature alone is not enough: the recovered address must belong to an active member in the voting organization.',
    details: ['Active-session check', 'Active-member check', 'One member record per vote upsert', 'Server-side tally'],
    icon: CheckCircle2,
  },
  {
    title: 'Non-custodial treasury reads',
    description: 'The wallet endpoint reads an address balance from mempool.space when configured and falls back to recorded transaction totals.',
    details: ['No spending key storage', 'Integer satoshi totals', 'Balance source is returned', 'Public transaction explorer links'],
    icon: Server,
  },
] as const;

export default function SecurityPage() {
  return (
    <PageLayout title="Security Model" description="Concrete controls implemented by this repository, plus the operational boundaries you must account for.">
      <div className="mx-auto max-w-5xl">
        <section className="grid gap-6 lg:grid-cols-3" aria-label="Implemented security controls">
          {CONTROLS.map(({ title, description, details, icon: Icon }) => (
            <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-navy text-solon-bitcoin"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <h2 className="mt-4 font-display text-xl font-bold text-navy">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              <ul className="mt-4 space-y-2">
                {details.map((detail) => <li key={detail} className="flex items-start gap-2 text-sm text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-solon-orange" aria-hidden="true" />{detail}</li>)}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-xl bg-navy p-6 text-white sm:p-8" aria-labelledby="boundary-heading">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-1 h-6 w-6 shrink-0 text-solon-bitcoin" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-solon-bitcoin">Deployment responsibility</p>
              <h2 id="boundary-heading" className="mt-1 font-display text-2xl font-bold">What this code does not guarantee</h2>
            </div>
          </div>
          <p className="mt-4 max-w-3xl leading-7 text-slate-300">
            Authentication, authorization policy, rate limiting, production key-management integrations, database backups, and transport security must be provided and reviewed by the operator before production use. Zero-knowledge proofs and on-chain decision anchoring are not implemented in this build.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}
