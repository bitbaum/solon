import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isSameOrigin } from "@/lib/auth/actor";
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
  address: z.string().min(20).max(90).optional(),
  signature: z.string().min(1).max(200).optional(),
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
 * The same credentials as claiming a seat: an OrangeCat session says who you
 * are (required), and a Bitcoin signature says which key is yours (optional).
 * The actor id is read from the session and never from the body, so
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

  const { address, signature } = parsed.data;
  if (Boolean(address) !== Boolean(signature)) {
    return NextResponse.json(
      { created: false, verified: false, reason: "a key needs both the address and the signature" },
      { status: 400 },
    );
  }
  if (!address && !isSameOrigin(req)) {
    return NextResponse.json(
      { created: false, verified: false, reason: "this request did not come from Solon" },
      { status: 403 },
    );
  }

  const result = await createOrganization({
    slug: parsed.data.slug,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    actorId: session.actorId,
    founderName: parsed.data.founderName,
    founderKey: address && signature ? { address, signature } : null,
    grant: parsed.data.grant ?? null,
  });

  if (!result.created) {
    return NextResponse.json(result, { status: STATUS[result.refusal ?? "invalid"] });
  }
  return NextResponse.json(result, { status: 201 });
}
