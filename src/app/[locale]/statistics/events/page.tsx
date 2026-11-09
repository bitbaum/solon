import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import EventsIndex from "@/components/statistics/events-index";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { filterEvents } from "@/lib/statistics/event-page";
import { loadEvents } from "@/lib/statistics/read";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ place?: string; kind?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Statistics" });
  return { title: t("events.metaTitle"), description: t("events.metaDescription") };
}

/** Every law event with its numbers, newest decision first. */
export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const { place = "", kind = "" } = await searchParams;
  const all = await loadEvents(db, placesConfig, locale);
  const places = [...new Map(all.map((e) => [e.placeCode, e.placeName])).entries()].map(
    ([code, name]) => ({ code, name }),
  );
  const t = await getTranslations({ locale, namespace: "Statistics" });
  return (
    <EventsIndex
      events={filterEvents(all, { place, kind })}
      places={places}
      filter={{ place, kind }}
      locale={locale}
      t={t}
    />
  );
}
