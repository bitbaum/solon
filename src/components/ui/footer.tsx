import Link from "next/link";
import { ECOSYSTEM_PILLARS, SOLON_GITHUB_URL } from "@/lib/config/ecosystem";
import { FOOTER_SECTIONS, footerLinkLabel } from "@/lib/site-config";

// Only routes that actually exist belong here — a footer link to a 404 is a lie.
// That is now structural rather than a promise: every destination below comes
// from NAV_ITEMS, so a page removed from the nav cannot survive in the footer.
export default function Footer() {
  const siblings = ECOSYSTEM_PILLARS.filter((p) => p.key !== "solon");

  return (
    <footer className="border-t border-subtle bg-surface-public">
      <div className="section-shell py-14">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="text-xs font-medium uppercase tracking-caps text-fg-tertiary">
                {section.title}
              </div>
              <ul className="mt-4 space-y-2.5 text-sm text-fg-secondary">
                {section.links.map((link) => (
                  <li key={`${section.title}:${link.href}`}>
                    <Link href={link.href} className="transition-colors hover:text-fg-primary">
                      {footerLinkLabel(link)}
                    </Link>
                  </li>
                ))}
                {section.title === "Ecosystem" &&
                  siblings.map((p) => (
                    <li key={p.key}>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-fg-primary"
                      >
                        {p.name} — {p.role}
                      </a>
                    </li>
                  ))}
                {section.title === "Resources" && (
                  <li>
                    <a
                      href={SOLON_GITHUB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-fg-primary"
                    >
                      Source Code
                    </a>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-subtle pt-6 sm:flex-row">
          <div className="text-xs text-fg-tertiary">
            © {new Date().getFullYear()} Solon
          </div>
          <div className="text-xs text-fg-tertiary">
            The governance pillar of the OrangeCat stack.
          </div>
        </div>
      </div>
    </footer>
  );
}
