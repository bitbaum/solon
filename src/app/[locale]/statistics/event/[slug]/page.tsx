import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import EventView from "@/components/statistics/event-view";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { SITE } from "@/lib/law/site";
import { localized } from "@/lib/places/place-view";
import { loadEventPage } from "@/lib/statistics/event-page";
import { eventPath } from "@/lib/statistics/present";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  const page = await loadEventPage(db, placesConfig, slug, locale);
  if (!page) return {};
  const t = await getTranslations({ locale, namespace: "Statistics" });
  const title = localized(page.event.body.title, locale);
  return {
    title: t("event.metaTitle", { title }),
    description: t("event.metaDescription", { title }),
  };
}

/** One law event: what changed, how it came about, who stood where, and what the numbers did. */
export default async function EventPage({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const page = await loadEventPage(db, placesConfig, slug, locale);
  if (!page) notFound();
  const t = await getTranslations({ locale, namespace: "Statistics" });
  const selfUrl = `${SITE}${getPathname({ href: eventPath(slug), locale })}`;
  return <EventView {...page} locale={locale} selfUrl={selfUrl} t={t} />;
}
