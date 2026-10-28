import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { loadLawCoverage } from "@/lib/law/register/coverage";

export const dynamic = "force-dynamic";

/** What the law register holds, per authority, counted from the data. */
export async function GET() {
  return NextResponse.json(await loadLawCoverage(db));
}
