import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * What a reader sees at an address Solon does not serve: an unknown series, place, law or path. Inside the
 * locale layout, so the navigation and footer are there and the words are in the reader's language; never a
 * blank page (No dead ends: it says what happened and where to go next).
 */
export default function NotFound() {
  const t = useTranslations("NotFound");
  const s = useTranslations("Site.links");
  const ways = [
    { href: "/law", label: s("law") },
    { href: "/places", label: s("places") },
    { href: "/statistics", label: s("statistics") },
    { href: "/law/ask", label: s("lawAsk") },
  ] as const;
  return (
    <main className="section-shell py-section-tight">
      <div className="kicker">{t("kicker")}</div>
      <h1 className="headline mt-5 text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-5 max-w-copy text-fg-secondary">{t("lede")}</p>
      <ul className="mt-10 max-w-copy divide-y divide-subtle border-y border-subtle">
        {ways.map((w) => (
          <li key={w.href}>
            <Link
              href={w.href}
              className="block py-4 font-semibold text-fg-primary hover:underline"
            >
              {w.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
