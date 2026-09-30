import { setRequestLocale } from "next-intl/server";
import { Faq } from "bip-kit/react";
import "bip-kit/styles.css";
import PageLayout from "@/components/ui/page-layout";
import { toLocale } from "@/i18n/routing";
import { faqSections } from "@/lib/content/reading";

type Params = { params: Promise<{ locale: string }> };

export const dynamic = "force-static";

export const metadata = {
  title: "Questions and answers — Solon",
  description: "Short answers about Solon, from getting started to how votes are checked.",
};

/** The questions people ask first, from content/faq.md: plain ones first, technical ones last. */
export default async function FaqPage({ params }: Params) {
  setRequestLocale(toLocale((await params).locale));
  return (
    <PageLayout
      kicker="Help"
      title="Questions and answers"
      description="From getting started to how a vote can be recounted. Press a question to see its answer."
    >
      <div className="bp-theme">
        <Faq sections={faqSections()} />
      </div>
    </PageLayout>
  );
}
