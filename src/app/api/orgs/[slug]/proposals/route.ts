import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { proposals as proposalsTable } from "@/lib/db/schema";
import { orgBySlug } from "@/lib/domain/org";

export const dynamic = "force-dynamic";

/** Public read: all proposals of an organization, newest first. */
export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const params = await ctx.params;
  const org = await orgBySlug(params.slug);
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const proposals = await db.query.proposals.findMany({
    where: eq(proposalsTable.organizationId, org.id),
    orderBy: desc(proposalsTable.createdAt),
    limit: 200,
    with: {
      proposer: { columns: { displayName: true, memberType: true, bitcoinAddress: true } },
      session: { columns: { id: true, status: true, outcome: true, closesAt: true } },
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
