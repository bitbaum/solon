import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { PHOTOS } from "@/lib/content/photos";
import { allPlacePhotos } from "@/lib/places/place-photo";

type Params = { params: Promise<{ locale: string }> };
type Search = { searchParams: Promise<{ page?: string }> };

/** Place photographs per page: thousands of places, one readable list each. */
const PER_PAGE = 400;

export async function generateMetadata({ params }: Params) {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: "Credits",
  });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** Every photograph on the site, rendered from the same list the pages use. */
export default function CreditsPage({ params, searchParams }: Params & Search) {
  setRequestLocale(toLocale(use(params).locale));
  const t = useTranslations("Credits");
  const photos = Object.values(PHOTOS);
  // The photographs on places' pages, read from Wikimedia Commons by `pnpm run places:photos`.
  const all = allPlacePhotos();
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(use(searchParams).page) || 1));
  const places = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  return (
    <main className="section-shell py-section-tight">
      <div className="kicker">{t("kicker")}</div>
      <h1 className="headline mt-5 text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-5 max-w-copy text-fg-secondary">{t("lede")}</p>
      <ul className="mt-12 divide-y divide-subtle border-y border-subtle">
        {photos.map((p) => (
          <li key={p.source} className="grid gap-2 py-6 sm:grid-cols-3 sm:gap-6">
            <a
              href={p.source}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-fg-primary underline underline-offset-4"
            >
              {p.title}
            </a>
            <div className="text-fg-secondary">{p.author}</div>
            <div className="text-fg-secondary">
              {p.licenseUrl ? (
                <a
                  href={p.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {p.license}
                </a>
              ) : (
                p.license
              )}
            </div>
          </li>
        ))}
      </ul>
      {all.length > 0 && (
        <section className="mt-16" aria-labelledby="place-photos">
          <h2 id="place-photos" className="headline text-2xl text-fg-primary">
            {t("placesTitle")}
          </h2>
          <p className="mt-3 max-w-copy text-fg-secondary">{t("placesLede")}</p>
          <ul className="mt-8 divide-y divide-subtle border-y border-subtle text-sm">
            {places.map((p) => (
              <li key={p.page} className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-6">
                <a
                  href={p.page}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-words text-fg-primary underline underline-offset-4"
                >
                  {p.file}
                </a>
                <div className="break-words text-fg-secondary">{p.author}</div>
                <div className="text-fg-secondary">
                  {p.licenseUrl ? (
                    <a
                      href={p.licenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4"
                    >
                      {p.license}
                    </a>
                  ) : (
                    p.license
                  )}
                </div>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav aria-label={t("placesPages")} className="mt-6">
              <ol className="flex flex-wrap gap-2 text-sm">
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <li key={n}>
                    <Link
                      href={`/credits?page=${n}#place-photos`}
                      aria-current={n === page ? "page" : undefined}
                      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-default ${
                        n === page
                          ? "bg-surface-raised font-semibold text-fg-primary"
                          : "text-fg-secondary"
                      }`}
                    >
                      {n}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </section>
      )}
    </main>
  );
}
