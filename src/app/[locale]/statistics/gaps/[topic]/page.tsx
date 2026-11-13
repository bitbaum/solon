import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ExplainPanel from "@/components/statistics/explain-panel";
import { GapsTopic } from "@/components/statistics/gaps-view";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { GAPS } from "@/lib/config/statistics/gaps";
import { SITE } from "@/lib/law/site";
import { localized } from "@/lib/places/place-view";
import { gapPlaceName, solonPlaceIds } from "@/lib/statistics/gap-places";
import { findTopic, topicHref, topicSlug } from "@/lib/statistics/gaps";
import { buildGapsBrief } from "@/lib/statistics/gaps-brief";

type Params = Promise<{ locale: string; topic: string }>;

export function generateStaticParams() {
  return GAPS.topics.map((t) => ({ topic: topicSlug(t.key) }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: raw, topic: segment } = await params;
  const topic = findTopic(GAPS.topics, segment);
  if (!topic) return {};
  const locale = toLocale(raw);
  const t = await getTranslations({ locale, namespace: "Statistics.gaps" });
  return {
    title: `${localized(topic.label, locale)} · ${t("metaTitle")}`,
    description: t("metaDescription"),
  };
}

export default async function GapsTopicPage({ params }: { params: Params }) {
  const { locale: raw, topic: segment } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const topic = findTopic(GAPS.topics, segment);
  if (!topic) notFound();
  const t = await getTranslations({ locale, namespace: "Statistics" });
  const selfUrl = `${SITE}${getPathname({ href: topicHref(topic.key), locale })}`;
  return (
    <GapsTopic
      topic={topic}
      coverage={GAPS.coverage}
      solonPlaces={solonPlaceIds()}
      locale={locale}
      selfUrl={selfUrl}
      t={t}
      explain={
        <ExplainPanel
          facts={buildGapsBrief(topic, GAPS.coverage, (id) => gapPlaceName(id, locale))}
          locale={locale}
          t={t}
          subject={{ kind: "gaps", topic: topic.key }}
        />
      }
    />
  );
}
