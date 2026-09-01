import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { members, organizations } from "@/lib/db/schema";

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
    members: org.members.map((m) => ({ ...m, votingWeight: Number(m.votingWeight) })),
  });
}
