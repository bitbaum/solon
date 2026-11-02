import type { MetadataRoute } from "next";
import { generateSitemaps } from "./sitemap";
import { SITE } from "@/lib/law/site";

export const dynamic = "force-dynamic";

/** The law is public and meant to be found, by people and by models; accounts and the chat's writes are not. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const sitemaps = await generateSitemaps();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/auth", "/api/chat"] }],
    sitemap: sitemaps.map(({ id }) => `${SITE}/sitemap/${id}.xml`),
    host: SITE,
  };
}
