import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";

export const metadata = { title: "How a vote is cast — Solon" };

/**
 * How a vote is cast, honestly: one click by default, a signature when a member
 * wants a vote anyone can recount. Live sessions render in /dashboard/voting
 * from the database — this page fabricates nothing.
 */
export default function VotingSystemPage() {
  return (
    <PageLayout
      kicker="How it works"
      title="How a vote is cast"
      description="One click for every member. A signature for anyone who wants a vote that can be recounted without trusting us."
    >
      <ol className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-10">
        {STEPS.map((s, i) => (
          <li key={s.title} className="border-t border-strong pt-6">
            <div className="font-mono text-sm text-fg-tertiary">0{i + 1}</div>
            <h2 className="mt-3 text-xl font-semibold text-fg-primary">{s.title}</h2>
            <p className="mt-3 text-fg-secondary">{s.body}</p>
          </li>
        ))}
      </ol>

      <section className="mt-24 grid gap-12 border-t border-subtle pt-16 lg:grid-cols-2 lg:gap-20">
        <div>
          <h2 className="headline text-3xl sm:text-4xl">Two ways to prove a vote</h2>
          <p className="mt-5 text-fg-secondary">
            Both count the same. Every vote on the record says which one it used, so nobody ever
            mistakes one for the other.
          </p>
        </div>
        <div className="divide-y divide-subtle border-y border-subtle">
          <div className="py-6">
            <h3 className="text-lg font-semibold text-fg-primary">One click</h3>
            <p className="mt-2 text-fg-secondary">
              You are signed in and hold a seat; pressing Vote is the vote. The record is
              Solon&apos;s word that your seat cast it — which is how almost every group votes
              today, only with every ballot on the record.
            </p>
          </div>
          <div className="py-6">
            <h3 className="text-lg font-semibold text-fg-primary">A signature</h3>
            <p className="mt-2 text-fg-secondary">
              You sign the exact text of your ballot with a key only you hold. The signature is
              published with the vote, so anyone can check it came from you and was not changed —
              without trusting Solon at all. The signed text names the session, the choice and the
              voter, so it cannot be lifted onto another vote.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-20">
        <Link href="/dashboard/voting" className="btn-frame">
          Go to the current vote
        </Link>
      </div>
    </PageLayout>
  );
}

const STEPS = [
  {
    title: "The rules are fixed",
    body: "A vote opens on a proposal. Who may vote, how votes are counted and how many must agree are frozen at that moment.",
  },
  {
    title: "Members vote",
    body: "Each member votes once — and may change their mind until the vote closes. Only the last ballot counts.",
  },
  {
    title: "Counted in the open",
    body: "The tally is computed from the stored ballots only, weighted by each member's public voting weight.",
  },
  {
    title: "Published for good",
    body: "The result and every ballot behind it go on the record, where nothing can be edited or removed.",
  },
];
