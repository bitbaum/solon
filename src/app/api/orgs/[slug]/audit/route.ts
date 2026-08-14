import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Public read: the append-only audit stream, newest first. */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const params = await ctx.params;
  const org = await prisma.organization.findUnique({ where: { slug: params.slug } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const limitParam = Number(new URL(req.url).searchParams.get("limit"));
  const take = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 200;

  const events = await prisma.auditEvent.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({
    organization: { id: org.id, slug: org.slug },
    events,
  });
}
