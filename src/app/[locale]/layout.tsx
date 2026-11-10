// The design SSOT for OrangeCat, Loki and Solon: tokens AND the self-hosted
// faces they name. It must load before globals.css so app rules can override it.
import "@fleet/design-tokens/tokens.css";
// The sign-in error screen (SignInError) is drawn by this sheet.
import "@bitbaum/accountkit/styles.css";
import "../globals.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Navigation from "@/components/ui/navigation";
import { findIndex } from "@/lib/site/find-index";
import Footer from "@/components/ui/footer";
import TranslationNotice from "@/components/site/translation-notice";
import ThemeScript from "@/components/theme/theme-script";
import { authEnabled } from "@/lib/auth";
import { routing, toLocale } from "@/i18n/routing";

/**
 * Where this site actually serves. Next resolves the generated og:image against
 * `metadataBase`; without it the tag is emitted as http://localhost:3000/... —
 * present, plausible, and unfetchable by every social scraper.
 */
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://solon.orangecat.ch";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "Meta" });
  // What Solon is, said once: the home page's hero; search results and shared links repeat it.
  const hero = await getTranslations({ locale: toLocale(locale), namespace: "Home.hero" });
  const description = hero("lede");
  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description,
    icons: [{ rel: "icon", url: "/favicon.ico" }],
    openGraph: { title: "Solon", description, url: SITE_URL, siteName: "Solon" },
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, l === routing.defaultLocale ? "/" : `/${l}`]),
      ),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Light or dark follows the device unless the reader chose one in the
  // header (src/components/theme/). The head script sets the `dark` class,
  // `data-theme` and `color-scheme` before paint; the server's HTML has none
  // of them, hence suppressHydrationWarning — which covers this element's own
  // attributes only, not its children.
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-screen flex-col antialiased font-sans">
        <NextIntlClientProvider>
          <Navigation authEnabled={authEnabled} findEntries={findIndex(locale)} />
          <TranslationNotice />
          {/* No container: sections own their width so a photograph can
              reach the edges of the screen. */}
          <div className="flex-1">{children}</div>
          <Footer />
        </NextIntlClientProvider>
        {/* Loki feedback widget. The project token is a literal on purpose:
            read from process.env it would be tree-shaken to an empty string at
            `next build` and the script would never ship. */}
        <Script
          src="https://loki.orangecat.ch/widget.js"
          data-fc-project="fcw_83beae68488781ec1127c7801b55676d"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
