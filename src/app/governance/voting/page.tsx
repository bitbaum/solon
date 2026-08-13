"use client";
import { useState } from 'react';
import Link from 'next/link';
import PageLayout from '@/components/ui/page-layout';
import { ROUTES } from '@/lib/site-config';

export default function VotingSystemPage() {
  const [selectedVote, setSelectedVote] = useState<string | null>(null);

  return (
    <PageLayout 
      title="Democratic Voting System" 
      description="Explore a sample proposal, then review the Bitcoin signed-message workflow implemented by this MVP"
    >
      <div className="max-w-6xl mx-auto">
        
        {/* Illustrative voting walkthrough */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-solon-orange">Illustrative sample data</p>
              <h2 className="mt-1 text-2xl font-bold text-navy">Active votes walkthrough</h2>
              <p className="text-sm text-slate-600">Explore this public demonstration, then use the workspace for signed member voting.</p>
            </div>
            <Link href={ROUTES.dashboardVoting} className="flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-navy-light">Open voting workspace</Link>
          </div>
          
          <div className="space-y-4">
            <VoteProposal
              id="treasury-001"
              title="Approve Q4 Marketing Budget"
              description="Allocate ₿ 0.5 for marketing initiatives including conference sponsorships and digital advertising"
              deadline="2 days remaining"
              yesVotes={7}
              noVotes={2}
              totalEligible={12}
              isActive={true}
              onVote={setSelectedVote}
              selectedVote={selectedVote}
              userHasVoted={false}
            />
            
            <VoteProposal
              id="governance-002"
              title="Update Voting Threshold to 60%"
              description="Change the minimum approval threshold for treasury decisions from 50% to 60%"
              deadline="5 days remaining"
              yesVotes={4}
              noVotes={1}
              totalEligible={12}
              isActive={true}
              onVote={setSelectedVote}
              selectedVote={selectedVote}
              userHasVoted={true}
            />

            <VoteProposal
              id="policy-003"
              title="Adopt a Quarterly Financial Review"
              description="Require organization stewards to publish a quarterly treasury review for member inspection"
              deadline="Completed"
              yesVotes={9}
              noVotes={1}
              totalEligible={12}
              isActive={false}
              onVote={setSelectedVote}
              selectedVote={selectedVote}
              userHasVoted={true}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="voting-now-heading">
            <p className="text-xs font-bold uppercase tracking-wider text-solon-orange">Available now</p>
            <h2 id="voting-now-heading" className="mt-1 font-display text-xl font-bold text-navy">Verification primitives</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <li>Canonical messages bind session, choice, and member address.</li>
              <li>Bitcoin signatures recover to registered organization members.</li>
              <li>Only active sessions and active member addresses are eligible.</li>
              <li>Stored vote weights contribute to the server-side tally.</li>
            </ul>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="voting-roadmap-heading">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Not in this build</p>
            <h2 id="voting-roadmap-heading" className="mt-1 font-display text-xl font-bold text-navy">Member workflow roadmap</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <li>Wallet-assisted signing and UI submission.</li>
              <li>Proposal creation, discussion, and administration.</li>
              <li>Anonymous or privacy-preserving voting modes.</li>
              <li>A dedicated historical audit workspace.</li>
            </ul>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}

function VoteProposal({ 
  id, 
  title, 
  description, 
  deadline, 
  yesVotes, 
  noVotes, 
  totalEligible, 
  isActive, 
  onVote, 
  userHasVoted,
  selectedVote,
}: {
  id: string;
  title: string;
  description: string;
  deadline: string;
  yesVotes: number;
  noVotes: number;
  totalEligible: number;
  isActive: boolean;
  onVote: (id: string) => void;
  userHasVoted: boolean;
  selectedVote: string | null;
}) {
  const yesPercentage = ((yesVotes / totalEligible) * 100).toFixed(1);
  const noPercentage = ((noVotes / totalEligible) * 100).toFixed(1);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-[var(--navy)]">{title}</h3>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {isActive ? 'Active' : 'Completed'}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Results ({yesVotes + noVotes}/{totalEligible} voted)</span>
          <span>{deadline}</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="flex h-full rounded-full overflow-hidden">
            <div className="bg-green-500" style={{ width: `${yesPercentage}%` }}></div>
            <div className="bg-red-500" style={{ width: `${noPercentage}%` }}></div>
          </div>
        </div>
        
        <div className="flex justify-between text-sm mt-2">
          <span className="text-green-600">Yes: {yesVotes} ({yesPercentage}%)</span>
          <span className="text-red-600">No: {noVotes} ({noPercentage}%)</span>
        </div>
      </div>

      {isActive && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {!userHasVoted ? (
            <>
              <button 
                type="button"
                onClick={() => onVote(`${id}:yes`)}
                className="min-h-11 rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition-colors hover:bg-green-700"
              >
                Vote Yes
              </button>
              <button 
                type="button"
                onClick={() => onVote(`${id}:no`)}
                className="min-h-11 rounded-lg bg-red-600 px-6 py-2 font-medium text-white transition-colors hover:bg-red-700"
              >
                Vote No
              </button>
            </>
          ) : (
            <div className="bg-gray-100 text-gray-600 px-6 py-2 rounded-lg font-medium">
              ✓ You have voted
            </div>
          )}
          <Link href={ROUTES.dashboardVoting} className="flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-6 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50">Continue to signed vote</Link>
        </div>
      )}
      {selectedVote?.startsWith(`${id}:`) && (
        <p role="status" className="mt-3 text-sm text-slate-600">
          {selectedVote.endsWith(':yes') ? 'Yes' : 'No'} selected. Continue to the signed voting workspace to submit it.
        </p>
      )}
    </div>
  );
}
