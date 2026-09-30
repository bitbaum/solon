import { NextResponse } from "next/server";
import { foundingGaps, founderRule } from "@/lib/domain/founder";
import { unfoundedOrganizations } from "@/lib/domain/membership";

export const dynamic = "force-dynamic";

/**
 * Always 200 while the server answers: the fleet's uptime sweep reads 5xx as
 * down. What an operator must fix — an organization nobody can join — travels
 * as `warnings`, so it is seen before a visitor hits it.
 */
export async function GET() {
  try {
    const warnings = foundingGaps(await unfoundedOrganizations(), founderRule()).map(
      (gap) => gap.problem,
    );
    return NextResponse.json({ status: "ok", warnings });
  } catch (error) {
    console.error("health: founding check failed", error);
    return NextResponse.json({ status: "ok", warnings: ["founding check failed; see logs"] });
  }
}
