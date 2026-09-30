import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArticleBody, Toc } from "bip-kit/react";
import "bip-kit/styles.css";
import PageLayout from "@/components/ui/page-layout";
import { toLocale } from "@/i18n/routing";
import { whitepaper } from "@/lib/content/reading";

type Params = { params: Promise<{ locale: string }> };

export const dynamic = "force-static";

export function generateMetadata() {
  const paper = whitepaper();
  return paper ? { title: `${paper.title} — Solon`, description: paper.summary } : {};
}

/** The technical account of Solon, from content/whitepaper.md. */
export default async function WhitepaperPage({ params }: Params) {
  setRequestLocale(toLocale((await params).locale));
  const paper = whitepaper();
  if (!paper) notFound();
  const version = typeof paper.meta.version === "string" ? paper.meta.version : null;

  return (
    <PageLayout
      kicker={`Whitepaper${version ? ` · version ${version}` : ""} · ${paper.date}`}
      title={paper.title}
      description={paper.summary}
    >
      <div className="bp-theme grid gap-12 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <ArticleBody blocks={paper.blocks} />
        <aside className="hidden lg:block">
          <Toc items={paper.toc} />
        </aside>
      </div>
    </PageLayout>
  );
}
