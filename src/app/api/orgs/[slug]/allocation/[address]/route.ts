import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { allocationHistory } from "@/lib/domain/allocation";

export const dynamic = "force-dynamic";

/**
 * Public read: everything one member has ever directed, newest first, each
 * version with the exact message signed and the signature over it.
 *
 * This is the endpoint that makes superseding meaningful. A split that could
 * only be read at its current value would let a change look like it had always
 * been that way; here every version a member replaced is still there, still
 * signed, so "what were they directing when that decision was taken" has an
 * answer nobody has to be trusted for.
 */
export async function GET(
  _: Request,
  ctx: { params: Promise<{ slug: string; address: string }> },
) {
  const params = await ctx.params;
  const org = await prisma.organization.findUnique({ where: { slug: params.slug } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const history = await allocationHistory(org.id, params.address);
  if (!history) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  return NextResponse.json({
    organization: { id: org.id, slug: org.slug },
    member: {
      display_name: history.member.displayName,
      address: history.member.bitcoinAddress,
    },
    versions: history.versions.map((v) => ({
      version: v.version,
      splits: v.splits,
      status: v.status,
      declared_under_policy_version: v.policyVersion,
      content_hash: v.contentHash,
      // The literal text the member signed, so a reader can verify the
      // signature themselves rather than take this record's word for it.
      signed_message: v.signedMessage,
      signature: v.signature,
      declared_at: v.declaredAt,
    })),
  });
}
