"use client";

import { useState } from 'react';
import type { VotingSession } from '@/lib/solon/types';

export interface VotingInterfaceProps {
  session: VotingSession;
  userWallet: string;
  canVote: boolean;
  tallyAvailable?: boolean;
}

export default function VotingInterface({ session, userWallet, canVote, tallyAvailable = true }: VotingInterfaceProps) {
  const [choice, setChoice] = useState<'yes' | 'no' | 'abstain' | null>(null);

  return (
    <section className="space-y-6" aria-labelledby="proposal-title">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-solon-orange">Proposal</p>
          <h2 id="proposal-title" className="mt-1 text-2xl font-bold text-navy">{session.title}</h2>
          <p className="mt-1 text-sm text-slate-600">Voting method: {session.voting_type.replaceAll('_', ' ')}</p>
        </div>
        <span className="w-fit rounded-full bg-solon-green/10 px-3 py-1 text-xs font-semibold capitalize text-emerald-800">{session.status}</span>
      </header>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="font-semibold text-navy">1. Choose your position</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Review the proposal before choosing. A production vote requires a registered address and a Bitcoin signed-message signature.
        </p>
        <fieldset className="mt-4 grid gap-3 sm:grid-cols-3">
          <legend className="sr-only">Vote choice</legend>
          {(['yes', 'no', 'abstain'] as const).map((option) => (
            <button
              type="button"
              key={option}
              disabled={!canVote}
              aria-pressed={choice === option}
              className={`min-h-11 rounded-md border px-4 py-2 font-semibold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solon-orange disabled:cursor-not-allowed disabled:opacity-50 ${
                choice === option ? 'border-navy bg-navy text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-navy hover:text-navy'
              }`}
              onClick={() => setChoice(option)}
            >
              {option}
            </button>
          ))}
        </fieldset>
        <div className="mt-5 border-t border-slate-200 pt-4">
          <h3 className="font-semibold text-navy">2. Sign and submit</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {userWallet
              ? 'Wallet signing is not available in this demo build. Use the documented API with a valid signed message.'
              : 'Enter your registered Bitcoin address above to prepare the vote. Wallet signing is not available in this demo build.'}
            {!canVote && ' A live database session is also required before choices can be prepared.'}
          </p>
          <button type="button" disabled className="mt-3 min-h-11 rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white opacity-50">
            Submit signed vote
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="font-semibold text-navy">Current tally</h3>
        {tallyAvailable ? (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:gap-4">
            <Tally label="Yes" value={session.tally?.yes ?? 0} color="text-emerald-700" />
            <Tally label="No" value={session.tally?.no ?? 0} color="text-red-700" />
            <Tally label="Abstain" value={session.tally?.abstain ?? 0} color="text-amber-700" />
          </div>
        ) : (
          <p className="mt-2 text-sm leading-6 text-slate-600">No live tally is available while the dashboard is in sample mode.</p>
        )}
      </div>
    </section>
  );
}

function Tally({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-md bg-white p-3">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</div>
    </div>
  );
}
