import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArticleBody } from "bip-kit/react";
import "bip-kit/styles.css";
import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import { toLocale } from "@/i18n/routing";
import { blogPost, blogPosts } from "@/lib/content/reading";
import { postOnOrangeCatUrl } from "@/lib/content/cross-post";

type Params = { params: Promise<{ locale: string; slug: string }> };

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return blogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params) {
  const post = blogPost((await params).slug);
  return post ? { title: `${post.title} — Solon`, description: post.summary } : {};
}

export default async function BlogPostPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(toLocale(locale));
  const post = blogPost(slug);
  if (!post) notFound();

  return (
    <PageLayout
      kicker={`Blog · ${post.date}${post.author ? ` · ${post.author}` : ""}`}
      title={post.title}
      description={post.summary}
    >
      <div className="bp-theme max-w-3xl">
        <ArticleBody blocks={post.blocks} />
        <div className="mt-12 grid grid-cols-2 gap-3 border-t border-default pt-6 text-sm">
          <Link
            href="/blog"
            className="flex min-h-11 items-center text-fg-secondary transition-colors hover:text-fg-primary"
          >
            ← All posts
          </Link>
          <a
            href={postOnOrangeCatUrl(post.slug)}
            className="flex min-h-11 items-center justify-end text-fg-secondary transition-colors hover:text-fg-primary"
          >
            Post on OrangeCat →
          </a>
        </div>
      </div>
    </PageLayout>
  );
}
