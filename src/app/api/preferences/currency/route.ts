import { NextResponse } from "next/server";
import { CURRENCY_COOKIE, DISPLAY_CURRENCIES } from "@/lib/config/money";

/**
 * Remembers the currency a reader wants money in, for a year, and sends them
 * back where they were. A plain link does it, so choosing works without
 * JavaScript. Only a currency Solon offers is kept, and only a path on this
 * site is gone back to.
 */
export function GET(req: Request) {
  const url = new URL(req.url);
  const currency = url.searchParams.get("c") ?? "";
  const asked = url.searchParams.get("next") ?? "/";
  const next = asked.startsWith("/") && !asked.startsWith("//") ? asked : "/";
  const response = NextResponse.redirect(new URL(next, url.origin), 303);
  if ((DISPLAY_CURRENCIES as readonly string[]).includes(currency)) {
    response.cookies.set(CURRENCY_COOKIE, currency, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
}
