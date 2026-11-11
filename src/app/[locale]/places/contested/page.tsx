import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import ContestIndex from "@/components/places/contest-index";
import { contestSummaries } from "@/lib/places/contest-view";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Places" });
  return { title: t("contested.indexTitle"), description: t("contested.indexIntro") };
}

/** Every claimed place, the most compared first (design `2026-11-contested-law.md` §4.2). */
export default async function ContestedPlacesPage({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Places" });
  const places = contestSummaries(locale).sort(
    (a, b) => b.compared - a.compared || a.name.localeCompare(b.name, locale),
  );
  return <ContestIndex places={places} t={t} />;
}
