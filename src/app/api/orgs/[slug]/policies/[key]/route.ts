import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public read: the full version history of a policy. Version 1 is the seeded
 * bootstrap (approvedBySessionId null, labeled as such); every later version
 * references the APPROVED voting session that legitimated it.
 */
export async function GET(_: Request, ctx: { params: Promise<{ slug: string; key: string }> }) {
  const params = await ctx.params;
  const org = await prisma.organization.findUnique({ where: { slug: params.slug } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const versions = await prisma.policy.findMany({
    where: { organizationId: org.id, key: params.key },
    orderBy: { version: "desc" },
  });
  if (versions.length === 0) return NextResponse.json({ error: "Policy not found" }, { status: 404 });

  return NextResponse.json({
    organization: { id: org.id, slug: org.slug },
    key: params.key,
    active: versions.find((v) => v.status === "ACTIVE")?.version ?? null,
    versions: versions.map((v) => ({
      version: v.version,
      content: v.content,
      status: v.status,
      approvedBySessionId: v.approvedBySessionId,
      bootstrap: v.approvedBySessionId === null,
      activatedAt: v.activatedAt,
    })),
  });
}
