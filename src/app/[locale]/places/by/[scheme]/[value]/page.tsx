import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { checkIdentifier, findPlaceByIdentifier } from "@/lib/places/by-identifier";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; scheme: string; value: string }>;

/**
 * A place by a code it carries: `/places/by/iso_3166_2/US-WY`. It sends the
 * reader to the place's page, so law, OrangeCat and the globe can link to a
 * place by its code without knowing its path. A code nobody holds is a 404.
 */
export default async function PlaceByIdentifier({ params }: { params: Params }) {
  const { locale: raw, scheme, value } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const request = checkIdentifier(
    placesConfig,
    decodeURIComponent(scheme),
    decodeURIComponent(value),
  );
  if (!request) notFound();
  const path = await findPlaceByIdentifier(db, request, new Date().toISOString().slice(0, 10));
  if (!path) notFound();
  redirect({ href: `/places/${path}`, locale });
}
