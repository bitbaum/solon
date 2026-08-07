import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { treasuryReport } from "@/lib/domain/treasury";

export const dynamic = "force-dynamic";

/**
 * Watch-only treasury balances for an organization (by id or slug). Every
 * number is read live from the chain; a failed lookup reports null, never a
 * substitute.
 */
export async function GET(_: Request, { params }: { params: { orgId: string } }) {
  const { orgId } = params;
  const org = await prisma.organization.findFirst({
    where: { OR: [{ id: orgId }, { slug: orgId }] },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const report = await treasuryReport(org.id);
  return NextResponse.json({
    organization: { id: org.id, slug: org.slug, name: org.name },
    balance_source: "onchain",
    total_sats: report.totalSats,
    all_sources_resolved: report.allSourcesResolved,
    sources: report.sources.map((s) => ({
      label: s.label,
      address: s.address,
      total_sats: s.totalSats,
      tx_count: s.txCount,
      explorer: `https://mempool.space/address/${s.address}`,
    })),
  });
}
