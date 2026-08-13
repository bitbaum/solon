import Link from 'next/link';
import { CheckCircle2, Vote, WalletCards } from 'lucide-react';
import PageLayout from '@/components/ui/page-layout';
import { REPOSITORY_URL, ROUTES } from '@/lib/site-config';

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/bitcoin/wallet/{orgId}',
    title: 'Read a treasury',
    description: 'Returns the configured treasury address, balance source, balance in satoshis, and recent recorded transactions.',
    icon: WalletCards,
  },
  {
    method: 'GET',
    path: '/api/solon/transparency?orgId={orgId}',
    title: 'Read transparency evidence',
    description: 'Returns source counts and the net total of signed recorded amounts from stored transactions, decisions, voting sessions, and votes. It does not invent a score.',
    icon: CheckCircle2,
  },
  {
    method: 'GET / POST',
    path: '/api/voting/{sessionId}/cryptographic-vote',
    title: 'Read or cast votes',
    description: 'GET returns the tally. POST verifies a Bitcoin signed-message before storing a registered member vote.',
    icon: Vote,
  },
] as const;

export default function IntegrationPage() {
  return (
    <PageLayout title="API & Integration Guide" description="The endpoints this Solon build implements today—without placeholder SDKs or fictional services.">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8" aria-labelledby="quick-start-heading">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-solon-orange">Implemented now</p>
            <h2 id="quick-start-heading" className="mt-2 font-display text-2xl font-bold text-navy">Start with a read-only treasury request</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Replace <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-navy">ORG_ID</code> with an organization ID from your database. The public workspace uses fallback sample data when no database is available; API requests do not fabricate a successful response.
            </p>
          </div>
          <pre className="mt-6 overflow-x-auto rounded-lg bg-navy-dark p-4 text-sm leading-7 text-slate-100" aria-label="Treasury API curl example">
            <code>{`curl http://localhost:3000/api/bitcoin/wallet/ORG_ID`}</code>
          </pre>
        </section>

        <section aria-labelledby="endpoints-heading">
          <div className="max-w-3xl">
            <h2 id="endpoints-heading" className="font-display text-2xl font-bold text-navy">Available endpoints</h2>
            <p className="mt-2 text-slate-600">All monetary amounts use integer satoshis. Treasury and transparency endpoints are read-only; signed votes are authorized by a registered member&apos;s Bitcoin signature.</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {ENDPOINTS.map(({ method, path, title, description, icon: Icon }) => (
              <article key={`${method}-${path}`} className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy text-solon-bitcoin"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-solon-orange">{method}</span>
                    <h3 className="font-display text-lg font-bold text-navy">{title}</h3>
                  </div>
                </div>
                <code className="mt-4 block overflow-x-auto rounded-md bg-slate-100 px-3 py-2 text-xs text-navy">{path}</code>
                <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-navy p-6 text-white sm:p-8" aria-labelledby="vote-request-heading">
          <h2 id="vote-request-heading" className="font-display text-2xl font-bold">Signed vote request</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-300">
            The signature must cover Solon&apos;s canonical message containing the session, choice, and member address. Invalid signatures are rejected and never stored.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-lg bg-navy-dark p-4 text-sm leading-7 text-slate-100" aria-label="Signed vote JSON body">
            <code>{`{
  "choice": "yes",
  "address": "REGISTERED_BITCOIN_ADDRESS",
  "signature": "BASE64_BITCOIN_MESSAGE_SIGNATURE"
}`}</code>
          </pre>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={ROUTES.dashboardVoting} className="flex min-h-11 items-center justify-center rounded-md bg-solon-orange px-5 py-2.5 font-semibold text-white hover:bg-solon-orange-dark">Explore voting flow</Link>
            <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center rounded-md border border-slate-500 px-5 py-2.5 font-semibold text-white hover:bg-white/10">Read source code <span className="sr-only">(opens in a new tab)</span></a>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
