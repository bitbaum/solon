import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  allocationReport,
  declareAllocation,
  type DeclareAllocationResult,
} from "@/lib/domain/allocation";

export const dynamic = "force-dynamic";

/**
 * Public read: how this organization's contributions are directed across the
 * tiers of government, and under what bounds.
 *
 * Everything needed to recompute the headline number is in the response —
 * every member's weight, their split, and how they are being counted — so the
 * aggregate is checkable rather than merely reported. `declared_weight_percent`
 * is the honesty field: it says how much of the split is anybody's stated
 * choice and how much is the published fallback standing in for silence.
 */
export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const params = await ctx.params;
  const org = await prisma.organization.findUnique({ where: { slug: params.slug } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const report = await allocationReport(org.id);

  return NextResponse.json({
    organization: { id: org.id, slug: org.slug, name: org.name },
    policy: {
      version: report.version,
      // Null version means nothing has been enacted and the code default is in
      // force — the widest legal bounds, constraining nobody.
      source: report.version === null ? "default" : "enacted",
      approved_by_session_id: report.approvedBySessionId,
      enacted_content_unreadable: report.enactedContentUnreadable,
      tiers: report.policy.tiers,
      fallback: report.policy.fallback,
    },
    split: report.aggregate.tiers.map((tier) => ({
      key: tier.key,
      label: tier.label,
      description: tier.description ?? null,
      percent: tier.displayPercent,
      exact_percent: tier.percent,
      declared_percent: tier.declaredPercent,
      floor_percent: tier.floorPercent,
      ceiling_percent: tier.ceilingPercent,
      watch_only_addresses: (report.tierSources[tier.key] ?? []).map((s) => ({
        label: s.label,
        address: s.address,
        explorer: `https://mempool.space/address/${s.address}`,
      })),
    })),
    participation: {
      ...report.aggregate.counts,
      declared_weight_percent: report.aggregate.declaredWeightPercent,
      eligible_weight: report.aggregate.weights.eligible,
      declared_weight: report.aggregate.weights.declared,
      fallback_weight: report.aggregate.weights.fallback,
    },
    declarations: report.declarations.map((d) => ({
      display_name: d.displayName,
      address: d.address,
      member_type: d.memberType,
      weight: d.weight,
      standing: d.standing,
      splits: d.splits,
      version: d.version,
      declared_under_policy_version: d.policyVersion,
      declared_at: d.declaredAt,
      violations: d.violations,
    })),
  });
}

const BodySchema = z.object({
  address: z.string().min(20).max(90),
  /** Whole percentage points per tier key, summing to 100. */
  splits: z.record(z.string(), z.number()),
  signature: z.string().min(1).max(200),
});

/**
 * The status each refusal earns.
 *
 * 401 is reserved for the signature actually failing. The bounds are checked
 * before the cryptography — deliberately, so an out-of-range split never
 * reaches it — which means "not verified" also covers submissions that never
 * got that far. Reporting those as 401 would send a member to look at their
 * wallet for a problem that is in their arithmetic.
 */
const DECLINE_STATUS: Record<NonNullable<DeclareAllocationResult["declined"]>, number> = {
  not_found: 404,
  invalid_split: 422,
  bad_signature: 401,
  not_a_member: 422,
  conflict: 409,
};

/**
 * Declare your own contribution split.
 *
 * No transport auth, exactly as with votes: the Bitcoin signature IS the
 * authorization, and it is the only thing that is. There is no operator route
 * to this table and no vote that reaches it — a majority may narrow the bounds
 * through an ALLOCATION_POLICY decision, but the split inside them is written
 * by one key and no other.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const params = await ctx.params;
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request body", details: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const result = await declareAllocation({ orgSlug: params.slug, ...parsed.data });
  if (!result.stored) {
    const status = result.declined ? DECLINE_STATUS[result.declined] : 422;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
