import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { SessionStatus } from "@/lib/db/enums";
import { auth } from "@/lib/auth";
import { memberForActor } from "@/lib/auth/recognition";
import { db } from "@/lib/db/client";
import { organizations, proposals, votes, votingSessions } from "@/lib/db/schema";
import { genesisOpen } from "@/lib/domain/membership";

interface NextStep {
  headline: string;
  detail: string;
  href: string;
  cta: string;
}

/**
 * Resolves the single most useful thing *this* viewer can do right now.
 *
 * There is deliberately one answer rather than a menu: the dashboard already
 * lists what exists, and a page that offers five equal options is how a user
 * ends up doing none of them. Order matters — an open vote you have not cast
 * beats everything else, because it expires.
 */
async function nextStep(orgSlug: string): Promise<NextStep> {
  const session = await auth();

  if (!session?.actorId) {
    return {
      headline: "Sign in to take part",
      detail: "Reading needs no account. Voting needs an identity on the roster and a Bitcoin key.",
      href: "/join",
      cta: "Get started",
    };
  }

  const member = await memberForActor(session.actorId);

  if (!member) {
    const open = await genesisOpen(orgSlug);
    return open
      ? {
          headline: "The founding seat is unclaimed",
          detail:
            "No human is on this roster yet. Sign a message with a Bitcoin key you control and the seat is yours.",
          href: "/join",
          cta: "Claim the seat",
        }
      : {
          headline: "You are signed in as an observer",
          detail:
            "Admission is decided by a membership vote. Everything on the record is already open to you.",
          href: "/proposals",
          cta: "Read the proposals",
        };
  }

  const active = await db.query.votingSessions.findFirst({
    where: and(
      eq(votingSessions.status, SessionStatus.ACTIVE),
      inArray(
        votingSessions.proposalId,
        db
          .select({ id: proposals.id })
          .from(proposals)
          .innerJoin(organizations, eq(proposals.organizationId, organizations.id))
          .where(eq(organizations.slug, orgSlug)),
      ),
    ),
    orderBy: desc(votingSessions.opensAt),
    with: { proposal: true },
  });

  if (active) {
    const alreadyVoted = await db.query.votes.findFirst({
      where: and(eq(votes.sessionId, active.id), eq(votes.memberId, member.id)),
    });
    if (!alreadyVoted) {
      return {
        headline: "A vote is open and you have not cast one",
        detail: `${active.proposal.title} — closes ${active.closesAt.toISOString().slice(0, 10)}.`,
        href: `/proposals/${active.proposalId}`,
        cta: "Cast your vote",
      };
    }
  }

  const draft = await db.query.proposals.findFirst({
    where: and(
      eq(proposals.status, "DRAFT"),
      inArray(
        proposals.organizationId,
        db
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.slug, orgSlug)),
      ),
    ),
    orderBy: desc(proposals.createdAt),
  });
  if (draft) {
    return {
      headline: "A proposal is waiting to be opened",
      detail: `${draft.title} — nobody can vote until its session starts.`,
      href: `/proposals/${draft.id}`,
      cta: "Open it for voting",
    };
  }

  return {
    headline: "Nothing is waiting on you",
    detail: "No open vote, no proposal pending. Put something on the record.",
    href: "/propose",
    cta: "File a proposal",
  };
}

export default async function NextAction({ orgSlug }: { orgSlug: string }) {
  const step = await nextStep(orgSlug);
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-surface border border-default bg-surface-raised p-5">
      <div className="min-w-0">
        <h2 className="font-semibold text-fg-primary">{step.headline}</h2>
        <p className="mt-1 text-sm text-fg-secondary">{step.detail}</p>
      </div>
      <Link href={step.href} className="btn-primary shrink-0">
        {step.cta}
      </Link>
    </section>
  );
}
