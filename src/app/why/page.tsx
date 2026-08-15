import Link from "next/link";
import PageLayout from "@/components/ui/page-layout";

const TENETS = [
  {
    title: "The town is the unit",
    body: "Small enough to read the books. Large enough to feed, house, and judge itself. Not a smaller country — the scale that does not need a center to be real.",
  },
  {
    title: "Exit is always open",
    body: "A person can leave a town. A town can leave a federation. A rule you cannot walk away from is a cage. Voting without exit has never been enough.",
  },
  {
    title: "Verify, don't trust",
    body: "The software a town runs must be readable. Votes are signatures anyone can recount. The treasury is watch-only. A government you cannot inspect is a government you cannot have.",
  },
  {
    title: "The guest is sacred; the door is yours",
    body: "Peace, trade, and movement between towns. Hospitality is not the opposite of a threshold. Respect the host, or leave.",
  },
];

export default function WhyPage() {
  return (
    <PageLayout
      title="Why a town"
      description="Solon exists so a community can govern itself in a way a stranger can check. The name of that idea is Townsism."
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-8 rounded-control border border-default bg-surface-base p-8">
          <p className="text-lg leading-relaxed text-fg-primary">
            Power belongs at the smallest scale that can actually hold it —
            the town — and every larger layer exists only by the towns&apos;
            consent.
          </p>
          <p className="mt-4 leading-relaxed text-fg-secondary">
            Solon is not a country and not a secession kit. It is the
            governance organ: Bitcoin-signed votes, a watch-only treasury, an
            append-only record. Software can make a town legible. It cannot
            confer sovereignty. Recognition is earned in the world; this
            page is the why, not a flag.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TENETS.map((t) => (
            <div
              key={t.title}
              className="rounded-control border border-default bg-surface-base p-6"
            >
              <h2 className="text-lg font-bold text-fg-primary">{t.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
                {t.body}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-control border border-default bg-surface-base p-8">
          <h2 className="text-xl font-bold text-fg-primary">
            What this site will not pretend
          </h2>
          <ul className="mt-4 space-y-3 text-fg-secondary">
            <li>
              We do not tell you to break the law of the place you live. Tax
              that is owed is owed.
            </li>
            <li>
              A ministry that can override a town and a platform that can
              deplatform a town are the same shape. Townsism is against the
              silent veto, wherever it sits.
            </li>
            <li>
              &ldquo;Abolish the middle layer&rdquo; is a mood.
              &ldquo;Make it unnecessary&rdquo; is the work — a town that
              runs its books, signs its votes, pays what it legally owes,
              and keeps the door honest.
            </li>
          </ul>
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/ecosystem"
            className="inline-flex items-center justify-center rounded-control bg-accent px-8 py-3 font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            See it running
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center justify-center rounded-control bg-surface-raised px-8 py-3 font-semibold text-fg-primary transition-colors hover:bg-surface-overlay"
          >
            How Solon works
          </Link>
          <a
            href="https://github.com/maonakamoto/solon/blob/main/docs/TOWNSISM.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-control bg-surface-raised px-8 py-3 font-semibold text-fg-primary transition-colors hover:bg-surface-overlay"
          >
            Full essay
          </a>
        </div>
      </div>
    </PageLayout>
  );
}
