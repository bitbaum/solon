import { use } from "react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import { PHOTOS } from "@/lib/content/photos";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params) {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: "Credits",
  });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** Every photograph on the site, rendered from the same list the pages use. */
export default function CreditsPage({ params }: Params) {
  setRequestLocale(toLocale(use(params).locale));
  const t = useTranslations("Credits");
  const photos = Object.values(PHOTOS);
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
    </main>
  );
}
