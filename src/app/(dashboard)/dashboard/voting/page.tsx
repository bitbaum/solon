import VotingInterface from "@/components/dashboard/voting-interface";
import VotingWalletConnector from "./VotingWalletConnector";
import { prisma } from "@/lib/db";
import { Democracy } from "@/lib/solon/democracy";
import { Suspense } from "react";
import type { VoteTally } from "@/lib/solon/vote-policy";

export default async function VotingPage({ searchParams }: { searchParams: { address?: string } }) {
  let session: any;
  let tally: VoteTally | null = null;
  let isSample = false;
  try {
    session = await prisma.voting_sessions.findFirst({ orderBy: { start_date: 'desc' } });
    if (session) tally = await new Democracy().tally(session.id);
  } catch {
    isSample = true;
  }
  if (!session) isSample = true;
  session = session || {
    id: 'demo-session',
    title: 'Adopt Bitcoin-Treasury Budget 2025',
    voting_type: 'simple_majority',
    status: 'active',
    organization_id: 'demo-org',
    decision_id: null,
    start_date: new Date(),
    bitcoin_signature_required: true
  } as any;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-navy">Cast a verifiable vote</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Follow the two steps below. Solon never asks for or stores your private key.</p>
      </header>
      {isSample && (
        <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <strong>Sample mode:</strong> no voting session could be loaded from the database. You can inspect the flow below, but it cannot submit a real vote.
        </div>
      )}
      <Suspense>
        <VotingWalletConnector />
      </Suspense>
      <VotingInterface
        session={{ ...(session as any), tally: tally ?? undefined }}
        userWallet={searchParams.address ?? ''}
        canVote={!isSample}
        tallyAvailable={tally !== null}
      />
    </div>
  );
}
