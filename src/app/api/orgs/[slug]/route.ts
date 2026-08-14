import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public read: an organization and its member roster. Transparency is the
 * product — who can vote, with what weight, human or agent, is public record.
 * Private keys never exist here; addresses and public keys are the whole story.
 */
export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const params = await ctx.params;
  const org = await prisma.organization.findUnique({
    where: { slug: params.slug },
    include: {
      members: {
        select: {
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
        orderBy: { joinedAt: "asc" },
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
