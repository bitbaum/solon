import PageLayout from '@/components/ui/page-layout';

/**
 * Explains the voting mechanism honestly. Live sessions and tallies render in
 * /dashboard/voting from the database — this page fabricates nothing.
 */
export default function VotingSystemPage() {
  return (
    <PageLayout
      title="Democratic Voting System"
      description="Votes are Bitcoin signed messages — verified cryptographically, not trusted"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-navy mb-4">How a vote works</h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>
              A voting session opens on a proposal. Its rules — who is eligible, the
              threshold, the quorum — are fixed when it opens.
            </li>
            <li>
              A member signs the canonical vote message (session id, choice, and their own
              address) with their Bitcoin wallet — Sparrow, Electrum, or Bitcoin
              Core&apos;s <code className="font-mono text-sm">signmessage</code>.
            </li>
            <li>
              The server recovers the public key from the signature and checks it resolves
              to a registered member. No signature, no vote — there is no other way in.
            </li>
            <li>
              The weighted tally is computed from stored, verified votes only, and every
              vote&apos;s signature stays on record so anyone can re-verify it.
            </li>
          </ol>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-navy mb-4">What this gives you</h2>
          <ul className="space-y-3 text-gray-700">
            <li>
              <span className="font-semibold">Cryptographic verification</span> — a vote is
              valid because the math says so, not because an administrator does.
            </li>
            <li>
              <span className="font-semibold">Replay protection</span> — the signed text
              binds session, choice, and voter, so a signature cannot be lifted onto
              another vote.
            </li>
            <li>
              <span className="font-semibold">Weighted voting</span> — members carry a
              voting weight; the tally is weighted accordingly and the weights are public.
            </li>
          </ul>
        </div>

        <div className="text-center">
          <a
            href="/dashboard/voting"
            className="inline-flex items-center justify-center bg-navy text-white px-8 py-3 rounded-lg hover:bg-navy-light transition-colors font-semibold"
          >
            Go to live voting
          </a>
        </div>
      </div>
    </PageLayout>
  );
}
