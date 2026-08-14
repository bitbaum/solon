import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Public read: all proposals of an organization, newest first. */
export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const org = await prisma.organization.findUnique({ where: { slug: params.slug } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const proposals = await prisma.proposal.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      proposer: { select: { displayName: true, memberType: true, bitcoinAddress: true } },
      session: { select: { id: true, status: true, outcome: true, closesAt: true } },
    },
  });

  return NextResponse.json({
    organization: { id: org.id, slug: org.slug },
    proposals: proposals.map((p) => ({
      id: p.id,
      category: p.category,
      title: p.title,
      status: p.status,
      policyKey: p.policyKey,
      target: p.target,
      contentHash: p.contentHash,
      proposer: p.proposer,
      session: p.session,
      createdAt: p.createdAt,
    })),
  });
}
