import Link from "next/link";
import FullBleed from "@/components/site/full-bleed";
import { PHOTOS } from "@/lib/content/photos";
import { CONTACT_EMAIL } from "@/lib/site-config";

export const metadata = {
  title: "Hire Solon — governance, run with you",
  description:
    "Solon sets up your group's rules with you, runs your decisions and keeps the record — for companies, towns, associations and communities.",
};

const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Governance for our group")}`;

/**
 * For someone deciding whether to have Solon run their group's governance.
 * What they need: what they get, who it suits, how it starts, what it costs.
 * One action: write to us.
 */
export default function HirePage() {
  return (
    <main>
      <FullBleed photo={PHOTOS.landsgemeinde} priority under position="center 65%" daylight>
        <div className="rise max-w-3xl">
          <div className="kicker">Hire Solon</div>
          <h1 className="headline-caps mt-5 text-5xl sm:text-6xl lg:text-7xl">
            Governance, run with you.
          </h1>
          <p className="mt-7 max-w-xl text-lg text-fg-primary sm:text-xl">
            You decide. We make sure every decision is asked clearly, counted fairly, and kept on a
            record your members can trust.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a href={MAILTO} className="btn-frame-accent">
              Talk to us
            </a>
            <Link href="#what-you-get" className="btn-frame">
              What you get
            </Link>
          </div>
        </div>
      </FullBleed>

      <section id="what-you-get" className="section-shell py-section">
        <div className="kicker">What you get</div>
        <h2 className="headline-caps mt-5 max-w-3xl text-4xl sm:text-5xl">
          Software, an agent, and people.
        </h2>
        <div className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-2">
          {OFFER.map((item, i) => (
            <div key={item.title} className="border-t border-strong pt-6">
              <div className="font-mono text-sm text-fg-tertiary">0{i + 1}</div>
              <h3 className="mt-3 text-2xl font-semibold text-fg-primary">{item.title}</h3>
              <p className="mt-3 max-w-lg text-fg-secondary">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-subtle bg-surface-public py-section">
        <div className="section-shell grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <div className="kicker">Who it suits</div>
            <h2 className="headline-caps mt-5 text-4xl sm:text-5xl">
              From a board of five to a town of thousands.
            </h2>
          </div>
          <ul className="divide-y divide-subtle border-y border-subtle">
            {GROUPS.map((g) => (
              <li key={g.title} className="py-6">
                <h3 className="text-lg font-semibold text-fg-primary">{g.title}</h3>
                <p className="mt-2 text-fg-secondary">{g.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-shell py-section">
        <div className="kicker">How it starts</div>
        <h2 className="headline-caps mt-5 max-w-3xl text-4xl sm:text-5xl">
          Three conversations, then your first decision.
        </h2>
        <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
          {START.map((s, i) => (
            <li key={s.title} className="border-t border-strong pt-6">
              <div className="font-mono text-sm text-fg-tertiary">0{i + 1}</div>
              <h3 className="headline-caps mt-4 text-2xl">{s.title}</h3>
              <p className="mt-4 text-fg-secondary">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-20 grid gap-10 border-t border-strong pt-10 lg:grid-cols-2">
          <div>
            <h3 className="headline text-3xl">What it costs</h3>
            <p className="mt-4 max-w-lg text-fg-secondary">
              Nothing, for pilot groups, while Solon is in beta. You get the full service; we learn
              what your group needs and build it. When pricing exists, it will be on this page
              before anyone is asked to pay it.
            </p>
          </div>
          <div className="flex flex-col items-start justify-end gap-4">
            <a href={MAILTO} className="btn-frame-accent">
              Write to {CONTACT_EMAIL}
            </a>
            <Link
              href="/orgs/new"
              className="text-sm text-fg-secondary underline underline-offset-4 hover:text-fg-primary"
            >
              Or start an organization on your own — it takes a minute
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

const OFFER = [
  {
    title: "Your rules, written down",
    body: "We work out with you how your group decides today — who votes, on what, how many must agree — and set it up so everyone can read it and change it by vote.",
  },
  {
    title: "Decisions, run end to end",
    body: "Proposals, votes, reminders and minutes, for meetings in a room, online, or both. Members vote with one click from wherever they are.",
  },
  {
    title: "The governance agent",
    body: "Drafts proposals from plain requests, keeps members informed, and checks what was spent against what was decided. It never takes a side, and never decides.",
  },
  {
    title: "A person when it matters",
    body: "A facilitator who knows how groups decide — for the founding meeting, the difficult vote, and the disagreement nobody wants to have.",
  },
];

const GROUPS = [
  {
    title: "Companies",
    body: "Board resolutions, shareholder votes and policies, on a record nobody can quietly edit.",
  },
  {
    title: "Villages and towns",
    body: "Assemblies, budgets and local rules, open to every resident — in the hall and from home.",
  },
  {
    title: "Associations and co-ops",
    body: "General meetings, elections and member votes, with the minutes written as it happens.",
  },
  {
    title: "Communities and new towns",
    body: "Online groups and new kinds of towns that want fair rules and an open record from the start.",
  },
];

const START = [
  {
    title: "Tell us",
    body: "Who your group is, how it decides today, and what goes wrong. Half an hour, no forms.",
  },
  {
    title: "Write the rules",
    body: "We draft your rules together — plainly enough that every member can read them.",
  },
  {
    title: "Decide",
    body: "Your first real decision runs on Solon, with us alongside. After that, it is yours.",
  },
];
