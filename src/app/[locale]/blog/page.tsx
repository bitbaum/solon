import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import { toLocale } from "@/i18n/routing";
import { blogPosts } from "@/lib/content/reading";

type Params = { params: Promise<{ locale: string }> };

export const dynamic = "force-static";

export const metadata = {
  title: "Blog — Solon",
  description: "What we build, and why, as we build it.",
};

/** Posts from content/blog/, newest first. */
export default async function BlogPage({ params }: Params) {
  setRequestLocale(toLocale((await params).locale));
  const posts = blogPosts();

  return (
    <PageLayout
      kicker="Blog"
      title="What we build, and why"
      description="Notes from building Solon in public: what changed, what we learned, and what is next."
    >
      <ul className="max-w-3xl space-y-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="block rounded-surface border border-default bg-surface-base p-5 transition-colors hover:bg-surface-raised"
            >
              <div className="text-xs text-fg-tertiary">
                {post.date} · {post.readingMinutes} min read
              </div>
              <h2 className="mt-1 headline text-display-3 text-fg-primary">{post.title}</h2>
              <p className="mt-2 text-sm text-fg-secondary">{post.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </PageLayout>
  );
}
