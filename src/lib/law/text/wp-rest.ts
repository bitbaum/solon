/**
 * A WordPress site's posts through its REST API, the format the President of
 * the Republic of South Ossetia publishes decrees in (PRESIDENTRUO in
 * src/lib/config/law): `/wp-json/wp/v2/posts?categories=…`, a hundred to a
 * page, `X-WP-TotalPages` saying how many. A format reader only: which
 * categories, which authority and which kinds are config.
 */
import { decodeEntities } from "./html-text";

export interface WpPost {
  id: string;
  /** The day the site dated the post (`YYYY-MM-DD`): the decree's own date is in its text. */
  date: string;
  link: string;
  title: string;
}

/** Posts as the API returns them; anything else fails loudly, so a changed API is noticed. */
export function parsePosts(json: unknown): WpPost[] {
  if (!Array.isArray(json)) throw new Error("the posts endpoint did not return a list");
  return json.map((item) => {
    const o = item as {
      id?: unknown;
      date?: unknown;
      link?: unknown;
      title?: { rendered?: unknown };
    };
    if (
      typeof o.id !== "number" ||
      typeof o.date !== "string" ||
      typeof o.link !== "string" ||
      typeof o.title?.rendered !== "string"
    ) {
      throw new Error(`a post has an unexpected shape: ${JSON.stringify(item).slice(0, 120)}`);
    }
    return {
      id: String(o.id),
      date: o.date.slice(0, 10),
      link: o.link,
      title: decodeEntities(o.title.rendered.replace(/<[^>]+>/g, ""))
        .replace(/\s+/g, " ")
        .trim(),
    };
  });
}
