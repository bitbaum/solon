import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { COUNTRY_PACKS } from "@/lib/config/places/countries";
import { WORLD } from "@/lib/config/world";
import { redirectWorldSlug, worldSlugRedirects } from "@/lib/places/world-slug-redirects";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);
const SLUG_REDIRECTS = worldSlugRedirects(COUNTRY_PACKS, WORLD);

/**
 * Puts every page request in a language: `/de/hire` renders German, `/hire`
 * English. API routes, Next's own files and static assets are never touched —
 * a webhook or a decision document has no language. A world-list slug of a
 * country Solon holds places for (`/places/united-states/wyoming`) answers
 * 308 to the pack's path, so one place has one page.
 */
export default function proxy(request: NextRequest) {
  const target = redirectWorldSlug(request.nextUrl.pathname, SLUG_REDIRECTS);
  if (target) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    return NextResponse.redirect(url, 308);
  }
  return intl(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
