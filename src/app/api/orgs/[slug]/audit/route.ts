import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditEvents } from "@/lib/db/schema";
import { orgBySlug } from "@/lib/domain/org";

export const dynamic = "force-dynamic";

/** Public read: the append-only audit stream, newest first. */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const params = await ctx.params;
  const org = await orgBySlug(params.slug);
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const limitParam = Number(new URL(req.url).searchParams.get("limit"));
  const take = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 200;

  const events = await db.query.auditEvents.findMany({
    where: eq(auditEvents.organizationId, org.id),
    orderBy: desc(auditEvents.createdAt),
    limit: take,
  });

  return NextResponse.json({
    organization: { id: org.id, slug: org.slug },
    events,
  });
}
