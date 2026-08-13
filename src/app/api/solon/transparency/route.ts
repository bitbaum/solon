import { NextResponse } from "next/server";
import { readTransparencyEvidence } from "@/lib/solon/transparency";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('orgId');
  if (!orgId) return NextResponse.json({ success: false, error: 'orgId is required' }, { status: 400 });
  try {
    const evidence = await readTransparencyEvidence(orgId);
    if (!evidence) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: evidence });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to load transparency evidence' }, { status: 500 });
  }
}
