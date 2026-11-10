import { describe, expect, it } from "vitest";
import { blogPosts } from "@/lib/content/reading";
import { blogPostJson, postOnOrangeCatUrl } from "@/lib/content/cross-post";

describe("blog cross-post", () => {
  it("serves every post in the shape OrangeCat imports, links made absolute", () => {
    for (const post of blogPosts()) {
      const json = blogPostJson(post.slug);
      expect(json?.article.title).toBe(post.title);
      expect(json?.article.body.length).toBeGreaterThan(0);
      expect(json?.article.canonical).toMatch(new RegExp(`/blog/${post.slug}$`));
      expect(json?.article.body).not.toMatch(/\]\(\/(?!\/)/);
    }
  });

  it("returns null for an unknown post", () => {
    expect(blogPostJson("no-such-post")).toBeNull();
  });

  it("opens OrangeCat's composer with the post and Solon's project", () => {
    const url = new URL(postOnOrangeCatUrl("states-through-time"));
    expect(url.pathname).toBe("/articles/new");
    expect(url.searchParams.get("import")).toMatch(/\/api\/blog\/states-through-time$/);
    expect(url.searchParams.get("project")).toBe("solon");
  });
});
