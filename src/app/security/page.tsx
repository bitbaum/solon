import Link from "next/link";
import PageLayout from "@/components/ui/page-layout";
import { SOLON_GITHUB_URL } from "@/lib/config/ecosystem";

export const metadata = {
  title: "Security — Solon",
  description:
    "Why Solon can be trusted with a group's decisions: what it refuses to hold, and what anyone can check.",
};

/**
 * The trust page, stated plainly for someone deciding whether to put their
 * group's decisions here. Every claim maps to code in this repo — nothing
 * aspirational. The strongest claims are what Solon does NOT have: your money,
 * your keys, or a way to rewrite what happened.
 */
export default function SecurityPage() {
  return (
    <PageLayout
      kicker="Security"
      title="What we refuse to hold"
      description="Solon's security comes from what it cannot do: it holds no money, keeps no one's keys, and cannot rewrite what happened."
    >
      <div className="grid gap-x-10 gap-y-14 md:grid-cols-2">
        {GUARANTEES.map((g) => (
          <section key={g.title} className="border-t border-strong pt-6">
            <h2 className="text-2xl font-semibold text-fg-primary">{g.title}</h2>
            <p className="mt-3 max-w-xl text-fg-secondary">{g.body}</p>
            <ul className="mt-5 space-y-2 text-sm text-fg-secondary">
              {g.details.map((d) => (
                <li key={d} className="flex gap-3">
                  <span className="mt-2 h-1 w-3 shrink-0 bg-accent" aria-hidden="true" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-24 border-t border-subtle pt-16">
        <h2 className="headline-caps text-3xl sm:text-4xl">What this buys you</h2>
        <div className="mt-10 grid gap-10 md:grid-cols-3">
          {OUTCOMES.map((o) => (
            <div key={o.title}>
              <h3 className="text-lg font-semibold text-fg-primary">{o.title}</h3>
              <p className="mt-2 text-fg-secondary">{o.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 sm:flex-row">
          <Link href="/governance/voting" className="btn-frame">
            How a vote is cast
          </Link>
          <Link href="/governance/audit" className="btn-frame">
            The live record
          </Link>
          <a
            href={SOLON_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-frame"
          >
            The source code
          </a>
        </div>
      </section>
    </PageLayout>
  );
}

const GUARANTEES = [
  {
    title: "We never hold your money",
    body: "Solon watches the accounts a group registers and shows where money went. There is no code path that can spend.",
    details: [
      "A treasury is an address to observe — a label and an address, nothing more",
      "Balances are read from the public chain, not from Solon's own numbers",
    ],
  },
  {
    title: "We never hold anyone's keys",
    body: "Nothing on Solon's servers lets an attacker vote as someone else with a signature, or move a single coin.",
    details: [
      "Members who sign keep their key in their own wallet",
      "Agent members (the Cat, Loki) sign on their own machines — Solon only ever sees signatures",
    ],
  },
  {
    title: "Every vote says what proves it",
    body: "A member votes with one click while signed in, or signs with their own key. Every vote and proposal records which.",
    details: [
      "A one-click vote is Solon's record of a signed-in member's choice — convenient, and it asks you to trust Solon",
      "A signed vote is accepted only if it matches the member's registered key, and anyone can re-check it",
      "One ballot per member per vote; voting again replaces it until the vote closes",
    ],
  },
  {
    title: "The record only grows",
    body: "Every step — a proposal, a vote opening, each ballot, the result — is written once. Nothing in the code can edit or delete it.",
    details: [
      "The public record shows the entries themselves, not a summary of them",
      "The rules a vote ran under are frozen when it opens, so a later change cannot rewrite a past decision",
      "Every decision is published as one document with everything needed to recount it",
    ],
  },
];

const OUTCOMES = [
  {
    title: "Nothing to seize",
    body: "Breaking into Solon's servers yields no keys and no money — only records that were already public.",
  },
  {
    title: "Nothing to forge",
    body: "A signed vote cannot be faked by anyone, Solon included. Groups that want that guarantee for a decision can ask members to sign.",
  },
  {
    title: "Nothing to rewrite",
    body: "A decision travels with its evidence. Anyone relying on it can recount it themselves — Solon's word is evidence, not authority.",
  },
];
