import { crossPostUrl, sharedArticle } from "bip-kit";
import { ECOSYSTEM_PILLARS } from "@/lib/config/ecosystem";
import { SITE } from "@/lib/law/site";
import { blogPost } from "./reading";

/**
 * A blog post carried to OrangeCat in one tap. The post's JSON is served at
 * `/api/blog/<slug>` in bip-kit's cross-post shape; the link opens OrangeCat's
 * article composer filled in. Whoever presses it posts on their own wall, and
 * if they own Solon's project there, on Solon's wall too.
 */

/** Solon's project on OrangeCat, which OrangeCat preselects for its owner. */
export const ORANGECAT_PROJECT = "solon";

const orangecat =
  ECOSYSTEM_PILLARS.find((p) => p.key === "orangecat")?.url ?? "https://orangecat.ch";

export const postUrl = (slug: string) => `${SITE}/blog/${slug}`;

export const postJsonUrl = (slug: string) => `${SITE}/api/blog/${slug}`;

export const postOnOrangeCatUrl = (slug: string) =>
  crossPostUrl(`${orangecat}/articles/new`, postJsonUrl(slug), ORANGECAT_PROJECT);

/** The cross-post document for one post, or null when there is no such post. */
export function blogPostJson(slug: string) {
  const post = blogPost(slug);
  return post ? sharedArticle(post, postUrl(slug)) : null;
}
