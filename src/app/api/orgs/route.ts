import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  createOrganization,
  listPublicOrganizations,
  type CreateOrganizationRefusal,
} from "@/lib/domain/organization";

export const dynamic = "force-dynamic";

/**
 * Public read: every organization, and which Loki project each governs by
 * consent. Who exists is public record here, and a register that must probe one
 * name at a time can never discover an organization it does not already know.
 */
export async function GET() {
  return NextResponse.json({ organizations: await listPublicOrganizations() });
}

const BodySchema = z.object({
  slug: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  description: z.string().max(500).nullish(),
  founderName: z.string().min(2).max(80),
  address: z.string().min(20).max(90),
  signature: z.string().min(1).max(200),
  grant: z
    .object({
      project: z.string().min(1).max(100),
      exp: z.number().int(),
      sig: z.string().length(64),
    })
    .nullish(),
});

const STATUS: Record<CreateOrganizationRefusal, number> = {
  invalid: 400,
  bad_signature: 401,
  bad_grant: 403,
  founding_limit: 403,
  slug_taken: 409,
  project_taken: 409,
};

/**
 * Found an organization.
 *
 * The same two credentials as claiming a seat, for the same reason: an
 * OrangeCat session says who you are, a Bitcoin signature says which key is
 * yours. The actor id is read from the session and never from the body, so
 * nobody can found an organization as somebody else — or present somebody
 * else's grant from Loki as their own.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.actorId) {
    return NextResponse.json(
      { created: false, verified: false, reason: "sign in with OrangeCat first" },
      { status: 401 },
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request body", details: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const result = await createOrganization({
    slug: parsed.data.slug,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    actorId: session.actorId,
    founderName: parsed.data.founderName,
    founderAddress: parsed.data.address,
    signature: parsed.data.signature,
    grant: parsed.data.grant ?? null,
  });

  if (!result.created) {
    return NextResponse.json(result, { status: STATUS[result.refusal ?? "invalid"] });
  }
  return NextResponse.json(result, { status: 201 });
}
