import Image from "next/image";
import Link from "next/link";
import FullBleed from "@/components/site/full-bleed";
import { MethodLab } from "@/components/learn/method-lab";
import { PHOTOS, type Photo } from "@/lib/content/photos";
import { HIRE_HREF } from "@/lib/site-config";

/**
 * The front door. A visitor should leave knowing three things: Solon runs how a
 * group decides, it keeps that in the open, and they can have it run for them.
 * Each section makes one of those points and offers one way forward.
 */
export default function Home() {
  return (
    <main>
      <FullBleed photo={PHOTOS.earthAtNight} priority under position="center 70%">
        <div className="rise max-w-4xl">
          <div className="kicker">Solon · Beta</div>
          <h1 className="headline-caps mt-5 text-5xl sm:text-6xl lg:text-8xl">
            Decide together.
            <br />
            In the open.
          </h1>
          <p className="mt-7 max-w-xl text-lg text-fg-primary sm:text-xl">
            Solon runs governance for companies, towns, associations and communities — proposals,
            votes and the books, where every member can see them.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href={HIRE_HREF} className="btn-frame-accent">
              Hire Solon
            </Link>
            <Link href="#how" className="btn-frame">
              How it works
            </Link>
          </div>
        </div>
      </FullBleed>

      <FullBleed photo={PHOTOS.landsgemeinde} position="center 65%" daylight>
        <div className="max-w-3xl">
          <div className="kicker">Glarus, Switzerland</div>
          <h2 className="headline-caps mt-5 text-4xl sm:text-5xl lg:text-6xl">
            The whole town. One square. Every hand counted.
          </h2>
          <p className="mt-6 max-w-xl text-lg text-fg-primary">
            For centuries the people of Glarus have made their laws in the open air: everyone hears
            the question, everyone sees the vote, everyone knows the result. Solon brings that to
            any group — at any size, from anywhere.
          </p>
          <div className="mt-9">
            <Link href="/governance" className="btn-frame">
              The art and science of governance
            </Link>
          </div>
        </div>
      </FullBleed>

      <section id="how" className="section-shell py-section">
        <div className="kicker">How it works</div>
        <h2 className="headline-caps mt-5 max-w-3xl text-4xl sm:text-5xl">
          Three steps. Nothing hidden.
        </h2>
        <ol className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, i) => (
            <li key={step.title} className="border-t border-strong pt-6">
              <div className="font-mono text-sm text-fg-tertiary">0{i + 1}</div>
              <h3 className="headline-caps mt-4 text-2xl">{step.title}</h3>
              <p className="mt-4 text-base leading-relaxed text-fg-secondary">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-subtle bg-surface-public py-section">
        <div className="section-shell">
          <div className="grid gap-10 lg:grid-cols-5 lg:gap-16">
            <div className="min-w-0 lg:col-span-2">
              <div className="kicker">The rules matter</div>
              <h2 className="headline-caps mt-5 text-4xl sm:text-5xl">
                Same people. Different rules. Different winner.
              </h2>
              <p className="mt-6 text-lg text-fg-secondary">
                Seven members, one shared fund, four ways to spend it. Change only how the question
                is asked and watch the winner change. Nothing here is a mock-up — it runs the same
                counting code as a real vote.
              </p>
              <div className="mt-9">
                <Link href="/governance/methods" className="btn-frame">
                  Choose how you count
                </Link>
              </div>
            </div>
            {/* min-w-0: the lab's table is wider than a phone and scrolls inside
                its own box — without this the grid column grows to fit it and
                the whole page scrolls sideways. */}
            <div className="min-w-0 rounded-surface border border-default bg-surface-base p-5 sm:p-7 lg:col-span-3">
              <MethodLab />
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell py-section">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <div className="kicker">The governance agent</div>
            <h2 className="headline-caps mt-5 text-4xl sm:text-5xl">
              Works for all of you. Never for one of you.
            </h2>
            <p className="mt-6 text-lg text-fg-secondary">
              Every group has more to keep track of than anyone has time for. Solon&apos;s
              governance agent does the clerk&apos;s work — in the open, under the same rules as
              everyone else.
            </p>
            <p className="mt-6 text-sm text-fg-tertiary">
              It proposes and reminds; people decide. Some decisions — who may join, and the rules
              themselves — only people can vote on. Being built with our first pilot groups.
            </p>
          </div>
          <ul className="divide-y divide-subtle border-y border-subtle">
            {AGENT_DUTIES.map((duty) => (
              <li key={duty.title} className="py-6">
                <h3 className="text-lg font-semibold text-fg-primary">{duty.title}</h3>
                <p className="mt-2 text-fg-secondary">{duty.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-subtle py-section">
        <div className="section-shell">
          <div className="kicker">Who it&apos;s for</div>
          <h2 className="headline-caps mt-5 max-w-3xl text-4xl sm:text-5xl">
            Any group that decides together.
          </h2>
          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {AUDIENCES.map((a) => (
              <AudienceTile key={a.title} {...a} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-subtle bg-surface-public py-section">
        <div className="section-shell">
          <div className="kicker">Why trust it</div>
          <h2 className="headline-caps mt-5 max-w-3xl text-4xl sm:text-5xl">
            Nothing hidden. Nothing rewritten.
          </h2>
          <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((p) => (
              <div key={p.title} className="border-t border-strong pt-6">
                <h3 className="text-lg font-semibold text-fg-primary">{p.title}</h3>
                <p className="mt-3 text-fg-secondary">{p.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-14">
            <Link href="/security" className="btn-frame">
              How Solon keeps itself honest
            </Link>
          </div>
        </div>
      </section>

      <FullBleed photo={PHOTOS.mountainValley} position="center 60%" daylight>
        <div className="max-w-3xl">
          <div className="kicker">Hire Solon</div>
          <h2 className="headline-caps mt-5 text-4xl sm:text-5xl lg:text-6xl">
            We&apos;ll run your governance with you.
          </h2>
          <p className="mt-6 max-w-xl text-lg text-fg-primary">
            Tell us about your group. We set up your rules together, run your first decisions, and
            keep the record. Free for pilot groups while Solon is in beta.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href={HIRE_HREF} className="btn-frame-accent">
              Talk to us
            </Link>
            <Link href="/orgs/new" className="btn-frame">
              Start on your own
            </Link>
          </div>
        </div>
      </FullBleed>
    </main>
  );
}

const STEPS = [
  {
    title: "Propose",
    body: "Anyone with a seat puts a question on the record, in plain words, with exactly what would change.",
  },
  {
    title: "Decide",
    body: "Members vote with one click, under rules the group chose: who votes, how votes are counted, how many must agree.",
  },
  {
    title: "Carry out",
    body: "The result is published with every vote behind it — so everyone knows what was decided, and can hold the people carrying it out to it.",
  },
];

const AGENT_DUTIES = [
  {
    title: "Writes it up",
    body: "Turns a request in plain words into a clear proposal that says exactly what would change.",
  },
  {
    title: "Keeps everyone in the loop",
    body: "Tells members what is up for decision, reminds them before a vote closes, and keeps the minutes.",
  },
  {
    title: "Follows the money",
    body: "Checks what was spent against what was decided, and raises anything nobody voted for.",
  },
  {
    title: "Explains, never persuades",
    body: "Sets out the case for and against every proposal, and explains every result in plain language.",
  },
];

const AUDIENCES: { title: string; body: string; photo: Photo; position: string }[] = [
  {
    title: "Companies",
    body: "Board and shareholder decisions, with a record nobody can quietly edit.",
    photo: PHOTOS.city,
    position: "center",
  },
  {
    title: "Villages and towns",
    body: "Assemblies, budgets and local rules — open to every resident, wherever they are.",
    photo: PHOTOS.village,
    position: "center 45%",
  },
  {
    title: "Associations and co-ops",
    body: "General meetings, elections and member votes, minuted as they happen.",
    photo: PHOTOS.assemblySeated,
    position: "center 30%",
  },
  {
    title: "Communities and new towns",
    body: "Groups online and new kinds of towns that want to govern themselves from day one.",
    photo: PHOTOS.europeFromOrbit,
    position: "center",
  },
];

const PROMISES = [
  {
    title: "Every vote on the record",
    body: "Members see every proposal, every vote and how it was counted.",
  },
  {
    title: "A record that only grows",
    body: "Nothing on the record can be edited or deleted — not even by us.",
  },
  {
    title: "We never hold your money",
    body: "Solon watches the accounts you register and shows where money went. It cannot spend.",
  },
  {
    title: "Proof when you need it",
    body: "Members can sign their votes with their own key, so anyone can recount them without trusting Solon.",
  },
];

function AudienceTile({
  title,
  body,
  photo,
  position,
}: {
  title: string;
  body: string;
  photo: Photo;
  position: string;
}) {
  return (
    <div className="relative flex min-h-[26rem] items-end overflow-hidden bg-surface-public">
      <Image
        src={photo.image}
        alt={photo.alt}
        fill
        placeholder="blur"
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover"
        style={{ objectPosition: position }}
      />
      <div className="scrim absolute inset-0" aria-hidden="true" />
      <div className="relative p-7 sm:p-9">
        <h3 className="headline-caps text-3xl">{title}</h3>
        <p className="mt-3 max-w-sm text-fg-primary">{body}</p>
      </div>
    </div>
  );
}
