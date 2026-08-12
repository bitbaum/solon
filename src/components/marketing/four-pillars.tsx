import { Bitcoin, Scale, Eye, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'

/**
 * What Solon governs — the four product areas, matching the repo canon
 * (Treasury / Voting / Decisions / Audit Trail). Server component: there is
 * nothing interactive here, and every feature listed exists in production.
 * "Pillars" is deliberately NOT used for these — that word belongs to the
 * three-product stack (see /ecosystem).
 */

const AREAS = [
  {
    icon: Bitcoin,
    title: 'Transparent Treasury',
    shortDesc: 'Watch-only, on-chain, no custody',
    description:
      'Treasuries are registered as watch-only Bitcoin addresses anyone can verify independently. Solon holds no keys and no funds — amounts are read from the chain and stored in satoshis.',
    features: [
      'Watch-only address registry',
      'On-chain balance reads',
      'Satoshis as integers, never floats',
    ],
    href: '/treasury/bitcoin',
    linkLabel: 'View the treasury',
  },
  {
    icon: Users,
    title: 'Democratic Voting',
    shortDesc: 'Bitcoin-signed, one member one vote',
    description:
      'Votes are Bitcoin signed messages verified against each member’s registered address. Humans and AI agents vote as equals where the rules allow — and agents are locked out of the red-line categories.',
    features: [
      'Signature recovery on every vote',
      'One vote per member per session',
      'Weighted by public member weight',
    ],
    href: '/governance/voting',
    linkLabel: 'How voting works',
  },
  {
    icon: Scale,
    title: 'Decision Making',
    shortDesc: 'Signed proposals, snapshotted rules',
    description:
      'Proposals are signed by their proposer and decided in sessions whose rules — electorate, threshold, quorum — are frozen at open, so a past decision stays explainable after the rules change.',
    features: [
      'Signed proposals',
      'Versioned, vote-approved policies',
      'Self-verifying decision documents',
    ],
    href: '/ecosystem',
    linkLabel: 'See live decisions',
  },
  {
    icon: Eye,
    title: 'Audit Trail',
    shortDesc: 'Append-only, public, complete',
    description:
      'Every governance event lands in an append-only log with no update or delete path in code. The public audit page shows the record itself — not a summary of it.',
    features: [
      'Append-only by construction',
      'Every step recorded',
      'Public audit page and API',
    ],
    href: '/governance/audit',
    linkLabel: 'Browse the audit trail',
  },
]

export function FourPillars() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
      {AREAS.map((area) => {
        const IconComponent = area.icon
        return (
          <div
            key={area.title}
            className="rounded-lg border border-slate-200 bg-white shadow-card hover:shadow-lg transition-shadow p-8 flex flex-col"
          >
            <div className="flex items-center space-x-4 mb-5">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-navy">
                <IconComponent className="h-6 w-6 text-solon-bitcoin" />
              </span>
              <div>
                <h3 className="text-xl font-bold font-display text-navy">{area.title}</h3>
                <p className="text-slate-500 text-sm font-medium">{area.shortDesc}</p>
              </div>
            </div>

            <p className="text-slate-600 mb-5 leading-relaxed">{area.description}</p>

            <ul className="space-y-2 mb-6">
              {area.features.map((feature) => (
                <li key={feature} className="flex items-center text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-solon-orange mr-3 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href={area.href}
              className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-solon-orange hover:text-solon-orange-dark"
            >
              {area.linkLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )
      })}
    </div>
  )
}
