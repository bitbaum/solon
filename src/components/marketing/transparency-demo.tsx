'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bitcoin, CheckCircle2, Code2, Vote } from 'lucide-react'
import { ROUTES } from '@/lib/site-config'

const SCENARIOS = [
  {
    id: 'treasury',
    label: 'Treasury review',
    title: 'Verify a recorded payment',
    description: 'A steward starts with an organization record, checks the integer-satoshi amount, and follows a valid transaction ID to independent Bitcoin evidence.',
    icon: Bitcoin,
    steps: ['Confirm organization and balance source', 'Review amount and category', 'Open a valid transaction ID in mempool.space'],
    href: ROUTES.dashboardTreasury,
    action: 'Open treasury workspace',
  },
  {
    id: 'voting',
    label: 'Member voting',
    title: 'Authorize a member choice',
    description: 'A registered member reviews a proposal, chooses a position, and signs a canonical message that binds the session, choice, and Bitcoin address.',
    icon: Vote,
    steps: ['Review the proposal and current session', 'Choose Yes, No, or Abstain', 'Sign externally and submit through the documented API'],
    href: ROUTES.dashboardVoting,
    action: 'Explore voting flow',
  },
  {
    id: 'integration',
    label: 'API review',
    title: 'Integrate only shipped endpoints',
    description: 'An operator uses the treasury, transparency, or cryptographic-vote handlers included in this repository without relying on a hosted API or unpublished SDK.',
    icon: Code2,
    steps: ['Configure PostgreSQL and organization state', 'Call an implemented API route', 'Handle missing state as an error, not sample success'],
    href: ROUTES.integration,
    action: 'Read the API guide',
  },
] as const

export function TransparencyDemo() {
  const [activeId, setActiveId] = useState<(typeof SCENARIOS)[number]['id']>('treasury')
  const active = SCENARIOS.find((scenario) => scenario.id === activeId) ?? SCENARIOS[0]
  const Icon = active.icon

  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-200" role="tablist" aria-label="Guided Solon scenarios">
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              role="tab"
              aria-selected={activeId === scenario.id}
              aria-controls={`scenario-${scenario.id}`}
              onClick={() => setActiveId(scenario.id)}
              className={`min-h-12 px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-solon-orange ${
                activeId === scenario.id ? 'border-b-2 border-solon-orange bg-orange-50 text-navy' : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
              }`}
            >
              {scenario.label}
            </button>
          ))}
        </div>
      </div>

      <div id={`scenario-${active.id}`} role="tabpanel" className="p-5 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-solon-orange">Guided scenario — no activity data</p>
        <div className="mt-3 flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-navy text-solon-bitcoin"><Icon className="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <h3 className="font-display text-xl font-bold text-navy sm:text-2xl">{active.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">{active.description}</p>
          </div>
        </div>

        <ol className="mt-6 grid gap-3 md:grid-cols-3">
          {active.steps.map((step, index) => (
            <li key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><CheckCircle2 className="h-4 w-4 text-solon-orange" aria-hidden="true" />Step {index + 1}</span>
              <p className="mt-2 text-sm font-semibold leading-6 text-navy">{step}</p>
            </li>
          ))}
        </ol>

        <Link href={active.href} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-light sm:w-auto">
          {active.action}
        </Link>
      </div>
    </div>
  )
}
