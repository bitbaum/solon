import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { members, organizations } from "@/lib/db/schema";
import { profileFor } from "@/lib/config/governance-profiles";

export const dynamic = "force-dynamic";

/**
 * Public read: an organization and its member roster. Transparency is the
 * product — who can vote, with what weight, human or agent, is public record.
 * Private keys never exist here; addresses and public keys are the whole story.
 */
export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const params = await ctx.params;
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, params.slug),
    with: {
      members: {
        columns: {
          id: true,
          displayName: true,
          memberType: true,
          keyCustody: true,
          bitcoinAddress: true,
          publicKeyHex: true,
          votingWeight: true,
          status: true,
          system: true,
          holdsMandate: true,
          mandateUntil: true,
          joinedAt: true,
        },
        orderBy: asc(members.joinedAt),
      },
    },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  return NextResponse.json({
    id: org.id,
    slug: org.slug,
    name: org.name,
    description: org.description,
    createdAt: org.createdAt,
    // Who decides is part of what a prospective member is joining, so it is
    // published beside the roster rather than left to be inferred from it.
    governance: {
      profile: profileFor(org.governanceProfile).id,
      label: profileFor(org.governanceProfile).label,
      whoDecides: profileFor(org.governanceProfile).whoDecides,
    },
    members: org.members.map((m) => ({ ...m, votingWeight: Number(m.votingWeight) })),
  });
}
