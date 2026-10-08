import { NextResponse } from "next/server";
import { toLocale } from "@/i18n/routing";
import { placesConfig } from "@/lib/config/places";
import { REGISTER_POLICY_DEFAULTS } from "@/lib/config/places/policies";
import { db } from "@/lib/db/client";
import { loadComparison } from "@/lib/places/compare";
import { comparedDay, comparedPaths } from "@/lib/places/compare-request";

export const dynamic = "force-dynamic";

/**
 * What /compare shows, as data (design §9.2): for each place asked (`?p=` a
 * slug path, repeatable, up to the compare limit), its chain, the facts its
 * pack's tax model reads, and the pack itself — everything an estimate needs.
 * `?on=` an ISO date (today by default), `?locale=`.
 *
 * It takes no income and computes no tax. The estimate runs wherever the income
 * is — the reader's browser on /compare, or another service on its own server —
 * so Solon never learns what anyone earns. Public data only; cacheable.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const on = comparedDay(params.get("on"), new Date().toISOString().slice(0, 10));
  if (!on) {
    return NextResponse.json({ error: "on must be an ISO date" }, { status: 400 });
  }
  const slugPaths = comparedPaths(params.getAll("p"), REGISTER_POLICY_DEFAULTS.compareLimit);
  if (slugPaths.length === 0) {
    return NextResponse.json({ error: "name at least one place with ?p=" }, { status: 400 });
  }
  const locale = toLocale(params.get("locale") ?? "en");
  const comparison = await loadComparison(db, placesConfig, slugPaths, on, locale);
  return NextResponse.json(comparison, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
