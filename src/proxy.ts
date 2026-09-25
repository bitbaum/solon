import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Puts every page request in a language: `/de/hire` renders German, `/hire`
 * English. API routes, Next's own files and static assets are never touched —
 * a webhook or a decision document has no language.
 */
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
