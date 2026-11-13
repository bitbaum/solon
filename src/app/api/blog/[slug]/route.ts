import { blogPosts } from "@/lib/content/reading";
import { blogPostJson } from "@/lib/content/cross-post";

/**
 * GET /api/blog/<slug> — one blog post as bip-kit's cross-post JSON, the shape
 * OrangeCat's article composer imports. Built with the site: the server that
 * runs on the box does not carry `content/`.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return blogPosts().map((post) => ({ slug: post.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const body = blogPostJson((await params).slug);
  if (!body) return Response.json({ error: "No such post" }, { status: 404 });
  return Response.json(body, { headers: { "access-control-allow-origin": "*" } });
}
