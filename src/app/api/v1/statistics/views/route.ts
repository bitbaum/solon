import { NextResponse } from "next/server";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { findStatistic } from "@/lib/statistics/present";
import { saveView, viewPath, viewSpecSchema } from "@/lib/statistics/views";

export const dynamic = "force-dynamic";

/**
 * Save a chart view: a form post (`spec`, `locale`) answers with a redirect to
 * the saved view's page; a JSON post (`{ spec }`) answers with its hash and
 * address. The address is the sha256 of the spec, so saving the same view
 * twice gives the same address and writes nothing new.
 */
export async function POST(req: Request) {
  const form = req.headers.get("content-type")?.includes("application/json")
    ? null
    : await req.formData().catch(() => null);
  let raw: unknown;
  let locale = toLocale("en");
  try {
    if (form) {
      raw = JSON.parse(String(form.get("spec") ?? ""));
      locale = toLocale(String(form.get("locale") ?? "en"));
    } else {
      raw = ((await req.json()) as { spec?: unknown }).spec;
    }
  } catch {
    return NextResponse.json({ error: "spec is not JSON" }, { status: 400 });
  }
  const parsed = viewSpecSchema.safeParse(raw);
  if (!parsed.success || !findStatistic(placesConfig, parsed.data.metric)) {
    return NextResponse.json({ error: "not a view of a statistic" }, { status: 400 });
  }
  const sha256 = await saveView(db, parsed.data, (await auth())?.actorId ?? null);
  const path = getPathname({ href: viewPath(sha256), locale });
  if (form) {
    return NextResponse.redirect(new URL(path, req.url), 303);
  }
  return NextResponse.json({ sha256, path }, { status: 201 });
}
