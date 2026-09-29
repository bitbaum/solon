import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import PlaceProfile from "@/components/places/place-profile";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { loadPlacePage } from "@/lib/places/place-page";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; slug: string[] }>;

const today = () => new Date().toISOString().slice(0, 10);

const load = cache((slugPath: string, locale: string) =>
  loadPlacePage(db, placesConfig, slugPath, today(), locale),
);

const slugPathOf = (slug: string[]) => slug.map(decodeURIComponent).join("/");

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  const view = await load(slugPathOf(slug), locale);
  if (!view) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "Places" });
  const values = { name: view.name, level: view.levelName, pack: view.packName };
  return { title: t("metaTitle", values), description: t("metaDescription", values) };
}

/** One official place, by its path: /places/<pack>/<segment>/… (design §4.1, §9). */
export default async function PlacePage({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const view = await load(slugPathOf(slug), locale);
  if (!view) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "Places" });
  return <PlaceProfile view={view} t={t} />;
}
