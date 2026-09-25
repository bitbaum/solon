import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Logo from "./logo";
import { ECOSYSTEM_PILLARS, SOLON_GITHUB_URL } from "@/lib/config/ecosystem";
import { CONTACT_EMAIL, SITE_SECTIONS } from "@/lib/site-config";

/**
 * The whole site, one scroll away. The header carries three links; this is
 * where every other page is found, rendered from the same SITE_SECTIONS the
 * mobile menu uses — so a page removed there cannot linger here.
 */
export default function Footer() {
  const siblings = ECOSYSTEM_PILLARS.filter((p) => p.key !== "solon");
  const t = useTranslations("Footer");
  const site = useTranslations("Site");

  return (
    <footer className="border-t border-subtle bg-surface-public">
      <div className="section-shell py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" />
            <p className="mt-4 max-w-xs text-sm text-fg-secondary">{t("tagline")}</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-4 inline-block text-sm text-fg-primary underline underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
          {SITE_SECTIONS.map((section) => (
            <div key={section.key}>
              <div className="kicker">{site(`sections.${section.key}`)}</div>
              <ul className="mt-4 space-y-2.5 text-sm text-fg-secondary">
                {section.children.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-fg-primary">
                      {site(`links.${link.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-subtle pt-6 text-xs text-fg-tertiary sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Solon</div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {siblings.map((p) => (
              <a
                key={p.key}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-fg-primary"
              >
                {p.name} — {p.role}
              </a>
            ))}
            <a
              href={SOLON_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-fg-primary"
            >
              {t("sourceCode")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
